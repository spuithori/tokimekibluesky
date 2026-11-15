import type { XrpcClient } from '$lib/xrpc-client';
import { summarizeRecord } from './summary';
import { toActor, toPost, type Resolved, type ResolvedActor } from './resolver.svelte';
import { asBlobRef, parseAtUri, type BlobRef } from './values';

export type Preview =
    | { kind: 'embed'; view: Record<string, any>; reference: boolean }
    | { kind: 'actor'; actor: ResolvedActor; reference: boolean };

export interface RecordCard {
    heading?: string;
    text?: string;
    link?: string;
    images: BlobRef[];
}

const POST = 'app.bsky.feed.post';
const LIST = 'app.bsky.graph.list';
const GENERATOR = 'app.bsky.feed.generator';
const STARTER_PACK = 'app.bsky.graph.starterpack';
const PROFILE = 'app.bsky.actor.profile';
const VIEWABLE = new Set([POST, LIST, GENERATOR, STARTER_PACK]);
const HEADING_KEYS = ['title', 'name', 'displayName', 'question', 'subject'];
const TEXT_KEYS = ['description', 'text', 'content', 'body', 'summary', 'message', 'status'];
const LINK_KEYS = ['url', 'link', 'href', 'website', 'site', 'uri'];

export function postEmbedView(view: Record<string, any>): Record<string, any> {
    return {
        $type: 'app.bsky.embed.record#viewRecord',
        uri: view.uri,
        cid: view.cid,
        author: view.author,
        value: view.record,
        embeds: view.embed ? [view.embed] : [],
        labels: view.labels ?? [],
        indexedAt: view.indexedAt,
    };
}

export function previewTarget(uri: string, collection: string, value: unknown): { ref: string; reference: boolean } | undefined {
    if (VIEWABLE.has(collection)) return { ref: uri, reference: false };
    const owner = parseAtUri(uri)?.repo;
    if (collection === PROFILE && owner) return { ref: owner, reference: false };
    const ref = summarizeRecord(value).ref;
    return ref ? { ref, reference: true } : undefined;
}

function text(value: unknown, limit: number): string | undefined {
    return typeof value === 'string' && value.trim() ? value.trim().slice(0, limit) : undefined;
}

function collectImages(value: unknown, depth: number, out: BlobRef[]): void {
    if (!value || typeof value !== 'object' || depth > 4 || out.length >= 4) return;
    const blob = asBlobRef(value);
    if (blob) {
        if (blob.mimeType.startsWith('image/')) out.push(blob);
        return;
    }
    for (const child of Array.isArray(value) ? value.slice(0, 8) : Object.values(value)) collectImages(child, depth + 1, out);
}

export function describeRecord(value: unknown): RecordCard | undefined {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
    const record = value as Record<string, unknown>;
    let heading: string | undefined;
    for (const key of HEADING_KEYS) {
        const candidate = text(record[key], 200);
        if (candidate && !candidate.startsWith('at://') && !candidate.startsWith('did:')) {
            heading = candidate;
            break;
        }
    }
    let body: string | undefined;
    for (const key of TEXT_KEYS) {
        body = text(record[key], 600);
        if (body) break;
    }
    let link: string | undefined;
    for (const key of LINK_KEYS) {
        const candidate = text(record[key], 2000);
        if (candidate && /^https:\/\/\S+$/.test(candidate)) {
            link = candidate;
            break;
        }
    }
    const images: BlobRef[] = [];
    collectImages(record, 0, images);
    if (!heading && !body && !images.length) return undefined;
    return { heading, text: body, link, images };
}

export async function loadPreview(
    xrpc: XrpcClient,
    target: { ref: string; reference: boolean },
    known: Resolved | undefined,
    signal: AbortSignal,
): Promise<Preview | undefined> {
    const { ref, reference } = target;
    if (known?.kind === 'post') return { kind: 'embed', view: postEmbedView(known.view), reference };
    if (known?.kind === 'actor' && (ref.startsWith('did:') || !parseAtUri(ref)?.collection)) return { kind: 'actor', actor: known, reference };

    const uri = parseAtUri(ref);
    const options = { signal };
    try {
        if (uri?.collection === POST) {
            const view = (await xrpc.get('app.bsky.feed.getPosts', { uris: [ref] }, options))?.posts?.[0];
            return view ? { kind: 'embed', view: postEmbedView(toPost(view).view), reference } : undefined;
        }
        if (uri?.collection === LIST) {
            const list = (await xrpc.get('app.bsky.graph.getList', { list: ref, limit: 1 }, options))?.list;
            return list ? { kind: 'embed', view: { ...list, $type: 'app.bsky.graph.defs#listView' }, reference } : undefined;
        }
        if (uri?.collection === GENERATOR) {
            const view = (await xrpc.get('app.bsky.feed.getFeedGenerator', { feed: ref }, options))?.view;
            return view ? { kind: 'embed', view: { ...view, $type: 'app.bsky.feed.defs#generatorView' }, reference } : undefined;
        }
        if (uri?.collection === STARTER_PACK) {
            const pack = (await xrpc.get('app.bsky.graph.getStarterPack', { starterPack: ref }, options))?.starterPack;
            return pack ? { kind: 'embed', view: { ...pack, $type: 'app.bsky.graph.defs#starterPackViewBasic' }, reference } : undefined;
        }
        const actor = ref.startsWith('did:') ? ref : uri?.repo;
        if (!actor) return undefined;
        const profile = await xrpc.get('app.bsky.actor.getProfile', { actor }, options);
        return profile?.did ? { kind: 'actor', actor: toActor(profile), reference } : undefined;
    } catch {
        return undefined;
    }
}
