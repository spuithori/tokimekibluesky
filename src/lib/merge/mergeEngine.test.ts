import { describe, it, expect } from 'vitest';
import {
    createPool,
    computeFrontier,
    decodeMergeCursor,
    dedupKeyOf,
    emitBatch,
    emittableCount,
    encodeMergeCursor,
    fingerprintSources,
    integratePage,
    markFetchFailed,
    planRefill,
    sortKeyOf,
    type MergeCursorState,
    type MergeSource,
} from './mergeEngine';
import { getMergedTimeline, seedMergePool } from './mergeFetch';

const BASE = Date.parse('2026-01-01T00:00:00.000Z');

function iso(min: number): string {
    return new Date(BASE + min * 60_000).toISOString();
}

function post(uri: string, min: number) {
    return { post: { uri: `at://did:plc:test/app.bsky.feed.post/${uri}`, indexedAt: iso(min), author: { did: 'did:plc:test' } } };
}

function repost(uri: string, postMin: number, reasonMin: number) {
    return {
        post: { uri: `at://did:plc:test/app.bsky.feed.post/${uri}`, indexedAt: iso(postMin), author: { did: 'did:plc:test' } },
        reason: { $type: 'app.bsky.feed.defs#reasonRepost', by: { did: 'did:plc:other' }, indexedAt: iso(reasonMin) },
    };
}

function pin(uri: string, min: number) {
    return {
        post: { uri: `at://did:plc:test/app.bsky.feed.post/${uri}`, indexedAt: iso(min), author: { did: 'did:plc:test' } },
        reason: { $type: 'app.bsky.feed.defs#reasonPin' },
    };
}

function src(id: string): MergeSource {
    return { id, type: 'custom', algorithm: `at://feed/${id}`, name: id };
}

function uris(feed: any[]): string[] {
    return feed.map(item => item.post.uri.split('/').pop());
}

describe('cursor encode/decode', () => {
    const sources = [src('a'), src('b')];

    it('roundtrips a full state', () => {
        const state: MergeCursorState = {
            v: 1,
            f: fingerprintSources(sources),
            q: 3,
            w: { t: BASE, k: 'at://x' },
            s: [{ c: 'cur-a', n: 0, g: 0 }, { c: null, n: 2, g: 1 }],
        };
        expect(decodeMergeCursor(encodeMergeCursor(state), sources)).toEqual(state);
    });

    it('rejects a fingerprint mismatch', () => {
        const state: MergeCursorState = { v: 1, f: fingerprintSources(sources), q: 0, w: null, s: [{ c: '', n: 0, g: 0 }, { c: '', n: 0, g: 0 }] };
        expect(decodeMergeCursor(encodeMergeCursor(state), [src('a'), src('c')])).toBeNull();
    });

    it('rejects garbage, plain cursors, and length mismatches', () => {
        expect(decodeMergeCursor('not json', sources)).toBeNull();
        expect(decodeMergeCursor('', sources)).toBeNull();
        expect(decodeMergeCursor(undefined, sources)).toBeNull();
        expect(decodeMergeCursor(JSON.stringify({ v: 1, f: fingerprintSources(sources), q: 0, w: null, s: [{ c: '', n: 0, g: 0 }] }), sources)).toBeNull();
    });
});

describe('merge invariant', () => {
    it('emits three interleaved sources in global desc order with attribution', () => {
        const sources = [src('a'), src('b'), src('c')];
        const pool = createPool(sources, null);
        integratePage(pool, 0, '', { feed: [post('a1', 100), post('a2', 70)], cursor: 'a-next' });
        integratePage(pool, 1, '', { feed: [post('b1', 90), post('b2', 80)], cursor: 'b-next' });
        integratePage(pool, 2, '', { feed: [post('c1', 95), post('c2', 75)], cursor: 'c-next' });

        const { feed, cursor } = emitBatch(pool, sources, 4);
        expect(uris(feed)).toEqual(['a1', 'c1', 'b1', 'b2']);
        expect(feed.map(f => f.__sourceId)).toEqual(['a', 'c', 'b', 'b']);
        expect(cursor).toBeTruthy();
        const keys = feed.map(sortKeyOf);
        expect([...keys].sort((x, y) => y - x)).toEqual(keys);
    });

    it('holds items older than the slowest active floor', () => {
        const sources = [src('a'), src('b')];
        const pool = createPool(sources, null);
        integratePage(pool, 0, '', { feed: [post('a1', 100)], cursor: 'a-next' });
        integratePage(pool, 1, '', { feed: [post('b1', 90), post('b2', 50)], cursor: 'b-next' });

        const { feed } = emitBatch(pool, sources, 10);
        expect(uris(feed)).toEqual(['a1']);
        expect(emittableCount(pool)).toBe(0);
    });

    it('releases the floor when a source is exhausted and drains its remainder', () => {
        const sources = [src('a'), src('b')];
        const pool = createPool(sources, null);
        integratePage(pool, 0, '', { feed: [post('a1', 100)] });
        integratePage(pool, 1, '', { feed: [post('b1', 90), post('b2', 50)], cursor: 'b-next' });

        const { feed } = emitBatch(pool, sources, 10);
        expect(uris(feed)).toEqual(['a1', 'b1', 'b2']);
    });

    it('returns undefined cursor only when everything is exhausted and drained', () => {
        const sources = [src('a')];
        const pool = createPool(sources, null);
        integratePage(pool, 0, '', { feed: [post('a1', 100), post('a2', 90)] });

        const partial = emitBatch(pool, sources, 1);
        expect(partial.cursor).toBeTruthy();
        expect(partial.cursor).not.toBe('');

        const rest = emitBatch(pool, sources, 10);
        expect(uris(rest.feed)).toEqual(['a2']);
        expect(rest.cursor).toBeUndefined();
    });

    it('behaves like the plain feed for a single source', () => {
        const sources = [src('a')];
        const pool = createPool(sources, null);
        const items = [post('a1', 100), post('a2', 90), post('a3', 80)];
        integratePage(pool, 0, '', { feed: items, cursor: 'a-next' });
        const { feed } = emitBatch(pool, sources, 10);
        expect(uris(feed)).toEqual(['a1', 'a2', 'a3']);
    });
});

describe('dedup', () => {
    it('keeps the first arrival of a duplicate uri with its attribution', () => {
        const sources = [src('a'), src('b')];
        const pool = createPool(sources, null);
        integratePage(pool, 0, '', { feed: [post('x', 100), post('a2', 85)], cursor: 'a-next' });
        integratePage(pool, 1, '', { feed: [post('x', 100), post('b2', 90)], cursor: 'b-next' });

        const { feed } = emitBatch(pool, sources, 10);
        expect(uris(feed)).toEqual(['x', 'b2']);
        expect(feed[0].__sourceId).toBe('a');
    });

    it('keeps distinct reposts of the same post', () => {
        const sources = [src('a'), src('b')];
        const pool = createPool(sources, null);
        integratePage(pool, 0, '', { feed: [repost('x', 10, 100)] });
        integratePage(pool, 1, '', { feed: [repost('x', 10, 95)] });

        const { feed } = emitBatch(pool, sources, 10);
        expect(feed).toHaveLength(2);
        expect(dedupKeyOf(feed[0])).not.toBe(dedupKeyOf(feed[1]));
    });
});

describe('fetch failure resilience', () => {
    it('clamps the frontier at a once-failed source floor', () => {
        const sources = [src('a'), src('b')];
        const pool = createPool(sources, null);
        integratePage(pool, 0, '', { feed: [post('a1', 100), post('a2', 60)], cursor: 'a-next' });
        integratePage(pool, 1, '', { feed: [post('b1', 90)], cursor: 'b-next' });
        emitBatch(pool, sources, 10);

        markFetchFailed(pool, 1);
        expect(computeFrontier(pool)).toBe(sortKeyOf(post('b1', 90)));
    });

    it('unclamps after two consecutive failures', () => {
        const sources = [src('a'), src('b')];
        const pool = createPool(sources, null);
        integratePage(pool, 0, '', { feed: [post('a1', 100), post('a2', 60)], cursor: 'a-next' });
        integratePage(pool, 1, '', { feed: [post('b1', 90)], cursor: 'b-next' });

        markFetchFailed(pool, 1);
        markFetchFailed(pool, 1);
        const { feed } = emitBatch(pool, sources, 10);
        expect(uris(feed)).toEqual(['a1', 'b1', 'a2']);
    });

    it('keeps retrying a failed source in refill plans', () => {
        const sources = [src('a'), src('b')];
        const pool = createPool(sources, null);
        integratePage(pool, 0, '', { feed: [post('a1', 100)], cursor: 'a-next' });
        markFetchFailed(pool, 1);
        markFetchFailed(pool, 1);

        const plan = planRefill(pool);
        expect(plan.some(p => p.srcIdx === 1 && p.cursor === '')).toBe(true);
    });

    it('drops caught-up items newer than the watermark after failure recovery', () => {
        const sources = [src('a'), src('b')];
        const pool = createPool(sources, null);
        integratePage(pool, 0, '', { feed: [post('a1', 100), post('a2', 40)] });
        integratePage(pool, 1, '', { feed: [post('b1', 90)], cursor: 'b-next' });
        markFetchFailed(pool, 1);
        markFetchFailed(pool, 1);
        emitBatch(pool, sources, 10);

        integratePage(pool, 1, 'b-next', { feed: [post('b2', 80), post('b3', 30)], cursor: 'b-next2' });
        const { feed } = emitBatch(pool, sources, 10);
        expect(uris(feed)).toEqual(['b3']);
    });
});

describe('loop guard and exhaustion', () => {
    it('treats an identical response cursor as exhaustion', () => {
        const sources = [src('a')];
        const pool = createPool(sources, null);
        integratePage(pool, 0, 'same', { feed: [post('a1', 100)], cursor: 'same' });
        expect(pool.sources[0].exhausted).toBe(true);
        expect(planRefill(pool)).toEqual([]);
    });

    it('does not refill a stocked source', () => {
        const sources = [src('a'), src('b')];
        const pool = createPool(sources, null);
        integratePage(pool, 0, '', { feed: [post('a1', 100), post('a2', 90)], cursor: 'a-next' });
        const plan = planRefill(pool);
        expect(plan).toEqual([{ srcIdx: 1, cursor: '' }]);
    });

    it('still refills after a pin-only page instead of deadlocking', () => {
        const sources = [src('a')];
        const pool = createPool(sources, null);
        integratePage(pool, 0, '', { feed: [pin('p1', 5)], cursor: 'a-next' });
        const plan = planRefill(pool);
        expect(plan).toEqual([{ srcIdx: 0, cursor: 'a-next' }]);
    });
});

describe('non-chronological degradation', () => {
    it('flips degraded on an unsorted page but keeps its items sorted in the pool', () => {
        const sources = [src('a'), src('b')];
        const pool = createPool(sources, null);
        integratePage(pool, 0, '', { feed: [post('a1', 50), post('a2', 90)], cursor: 'a-next' });
        expect(pool.sources[0].degraded).toBe(true);
        expect(pool.entries).toHaveLength(2);
    });

    it('interleaves degraded items chronologically without constraining the frontier', () => {
        const sources = [src('a'), src('b')];
        const pool = createPool(sources, null);
        integratePage(pool, 0, '', { feed: [post('a1', 10), post('a2', 95)], cursor: 'a-next' });
        integratePage(pool, 1, '', { feed: [post('b1', 90), post('b2', 80)], cursor: 'b-next' });

        const { feed } = emitBatch(pool, sources, 10);
        expect(uris(feed)).toEqual(['a2', 'b1', 'b2']);
        expect(emittableCount(pool)).toBe(0);
    });

    it('tolerates sub-minute jitter without degrading', () => {
        const sources = [src('a')];
        const pool = createPool(sources, null);
        integratePage(pool, 0, '', { feed: [post('a1', 100), post('a2', 100.5), post('a3', 99)], cursor: 'a-next' });
        expect(pool.sources[0].degraded).toBe(false);
    });

    it('does not degrade an author page led by a pin', () => {
        const sources = [src('a')];
        const pool = createPool(sources, null);
        integratePage(pool, 0, '', { feed: [pin('old', 5), post('a1', 100), post('a2', 90)], cursor: 'a-next' });
        expect(pool.sources[0].degraded).toBe(false);
    });

    it('detects inter-page regression while keeping items sorted', () => {
        const sources = [src('a')];
        const pool = createPool(sources, null);
        integratePage(pool, 0, '', { feed: [post('a1', 100), post('a2', 90)], cursor: 'a-next' });
        integratePage(pool, 0, 'a-next', { feed: [post('a3', 95)], cursor: 'a-next2' });
        expect(pool.sources[0].degraded).toBe(true);
        expect(pool.entries).toHaveLength(3);

        const { feed } = emitBatch(pool, sources, 10);
        expect(uris(feed)).toEqual(['a1', 'a3', 'a2']);
    });

    it('never emits a degraded catch-up item above the watermark (no fresh-below-stale)', () => {
        const sources = [src('a'), src('b')];
        const pool = createPool(sources, null);
        integratePage(pool, 1, '', { feed: [post('b1', 100), post('b2', 50)], cursor: 'b2c' });
        integratePage(pool, 0, '', { feed: [post('a1', 30), post('a2', 90)], cursor: 'a2c' });
        expect(pool.sources[0].degraded).toBe(true);

        const first = emitBatch(pool, sources, 10);
        expect(uris(first.feed)).toEqual(['b1', 'a2', 'b2']);

        integratePage(pool, 0, 'a2c', { feed: [post('a3', 120), post('a4', 10)], cursor: 'a4c' });
        integratePage(pool, 1, 'b2c', { feed: [] });

        const second = emitBatch(pool, sources, 10);
        expect(uris(second.feed)).toEqual(['a1', 'a4']);
        expect(uris(second.feed)).not.toContain('a3');

        const headPool = createPool(sources, null);
        integratePage(headPool, 0, '', { feed: [post('a3', 120), post('a1', 30)], cursor: 'a2c' });
        integratePage(headPool, 1, '', { feed: [post('b1', 100)], cursor: 'b2c' });
        const head = emitBatch(headPool, sources, 10);
        expect(uris(head.feed)).toContain('a3');
        expect(uris(head.feed)[0]).toBe('a3');
    });
});

describe('rebuild from cursor', () => {
    it('resumes after pool loss without gaps and without re-emitting the watermark item', () => {
        const sources = [src('a'), src('b')];
        const pageA = { feed: [post('a1', 100), post('a2', 80)] };
        const pageB = { feed: [post('b1', 90), post('b2', 70)] };

        const pool = createPool(sources, null);
        integratePage(pool, 0, '', pageA);
        integratePage(pool, 1, '', pageB);
        const first = emitBatch(pool, sources, 2);
        expect(uris(first.feed)).toEqual(['a1', 'b1']);

        const resume = decodeMergeCursor(first.cursor, sources);
        expect(resume).not.toBeNull();
        const rebuilt = createPool(sources, resume);
        const plan = planRefill(rebuilt);
        expect(plan.map(p => p.cursor)).toEqual(['', '']);

        integratePage(rebuilt, 0, '', pageA);
        integratePage(rebuilt, 1, '', pageB);
        const second = emitBatch(rebuilt, sources, 10);
        expect(uris(second.feed)).toEqual(['a2', 'b2']);
        expect(second.cursor).toBeUndefined();
    });

    it('keeps equal-timestamp ties that are not the watermark item', () => {
        const sources = [src('a')];
        const pool = createPool(sources, null);
        integratePage(pool, 0, '', { feed: [post('a1', 100)], cursor: 'a-next' });
        emitBatch(pool, sources, 1);

        integratePage(pool, 0, 'a-next', { feed: [post('tie', 100), post('a2', 90)], cursor: 'a-next2' });
        const { feed } = emitBatch(pool, sources, 10);
        expect(uris(feed)).toEqual(['tie', 'a2']);
    });

    it('rebuilds a degraded source via the watermark without duplicates or gaps', () => {
        const sources = [src('a')];
        const page = { feed: [post('a1', 10), post('a2', 95), post('a3', 40)], cursor: 'a-next' };
        const pool = createPool(sources, null);
        integratePage(pool, 0, '', page);
        const first = emitBatch(pool, sources, 2);
        expect(uris(first.feed)).toEqual(['a2', 'a3']);

        const resume = decodeMergeCursor(first.cursor, sources)!;
        expect(resume.s[0].g).toBe(1);

        const rebuilt = createPool(sources, resume);
        expect(rebuilt.sources[0].degraded).toBe(true);
        integratePage(rebuilt, 0, '', page);
        const second = emitBatch(rebuilt, sources, 10);
        expect(uris(second.feed)).toEqual(['a1']);
    });
});

describe('getMergedTimeline wrapper', () => {
    function fakeAgent(pages: Record<string, Record<string, any>>, failures: Set<string> = new Set()) {
        const calls: Array<{ feedId: string, cursor: string }> = [];
        return {
            calls,
            getTimelineByAlgo(opt: any) {
                const feedId = opt.algorithm.algorithm;
                const cursor = opt.cursor ?? '';
                calls.push({ feedId, cursor });
                if (failures.has(`${feedId}@${cursor}`)) {
                    return Promise.reject(new Error('fail'));
                }
                const page = pages[feedId]?.[cursor];
                return Promise.resolve(page ?? { feed: [], cursor: undefined });
            },
        };
    }

    it('merges a head fetch and emits at most limit items', async () => {
        const sources = [src('a'), src('b')];
        const agent = fakeAgent({
            'at://feed/a': { '': { feed: [post('a1', 100), post('a2', 80)], cursor: 'a-next' } },
            'at://feed/b': { '': { feed: [post('b1', 90), post('b2', 70)], cursor: 'b-next' } },
        });
        const algorithm = { type: 'merge', sources };

        const res = await getMergedTimeline(agent, { limit: 3, cursor: '', algorithm });
        expect(uris(res.feed)).toEqual(['a1', 'b1', 'a2']);
        expect(res.cursor).toBeTruthy();
    });

    it('throws only when every head source fails, and emits on partial failure', async () => {
        const sources = [src('a'), src('b')];
        const algorithm = { type: 'merge', sources };
        const pages = {
            'at://feed/a': { '': { feed: [post('a1', 100)], cursor: 'a-next' } },
            'at://feed/b': { '': { feed: [post('b1', 90)], cursor: 'b-next' } },
        };

        const allFail = fakeAgent(pages, new Set(['at://feed/a@', 'at://feed/b@']));
        await expect(getMergedTimeline(allFail, { limit: 20, cursor: '', algorithm })).rejects.toThrow();

        const partial = fakeAgent(pages, new Set(['at://feed/b@']));
        const res = await getMergedTimeline(partial, { limit: 20, cursor: '', algorithm });
        expect(uris(res.feed)).toEqual(['a1']);
    });

    it('completes gracefully on an undecodable continuation cursor instead of appending head content', async () => {
        const sources = [src('a')];
        const algorithm = { type: 'merge', sources };
        const agent = fakeAgent({
            'at://feed/a': { '': { feed: [post('a1', 100)], cursor: 'a-next' } },
        });

        const res = await getMergedTimeline(agent, { limit: 20, cursor: 'not-a-merge-cursor', algorithm });
        expect(res.feed).toEqual([]);
        expect(res.cursor).toBeUndefined();
        expect(agent.calls).toHaveLength(0);
    });

    it('returns an unchanged cursor when every continuation fetch fails', async () => {
        const sources = [src('a')];
        const algorithm = { type: 'merge', sources };
        const good = fakeAgent({
            'at://feed/a': { '': { feed: [post('a1', 100)], cursor: 'a-next' } },
        });
        const head = await getMergedTimeline(good, { limit: 20, cursor: '', algorithm });
        expect(head.cursor).toBeTruthy();

        const bad = fakeAgent({}, new Set(['at://feed/a@a-next']));
        const res = await getMergedTimeline(bad, { limit: 20, cursor: head.cursor, algorithm });
        expect(res.feed).toEqual([]);
        expect(res.cursor).toBe(head.cursor);
    });

    it('walks a whole merged timeline to completion without ever returning an empty-string cursor', async () => {
        const sources = [src('a'), src('b')];
        const algorithm = { type: 'merge', sources };
        const agent = fakeAgent({
            'at://feed/a': {
                '': { feed: [post('a1', 100), post('a2', 90)], cursor: 'a2c' },
                'a2c': { feed: [post('a3', 50)], cursor: undefined },
            },
            'at://feed/b': {
                '': { feed: [post('b1', 95), post('b2', 60)], cursor: 'b2c' },
                'b2c': { feed: [], cursor: undefined },
            },
        });

        const seen: string[] = [];
        let cursor: string | undefined = undefined;
        for (let i = 0; i < 10; i++) {
            const res = await getMergedTimeline(agent, { limit: 2, cursor: cursor ?? '', algorithm });
            expect(res.cursor).not.toBe('');
            seen.push(...uris(res.feed));
            cursor = res.cursor;
            if (cursor === undefined && i > 0) {
                break;
            }
        }

        expect(cursor).toBeUndefined();
        expect(seen).toEqual(['a1', 'b1', 'a2', 'b2', 'a3']);
    });
});

describe('seedMergePool', () => {
    it('emits down to the shallowest tail, pools the deeper remainder, and resumes seamlessly', async () => {
        const sources = [src('a'), src('b')];
        const algorithm = { type: 'merge', sources };
        const feedA = [post('a1', 100), post('a2', 40)];
        const feedB = [post('b1', 90)];

        const seed = seedMergePool(algorithm, sources, [
            { feed: feedA, cursor: 'a-next' },
            { feed: feedB, cursor: 'b-next' },
        ]);
        expect(uris(seed.feed)).toEqual(['a1', 'b1']);
        expect(seed.cursor).toBeTruthy();

        const agent = fakeSeedAgent();
        const res = await getMergedTimeline(agent, { limit: 10, cursor: seed.cursor, algorithm });
        expect(uris(res.feed)).toEqual(['b2', 'a2']);
        expect(agent.calls.every(c => c.feedId !== 'at://feed/a')).toBe(true);

        function fakeSeedAgent() {
            const calls: Array<{ feedId: string, cursor: string }> = [];
            return {
                calls,
                getTimelineByAlgo(opt: any) {
                    calls.push({ feedId: opt.algorithm.algorithm, cursor: opt.cursor });
                    if (opt.algorithm.algorithm === 'at://feed/b' && opt.cursor === 'b-next') {
                        return Promise.resolve({ feed: [post('b2', 85), post('b3', 20)], cursor: undefined });
                    }
                    return Promise.resolve({ feed: [], cursor: undefined });
                },
            };
        }
    });

    it('strips stale stamps from seeded items', () => {
        const sources = [src('a')];
        const algorithm = { type: 'merge', sources };
        const item = { ...post('a1', 100), isDivider: true, memoryCursor: 'old', __sourceId: 'stale' };

        const seed = seedMergePool(algorithm, sources, [{ feed: [item], cursor: undefined }]);
        expect(seed.feed[0].isDivider).toBeUndefined();
        expect(seed.feed[0].memoryCursor).toBeUndefined();
        expect(seed.feed[0].__sourceId).toBe('a');
    });
});
