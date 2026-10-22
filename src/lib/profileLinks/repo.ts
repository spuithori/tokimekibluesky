import type {Agent} from '$lib/agent';
import type {BlobRef} from '$lib/types/atproto';
import {blobToDataUrl} from '$lib/imageCompressor/compressor';
import {
    PROFILE_LINK_COLLECTION,
    blobCidOf,
    linksFromRecords,
    rkeyOf,
    suggestTitle,
    type ProfileLink,
    type StrongRef,
} from './rules';

const FETCH_TIMEOUT = 8e3;
const SAFELINK_TIMEOUT = 5e3;

export type OwnProfileLinks = {
    refs: StrongRef[] | undefined;
    links: ProfileLink[];
};

function isRecordNotFound(e: any): boolean {
    return e?.error === 'RecordNotFound';
}

export async function loadOwnProfileLinks(agent: Agent): Promise<OwnProfileLinks> {
    const repo = agent.did();
    const [profile, page] = await Promise.all([
        agent.xrpc.get('com.atproto.repo.getRecord', { repo, collection: 'app.bsky.actor.profile', rkey: 'self' })
            .catch(e => {
                if (isRecordNotFound(e)) return undefined;
                throw e;
            }),
        agent.xrpc.get('com.atproto.repo.listRecords', { repo, collection: PROFILE_LINK_COLLECTION, limit: 100 }),
    ]);
    const refs = Array.isArray(profile?.value?.links) ? profile.value.links as StrongRef[] : undefined;
    if (!refs?.length) {
        return { refs, links: [] };
    }

    const records = [...page.records];
    if (page.cursor) {
        const listed = new Set(records.map(record => record.uri));
        const missing = await Promise.all(refs
            .filter(ref => !listed.has(ref.uri))
            .map(ref => agent.xrpc.get('com.atproto.repo.getRecord', { repo, collection: PROFILE_LINK_COLLECTION, rkey: rkeyOf(ref.uri) })
                .catch(e => {
                    if (isRecordNotFound(e)) return undefined;
                    throw e;
                })));
        for (const record of missing) {
            if (record) records.push(record);
        }
    }
    return { refs, links: linksFromRecords(refs, records) };
}

function sameIcon(a: BlobRef | undefined, b: BlobRef | undefined): boolean {
    return blobCidOf(a) === blobCidOf(b);
}

export function sameProfileLinks(a: ProfileLink[], b: ProfileLink[]): boolean {
    return a.length === b.length && a.every((link, i) =>
        link.url === b[i].url
        && link.title === b[i].title
        && link.uri === b[i].uri
        && sameIcon(link.icon, b[i].icon));
}

type ApplyWritesResult = { uri?: string; cid?: string };

export async function writeProfileLinks(agent: Agent, links: ProfileLink[], existing: ProfileLink[]): Promise<{ refs: StrongRef[]; deleteRemoved: () => Promise<void>; deleteCreated: () => Promise<void> }> {
    const repo = agent.did();
    const existingByUri = new Map(existing.flatMap(link => link.uri ? [[link.uri, link] as const] : []));
    const createdAt = new Date().toISOString();
    const refs: (StrongRef | undefined)[] = [];
    const writes: Record<string, unknown>[] = [];
    const writeIndex: number[] = [];

    links.forEach((link, i) => {
        const before = link.uri ? existingByUri.get(link.uri) : undefined;
        if (before?.uri && before.cid && before.url === link.url && before.title === link.title && sameIcon(before.icon, link.icon)) {
            refs.push({ uri: before.uri, cid: before.cid });
            return;
        }
        refs.push(undefined);
        const value: Record<string, unknown> = { $type: PROFILE_LINK_COLLECTION, url: link.url, createdAt };
        if (link.title) value.title = link.title;
        if (link.icon) value.icon = link.icon;
        writes.push(before?.uri
            ? { $type: 'com.atproto.repo.applyWrites#update', collection: PROFILE_LINK_COLLECTION, rkey: rkeyOf(before.uri), value }
            : { $type: 'com.atproto.repo.applyWrites#create', collection: PROFILE_LINK_COLLECTION, value });
        writeIndex.push(i);
    });

    if (writes.length) {
        const res = await agent.xrpc.post('com.atproto.repo.applyWrites', { repo, writes });
        const results = (res as { results?: ApplyWritesResult[] }).results ?? [];
        writeIndex.forEach((linkIndex, i) => {
            const result = results[i];
            if (!result?.uri || !result.cid) {
                throw new Error('applyWrites returned no ref for a profile link');
            }
            refs[linkIndex] = { uri: result.uri, cid: result.cid };
        });
    }

    const finalRefs = refs as StrongRef[];
    const kept = new Set(finalRefs.map(ref => ref.uri));
    const removed = existing.flatMap(link => link.uri && !kept.has(link.uri) ? [link.uri] : []);
    const created = finalRefs.flatMap(ref => existingByUri.has(ref.uri) ? [] : [ref.uri]);

    const deleteRecords = async (uris: string[]) => {
        if (!uris.length) return;
        try {
            await agent.xrpc.post('com.atproto.repo.applyWrites', {
                repo,
                writes: uris.map(uri => ({ $type: 'com.atproto.repo.applyWrites#delete', collection: PROFILE_LINK_COLLECTION, rkey: rkeyOf(uri) })),
            });
        } catch (e) {
            console.error(e);
        }
    };

    return {
        refs: finalRefs,
        deleteRemoved: () => deleteRecords(removed),
        deleteCreated: () => deleteRecords(created),
    };
}

async function fetchWithTimeout(url: string, timeout: number, init?: RequestInit): Promise<Response | undefined> {
    try {
        return await fetch(url, { ...init, signal: AbortSignal.timeout(timeout) });
    } catch {
        return undefined;
    }
}

async function uploadLinkIcon(agent: Agent, url: string): Promise<{ icon: BlobRef; iconUrl: string } | undefined> {
    const res = await fetchWithTimeout(`https://cardyb.bsky.app/v1/favicon?url=${encodeURIComponent(url)}&fresh=true`, FETCH_TIMEOUT, { cache: 'no-store' });
    if (!res?.ok || res.headers.get('content-type') !== 'image/png') return undefined;
    try {
        const image = await res.blob();
        const [uploaded, iconUrl] = await Promise.all([
            agent.xrpc.post('com.atproto.repo.uploadBlob', image, { encoding: 'image/png' }),
            blobToDataUrl(image),
        ]);
        return { icon: uploaded.blob, iconUrl };
    } catch (e) {
        console.error(e);
        return undefined;
    }
}

async function fetchSuggestedTitle(url: string): Promise<string> {
    const res = await fetchWithTimeout(`https://cardyb.bsky.app/v1/extract?url=${encodeURIComponent(url)}`, FETCH_TIMEOUT);
    if (!res?.ok) return '';
    try {
        const meta = await res.json();
        if (meta?.error) return '';
        return suggestTitle(meta?.view?.external?.title || meta?.title);
    } catch {
        return '';
    }
}

async function isSafelinkBlocked(url: string): Promise<boolean> {
    const res = await fetchWithTimeout(`https://go.bsky.app/safelink/check?u=${encodeURIComponent(url)}`, SAFELINK_TIMEOUT);
    if (!res?.ok) return false;
    try {
        const { action } = await res.json();
        return action === 'block';
    } catch {
        return false;
    }
}

export async function resolveNewLink(agent: Agent, url: string, wantTitle: boolean): Promise<{ blocked: true } | { blocked: false; icon?: BlobRef; iconUrl?: string; title: string }> {
    const [blocked, icon, title] = await Promise.all([
        isSafelinkBlocked(url),
        uploadLinkIcon(agent, url),
        wantTitle ? fetchSuggestedTitle(url) : Promise.resolve(''),
    ]);
    if (blocked) return { blocked: true };
    return { blocked: false, icon: icon?.icon, iconUrl: icon?.iconUrl, title };
}
