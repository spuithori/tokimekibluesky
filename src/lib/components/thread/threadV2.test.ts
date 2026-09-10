import { describe, it, expect } from 'vitest';
import { flattenThreadV2, spliceThreadReplies, subtreeEnds } from './threadV2';
import type { ThreadItemV2 } from '$lib/types/atproto';

export function post(id: string, depth: number, extra: Record<string, unknown> = {}): ThreadItemV2 {
    return {
        uri: `at://did:plc:a/app.bsky.feed.post/${id}`,
        depth,
        value: {
            $type: 'app.bsky.unspecced.defs#threadItemPost',
            post: { uri: `at://did:plc:a/app.bsky.feed.post/${id}`, cid: id, author: { did: (extra.did as string) ?? 'did:plc:a', handle: 'a.test' }, record: {}, indexedAt: '' },
            moreParents: false,
            moreReplies: 0,
            opThread: false,
            hiddenByThreadgate: false,
            mutedByViewer: false,
            ...extra,
        },
    };
}

const ids = (items: { uri: string }[]) => items.map(i => i.uri.split('/').pop());

describe('flattenThreadV2', () => {
    it('normalises every union member and keeps API order', () => {
        const items = flattenThreadV2([
            post('p', -1),
            post('root', 0, { opThread: true, opThreadPostIndex: 1, opThreadPostCount: 2, moreReplies: 3 }),
            { uri: 'at://did:plc:a/app.bsky.feed.post/gone', depth: 1, value: { $type: 'app.bsky.unspecced.defs#threadItemNotFound' } },
            { uri: 'at://did:plc:a/app.bsky.feed.post/blk', depth: 1, value: { $type: 'app.bsky.unspecced.defs#threadItemBlocked', author: {} } },
            { uri: 'at://did:plc:a/app.bsky.feed.post/auth', depth: 1, value: { $type: 'app.bsky.unspecced.defs#threadItemNoUnauthenticated' } },
            { uri: 'at://did:plc:a/app.bsky.feed.post/untyped', depth: 1, value: { post: { uri: 'x', cid: 'x', author: { did: 'd', handle: 'h' }, record: {}, indexedAt: '' } } },
        ]);

        expect(ids(items)).toEqual(['p', 'root', 'gone', 'blk', 'auth', 'untyped']);
        expect(items[1]).toMatchObject({ depth: 0, opThread: true, opThreadPostIndex: 1, opThreadPostCount: 2, moreReplies: 3 });
        expect(items[2].notFound).toBe(true);
        expect(items[3].blocked).toBe(true);
        expect(items[4].noUnauthenticated).toBe(true);
        expect(items[5].post).toBeDefined();
    });

    it('applies depthOffset and skipAnchor for sub-fetches', () => {
        const items = flattenThreadV2([post('p', 0), post('x', 1), post('y', 2)], { depthOffset: 3, skipAnchor: true });
        expect(items.map(i => [i.uri.split('/').pop(), i.depth])).toEqual([['x', 4], ['y', 5]]);
    });
});

describe('subtreeEnds', () => {
    it('returns the inclusive last index of every subtree', () => {
        const items = flattenThreadV2([post('r', 0), post('a', 1), post('aa', 2), post('ab', 2), post('b', 1)]);
        expect([...subtreeEnds(items)]).toEqual([4, 3, 2, 3, 4]);
    });
});

describe('spliceThreadReplies', () => {
    const base = () => flattenThreadV2([post('root', 0), post('p1', 1, { moreReplies: 3 }), post('p1c1', 2), post('p1c1x', 3), post('p2', 1)]);

    it('inserts only unseen replies after the subtree end and clears moreReplies on the parent', () => {
        const feed = base();
        const replies = flattenThreadV2([post('p1', 0), post('p1c1', 1), post('p1c1x', 2), post('p1c1zz', 3), post('p1c3', 1), post('p1c3a', 2)], { depthOffset: 1, skipAnchor: true });

        const next = spliceThreadReplies(feed, feed[1].uri, replies);

        expect(next.map(i => [i.uri.split('/').pop(), i.depth])).toEqual([
            ['root', 0], ['p1', 1], ['p1c1', 2], ['p1c1x', 3], ['p1c3', 2], ['p1c3a', 3], ['p2', 1],
        ]);
        expect(next[1].moreReplies).toBe(0);
        expect(feed.length).toBe(5);
    });

    it('leaves the feed alone when the parent is unknown and only clears the flag when nothing is new', () => {
        const feed = base();
        expect(spliceThreadReplies(feed, 'at://nope', [])).toBe(feed);
        const next = spliceThreadReplies(feed, feed[1].uri, flattenThreadV2([post('p1', 0), post('p1c1', 1)], { depthOffset: 1, skipAnchor: true }));
        expect(next.length).toBe(5);
        expect(next[1].moreReplies).toBe(0);
    });
});
