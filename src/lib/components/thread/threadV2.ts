import type { PostView, ThreadItemV2, ThreadSort } from '$lib/types/atproto';

export const THREAD_SORTS: readonly ThreadSort[] = ['top', 'newest', 'oldest'];

export const DEFAULT_THREAD_SORT: ThreadSort = 'top';

export const THREAD_BELOW = 6;

export const THREAD_BRANCHING_FACTOR = 100;

const THREAD_ITEM_POST = 'app.bsky.unspecced.defs#threadItemPost';
const THREAD_ITEM_BLOCKED = 'app.bsky.unspecced.defs#threadItemBlocked';
const THREAD_ITEM_NOT_FOUND = 'app.bsky.unspecced.defs#threadItemNotFound';
const THREAD_ITEM_NO_UNAUTHENTICATED = 'app.bsky.unspecced.defs#threadItemNoUnauthenticated';

export interface ThreadFeedItem {
    uri: string;
    depth: number;
    post?: PostView;
    moreParents?: boolean;
    moreReplies?: number;
    opThread?: boolean;
    opThreadPostIndex?: number;
    opThreadPostCount?: number;
    hiddenByThreadgate?: boolean;
    mutedByViewer?: boolean;
    blocked?: boolean;
    notFound?: boolean;
    noUnauthenticated?: boolean;
}

export interface FlattenOptions {
    depthOffset?: number;
    skipAnchor?: boolean;
}

export function normalizeThreadSort(sort: unknown): ThreadSort {
    return THREAD_SORTS.includes(sort as ThreadSort) ? (sort as ThreadSort) : DEFAULT_THREAD_SORT;
}

export function flattenThreadV2(thread: ThreadItemV2[] | undefined, options?: FlattenOptions): ThreadFeedItem[] {
    if (!thread?.length) {
        return [];
    }

    const depthOffset = options?.depthOffset ?? 0;
    const skipAnchor = options?.skipAnchor === true;
    const items: ThreadFeedItem[] = new Array(thread.length);
    let length = 0;

    for (const item of thread) {
        const value = item?.value;

        if (!value || typeof item.depth !== 'number' || (skipAnchor && item.depth === 0)) {
            continue;
        }

        const depth = item.depth + depthOffset;

        switch (value.$type ?? (value.post ? THREAD_ITEM_POST : undefined)) {
            case THREAD_ITEM_POST:
                if (!value.post) {
                    continue;
                }
                items[length++] = {
                    uri: item.uri,
                    depth,
                    post: value.post,
                    moreParents: value.moreParents === true,
                    moreReplies: value.moreReplies ?? 0,
                    opThread: value.opThread === true,
                    opThreadPostIndex: value.opThreadPostIndex,
                    opThreadPostCount: value.opThreadPostCount,
                    hiddenByThreadgate: value.hiddenByThreadgate === true,
                    mutedByViewer: value.mutedByViewer === true,
                };
                break;
            case THREAD_ITEM_BLOCKED:
                items[length++] = { uri: item.uri, depth, blocked: true };
                break;
            case THREAD_ITEM_NOT_FOUND:
                items[length++] = { uri: item.uri, depth, notFound: true };
                break;
            case THREAD_ITEM_NO_UNAUTHENTICATED:
                items[length++] = { uri: item.uri, depth, noUnauthenticated: true };
                break;
        }
    }

    items.length = length;
    return items;
}

export function subtreeEnds(feed: readonly ThreadFeedItem[]): Int32Array {
    const n = feed.length;
    const end = new Int32Array(n);
    const open: number[] = [];

    for (let i = 0; i < n; i++) {
        const depth = feed[i].depth;
        while (open.length && feed[open[open.length - 1]].depth >= depth) {
            end[open.pop()!] = i - 1;
        }
        open.push(i);
    }
    while (open.length) {
        end[open.pop()!] = n - 1;
    }

    return end;
}

export function spliceThreadReplies(feed: ThreadFeedItem[], parentUri: string, replies: ThreadFeedItem[]): ThreadFeedItem[] {
    const parentIndex = feed.findIndex(item => item.uri === parentUri);

    if (parentIndex < 0) {
        return feed;
    }

    const known = new Set<string>();
    for (const item of feed) {
        known.add(item.uri);
    }

    const fresh: ThreadFeedItem[] = [];
    for (let i = 0; i < replies.length; i++) {
        const item = replies[i];
        if (known.has(item.uri)) {
            while (i + 1 < replies.length && replies[i + 1].depth > item.depth) {
                i++;
            }
            continue;
        }
        fresh.push(item);
    }

    const insertAt = subtreeEnds(feed)[parentIndex] + 1;
    const result = feed.slice(0, parentIndex);
    result.push({ ...feed[parentIndex], moreReplies: 0 });
    for (let i = parentIndex + 1; i < insertAt; i++) {
        result.push(feed[i]);
    }
    for (const item of fresh) {
        result.push(item);
    }
    for (let i = insertAt; i < feed.length; i++) {
        result.push(feed[i]);
    }
    return result;
}
