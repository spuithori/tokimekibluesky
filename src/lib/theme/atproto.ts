import { CID } from 'multiformats/cid';
import { resolveDidDocument, getPdsEndpoint, resolveHandle } from '$lib/oauth/resolver';
import { handleFromDidDocument, blobUrl } from '$lib/atmosphere/registry';
import { themesDb } from '$lib/db';
import {
    APPROVAL_COLLECTION,
    OFFICIAL_THEME_DID,
    THEME_COLLECTION,
    validateThemeRecord,
    type BlobRef,
    type ThemeRecord,
} from './format';
import type { InstalledTheme } from './installed';

export type ThemeFetchErrorCode = 'invalid-uri' | 'not-found' | 'invalid-record' | 'network' | 'blob-mismatch';

export class ThemeFetchError extends Error {
    constructor(public code: ThemeFetchErrorCode, message: string, public details: string[] = []) {
        super(message);
    }

    get messageKey(): string {
        return `theme_error_${this.code.replace('-', '_')}`;
    }
}

export interface RemoteTheme {
    uri: string;
    cid: string;
    did: string;
    rkey: string;
    handle: string | null;
    pds: string;
    record: ThemeRecord;
}

export interface ApprovedTheme {
    approvalUri: string;
    access: 'public' | 'code';
    codeHash?: string;
    createdAt: string;
    theme: RemoteTheme;
}

interface Repo {
    pds: string;
    handle: string | null;
}

const THEME_URI = /^at:\/\/([^/\s]+)\/([A-Za-z0-9.-]+)\/([A-Za-z0-9._:~-]+)$/;

export function parseThemeUri(input: string): { authority: string; rkey: string } | null {
    const trimmed = input.trim();
    let candidate = trimmed;
    if (/^https?:\/\//.test(trimmed)) {
        try {
            candidate = new URL(trimmed).searchParams.get('uri') ?? '';
        } catch {
            return null;
        }
    }
    const match = THEME_URI.exec(candidate);
    if (!match || match[2] !== THEME_COLLECTION) return null;
    return { authority: decodeURIComponent(match[1]), rkey: match[3] };
}

async function resolveRepo(did: string, signal?: AbortSignal): Promise<Repo> {
    try {
        const doc = await resolveDidDocument(did, signal);
        return { pds: getPdsEndpoint(doc).replace(/\/$/, ''), handle: handleFromDidDocument(doc as { alsoKnownAs?: unknown }) };
    } catch (e) {
        throw new ThemeFetchError('network', `could not resolve the PDS of ${did}`, [String(e)]);
    }
}

async function getRecord(repo: Repo, did: string, collection: string, rkey: string, cid: string | undefined, signal?: AbortSignal) {
    const params = new URLSearchParams({ repo: did, collection, rkey });
    if (cid) params.set('cid', cid);
    let res: Response;
    try {
        res = await fetch(`${repo.pds}/xrpc/com.atproto.repo.getRecord?${params}`, { signal });
    } catch (e) {
        throw new ThemeFetchError('network', 'could not fetch the theme', [String(e)]);
    }
    if (res.status === 400 || res.status === 404) throw new ThemeFetchError('not-found', 'theme not found');
    if (!res.ok) throw new ThemeFetchError('network', `could not fetch the theme (${res.status})`);
    return (await res.json()) as { uri: string; cid: string; value: unknown };
}

async function loadTheme(did: string, rkey: string, repo: Repo, cid: string | undefined, signal?: AbortSignal): Promise<RemoteTheme> {
    const json = await getRecord(repo, did, THEME_COLLECTION, rkey, cid, signal);
    if (cid && json.cid !== cid) throw new ThemeFetchError('not-found', 'the approved version is gone');
    const result = validateThemeRecord(json.value);
    if (!result.ok) throw new ThemeFetchError('invalid-record', 'invalid theme record', result.errors);
    return { uri: `at://${did}/${THEME_COLLECTION}/${rkey}`, cid: json.cid, did, rkey, handle: repo.handle, pds: repo.pds, record: result.record };
}

export async function fetchRemoteTheme(input: string, { cid, signal }: { cid?: string; signal?: AbortSignal } = {}): Promise<RemoteTheme> {
    const parsed = parseThemeUri(input);
    if (!parsed) throw new ThemeFetchError('invalid-uri', 'not a theme at-uri');
    let did = parsed.authority;
    if (!did.startsWith('did:')) {
        try {
            did = await resolveHandle(did);
        } catch (e) {
            throw new ThemeFetchError('network', `could not resolve ${parsed.authority}`, [String(e)]);
        }
    }
    return loadTheme(did, parsed.rkey, await resolveRepo(did, signal), cid, signal);
}

async function sha256(bytes: ArrayBuffer): Promise<Uint8Array> {
    return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

export async function sha256Hex(text: string): Promise<string> {
    const digest = await sha256(new TextEncoder().encode(text).buffer as ArrayBuffer);
    return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function verifyBlobBytes(bytes: ArrayBuffer, link: string): Promise<boolean> {
    let cid: CID;
    try {
        cid = CID.parse(link);
    } catch {
        return false;
    }
    if (cid.version !== 1 || cid.code !== 0x55 || cid.multihash.code !== 0x12) return false;
    const digest = await sha256(bytes);
    const expected = cid.multihash.digest;
    return digest.length === expected.length && digest.every((b, i) => b === expected[i]);
}

async function fetchBlob(theme: RemoteTheme, blob: BlobRef, signal?: AbortSignal): Promise<Blob> {
    let res: Response;
    try {
        res = await fetch(blobUrl(theme.pds, theme.did, blob.ref.$link), { signal });
    } catch (e) {
        throw new ThemeFetchError('network', 'could not fetch an image', [String(e)]);
    }
    if (!res.ok) throw new ThemeFetchError('network', `could not fetch an image (${res.status})`);
    const bytes = await res.arrayBuffer();
    if (!(await verifyBlobBytes(bytes, blob.ref.$link))) throw new ThemeFetchError('blob-mismatch', 'image bytes do not match the record');
    return new Blob([bytes], { type: blob.mimeType });
}

export function themeThumbnailUrl(theme: RemoteTheme): string | undefined {
    return theme.record.thumbnail ? blobUrl(theme.pds, theme.did, theme.record.thumbnail.ref.$link) : undefined;
}

export async function previewRemoteTheme(theme: RemoteTheme, signal?: AbortSignal): Promise<InstalledTheme> {
    const images: Record<string, Blob> = {};
    await Promise.all((theme.record.images ?? []).map(async (image) => {
        images[image.key] = await fetchBlob(theme, image.image, signal);
    }));
    const preview: InstalledTheme = { id: `preview:${theme.uri}`, uri: theme.uri, cid: theme.cid, did: theme.did, record: theme.record, installedAt: new Date().toISOString() };
    if (Object.keys(images).length) preview.images = images;
    return preview;
}

export interface ThemeAssets {
    images?: Record<string, Blob>;
    thumbnail?: Blob;
}

function reusableBlob(previous: InstalledTheme | undefined, link: string): Blob | undefined {
    if (!previous) return undefined;
    if (previous.record.thumbnail?.ref.$link === link && previous.thumbnail) return previous.thumbnail;
    const image = previous.record.images?.find((item) => item.image.ref.$link === link);
    return image ? previous.images?.[image.key] : undefined;
}

export async function downloadThemeAssets(theme: RemoteTheme, previous?: InstalledTheme, signal?: AbortSignal): Promise<ThemeAssets> {
    const load = (blob: BlobRef) => reusableBlob(previous, blob.ref.$link) ?? fetchBlob(theme, blob, signal);
    const images: Record<string, Blob> = {};
    await Promise.all((theme.record.images ?? []).map(async (image) => {
        images[image.key] = await load(image.image);
    }));
    const assets: ThemeAssets = {};
    if (Object.keys(images).length) assets.images = images;
    if (theme.record.thumbnail) assets.thumbnail = await load(theme.record.thumbnail);
    return assets;
}

export async function installRemoteTheme(
    theme: RemoteTheme,
    { signal, channel }: { signal?: AbortSignal; channel?: InstalledTheme['channel'] } = {},
): Promise<{ installed: InstalledTheme; replacedIds: string[] }> {
    const existing = await themesDb.themes.where('uri').equals(theme.uri).first();
    const assets = await downloadThemeAssets(theme, existing, signal);
    const installed: InstalledTheme = {
        id: theme.uri,
        uri: theme.uri,
        cid: theme.cid,
        did: theme.did,
        handle: theme.handle ?? undefined,
        record: JSON.parse(JSON.stringify(theme.record)) as ThemeRecord,
        installedAt: new Date().toISOString(),
        ...assets,
    };
    if (channel === 'latest') installed.channel = 'latest';
    const replacedIds: string[] = [];
    await themesDb.transaction('rw', themesDb.themes, async () => {
        const sameUri = await themesDb.themes.where('uri').equals(theme.uri).toArray();
        for (const row of sameUri) {
            if (row.id !== installed.id) {
                replacedIds.push(row.id);
                await themesDb.themes.delete(row.id);
            }
        }
        await themesDb.themes.put(installed);
    });
    return { installed, replacedIds };
}

export async function listApprovedThemes(signal?: AbortSignal): Promise<ApprovedTheme[]> {
    const official = await resolveRepo(OFFICIAL_THEME_DID, signal);
    const approvals: Array<{ uri: string; value: Record<string, unknown> }> = [];
    let cursor: string | undefined;
    do {
        const params = new URLSearchParams({ repo: OFFICIAL_THEME_DID, collection: APPROVAL_COLLECTION, limit: '100' });
        if (cursor) params.set('cursor', cursor);
        const res = await fetch(`${official.pds}/xrpc/com.atproto.repo.listRecords?${params}`, { signal });
        if (!res.ok) throw new ThemeFetchError('network', `could not list the store (${res.status})`);
        const json = (await res.json()) as { cursor?: string; records?: Array<{ uri: string; value: Record<string, unknown> }> };
        approvals.push(...(json.records ?? []));
        cursor = json.records?.length ? json.cursor : undefined;
    } while (cursor);

    const repos = new Map<string, Promise<Repo>>([[OFFICIAL_THEME_DID, Promise.resolve(official)]]);
    const results = await Promise.allSettled(approvals.map(async ({ uri, value }) => {
        const subject = value.subject as { uri?: unknown; cid?: unknown } | undefined;
        const parsed = typeof subject?.uri === 'string' ? THEME_URI.exec(subject.uri) : null;
        if (!parsed || parsed[2] !== THEME_COLLECTION || !parsed[1].startsWith('did:') || typeof subject?.cid !== 'string') return null;
        const did = parsed[1];
        if (!repos.has(did)) repos.set(did, resolveRepo(did, signal));
        const theme = await loadTheme(did, parsed[3], await repos.get(did)!, subject.cid, signal);
        const access = value.access === 'code' ? 'code' : 'public';
        const approved: ApprovedTheme = {
            approvalUri: uri,
            access,
            createdAt: typeof value.createdAt === 'string' ? value.createdAt : '',
            theme,
        };
        if (access === 'code' && typeof value.codeHash === 'string') approved.codeHash = value.codeHash.toLowerCase();
        return approved;
    }));
    return results
        .flatMap((r) => (r.status === 'fulfilled' && r.value ? [r.value] : []))
        .sort((a, b) => b.theme.record.createdAt.localeCompare(a.theme.record.createdAt));
}
