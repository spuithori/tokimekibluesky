import { SvelteMap } from 'svelte/reactivity';
import type { XrpcClient } from '$lib/xrpc-client';
import { parseAtUri } from './values';

export interface ResolvedActor {
    kind: 'actor';
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
    description?: string;
}

export interface ResolvedPost {
    kind: 'post';
    uri: string;
    text: string;
    author: ResolvedActor;
    view: Record<string, any>;
}

export type Resolved = ResolvedActor | ResolvedPost | { kind: 'missing' };

const POST = 'app.bsky.feed.post';
const BATCH = 25;
const MISSING: Resolved = { kind: 'missing' };

export function refKey(ref: string): string | undefined {
    if (ref.startsWith('did:')) return ref;
    const uri = parseAtUri(ref);
    if (!uri) return undefined;
    if (uri.collection === POST && uri.rkey && uri.repo.startsWith('did:')) return `at://${uri.repo}/${POST}/${uri.rkey}`;
    return uri.repo;
}

export function toActor(profile: Record<string, any>): ResolvedActor {
    return {
        kind: 'actor',
        did: profile.did,
        handle: profile.handle,
        displayName: profile.displayName || undefined,
        avatar: profile.avatar || undefined,
        description: profile.description || undefined,
    };
}

export function toPost(view: Record<string, any>): ResolvedPost {
    return {
        kind: 'post',
        uri: view.uri,
        text: typeof view.record?.text === 'string' ? view.record.text.replace(/\s+/g, ' ').trim() : '',
        author: toActor(view.author),
        view,
    };
}

function chunks<T>(items: T[]): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += BATCH) out.push(items.slice(i, i + BATCH));
    return out;
}

export class RefResolver {
    readonly entries = new SvelteMap<string, Resolved>();
    #requested = new Set<string>();
    #queue: string[] = [];
    #scheduled = false;

    constructor(private xrpc: XrpcClient, private signal: AbortSignal) {}

    get(ref: string): Resolved | undefined {
        const key = refKey(ref);
        return key ? this.entries.get(key) : undefined;
    }

    request(ref: string): void {
        const key = refKey(ref);
        if (!key || this.#requested.has(key)) return;
        this.#requested.add(key);
        this.#queue.push(key);
        if (!this.#scheduled) {
            this.#scheduled = true;
            queueMicrotask(() => void this.#flush());
        }
    }

    async #flush(): Promise<void> {
        this.#scheduled = false;
        const queue = this.#queue;
        this.#queue = [];
        const posts = queue.filter((key) => key.startsWith('at://'));
        const actors = queue.filter((key) => !key.startsWith('at://'));
        await Promise.all([
            ...chunks(actors).map((batch) => this.#loadActors(batch)),
            ...chunks(posts).map((batch) => this.#loadPosts(batch)),
        ]);
    }

    async #loadActors(actors: string[]): Promise<void> {
        let profiles: Array<Record<string, any>> = [];
        try {
            profiles = (await this.xrpc.get('app.bsky.actor.getProfiles', { actors }, { signal: this.signal }))?.profiles ?? [];
        } catch {
            if (this.signal.aborted) return;
        }
        const found = new Map<string, ResolvedActor>();
        for (const profile of profiles) {
            const actor = toActor(profile);
            found.set(actor.did, actor);
            found.set(actor.handle, actor);
        }
        for (const key of actors) this.entries.set(key, found.get(key) ?? MISSING);
    }

    async #loadPosts(uris: string[]): Promise<void> {
        let posts: Array<Record<string, any>> = [];
        try {
            posts = (await this.xrpc.get('app.bsky.feed.getPosts', { uris }, { signal: this.signal }))?.posts ?? [];
        } catch {
            if (this.signal.aborted) return;
        }
        const found = new Map(posts.map((view) => [view.uri as string, toPost(view)]));
        for (const key of uris) this.entries.set(key, found.get(key) ?? MISSING);
    }
}
