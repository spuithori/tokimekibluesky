import { describe, it, expect } from 'vitest';
import { getCloudListTimeline, pageLimitFor } from './cloudListFetch';

const BASE = Date.parse('2026-01-01T00:00:00.000Z');

function iso(min: number): string {
    return new Date(BASE + min * 60_000).toISOString();
}

function post(did: string, index: number, min: number) {
    return { post: { uri: `at://${did}/app.bsky.feed.post/${index}`, indexedAt: iso(min), author: { did } } };
}

function descendingFeed(did: string, count: number, newestMin: number, stepMin: number) {
    const feed = [];
    for (let i = 0; i < count; i++) {
        feed.push(post(did, i, newestMin - i * stepMin));
    }
    return feed;
}

type FakeAgentOptions = {
    failActors?: string[],
    fetchDelayMs?: number,
};

function makeAgent(memberFeeds: Record<string, any[]>, opts: FakeAgentOptions = {}) {
    const stats = {
        getListCalls: 0,
        authorFeedCalls: 0,
        maxInFlight: 0,
    };
    let inFlight = 0;

    const agent = {
        getCloudList: async (id: unknown) => {
            stats.getListCalls++;
            return { list: { id: Number(id), name: 'test' }, members: Object.keys(memberFeeds) };
        },
        xrpc: {
            get: async (nsid: string, params: any) => {
                if (nsid !== 'app.bsky.feed.getAuthorFeed') {
                    throw new Error(`unexpected nsid: ${nsid}`);
                }

                stats.authorFeedCalls++;
                inFlight++;
                stats.maxInFlight = Math.max(stats.maxInFlight, inFlight);
                await new Promise(resolve => setTimeout(resolve, opts.fetchDelayMs ?? 1));
                inFlight--;

                if (opts.failActors?.includes(params.actor)) {
                    throw new Error('fetch failed');
                }

                const feed = memberFeeds[params.actor] ?? [];
                const start = params.cursor ? Number(params.cursor) : 0;
                const items = feed.slice(start, start + params.limit);
                const next = start + items.length;
                return { feed: items, cursor: next < feed.length ? String(next) : undefined };
            },
        },
    };

    return { agent, stats };
}

function algorithmOf(id = 1) {
    return { type: 'cloudList', algorithm: id, name: 'test' };
}

function keys(feed: any[]): number[] {
    return feed.map(item => Date.parse(item.post.indexedAt));
}

function urisOf(feed: any[]): string[] {
    return feed.map(item => item.post.uri);
}

describe('pageLimitFor', () => {
    it('scales page size down as member count grows', () => {
        expect(pageLimitFor(1)).toBe(20);
        expect(pageLimitFor(3)).toBe(20);
        expect(pageLimitFor(10)).toBe(10);
        expect(pageLimitFor(25)).toBe(5);
        expect(pageLimitFor(100)).toBe(5);
    });
});

describe('getCloudListTimeline', () => {
    it('returns empty feed for a list without members', async () => {
        const { agent } = makeAgent({});
        const res = await getCloudListTimeline(agent, { limit: 20, cursor: '', algorithm: algorithmOf() });
        expect(res.feed).toEqual([]);
        expect(res.cursor).toBeUndefined();
    });

    it('merges member feeds in descending chronological order', async () => {
        const { agent } = makeAgent({
            'did:plc:a': [post('did:plc:a', 0, 100), post('did:plc:a', 1, 40), post('did:plc:a', 2, 10)],
            'did:plc:b': [post('did:plc:b', 0, 90), post('did:plc:b', 1, 50)],
            'did:plc:c': [post('did:plc:c', 0, 70), post('did:plc:c', 1, 60)],
        });

        const res = await getCloudListTimeline(agent, { limit: 20, cursor: '', algorithm: algorithmOf() });

        expect(res.feed.length).toBe(7);
        expect(res.cursor).toBeUndefined();
        const ks = keys(res.feed);
        expect(ks).toEqual([...ks].sort((x, y) => y - x));
    });

    it('continues across pages via the composite cursor without gaps or duplicates', async () => {
        const feeds = {
            'did:plc:a': descendingFeed('did:plc:a', 40, 1000, 3),
            'did:plc:b': descendingFeed('did:plc:b', 40, 999, 3),
        };
        const { agent } = makeAgent(feeds);
        const algorithm = algorithmOf();

        const head = await getCloudListTimeline(agent, { limit: 20, cursor: '', algorithm });
        expect(head.feed.length).toBe(20);
        expect(typeof head.cursor).toBe('string');

        const second = await getCloudListTimeline(agent, { limit: 20, cursor: head.cursor, algorithm });
        expect(second.feed.length).toBeGreaterThan(0);

        const third = await getCloudListTimeline(agent, { limit: 20, cursor: second.cursor, algorithm });
        expect(third.feed.length).toBeGreaterThan(0);

        const all = [...head.feed, ...second.feed, ...third.feed];
        const ks = keys(all);
        expect(ks).toEqual([...ks].sort((x, y) => y - x));
        expect(new Set(urisOf(all)).size).toBe(all.length);
        expect(all.length).toBeGreaterThanOrEqual(40);
    });

    it('reconstructs from the cursor after losing the in-memory pool', async () => {
        const feeds = {
            'did:plc:a': descendingFeed('did:plc:a', 40, 1000, 3),
            'did:plc:b': descendingFeed('did:plc:b', 40, 999, 3),
        };
        const first = makeAgent(feeds);
        const head = await getCloudListTimeline(first.agent, { limit: 20, cursor: '', algorithm: algorithmOf() });

        const second = makeAgent(feeds);
        const resumed = await getCloudListTimeline(second.agent, { limit: 20, cursor: head.cursor, algorithm: algorithmOf() });

        expect(second.stats.getListCalls).toBe(1);
        expect(resumed.feed.length).toBeGreaterThan(0);

        const all = [...head.feed, ...resumed.feed];
        const ks = keys(all);
        expect(ks).toEqual([...ks].sort((x, y) => y - x));
        expect(new Set(urisOf(all)).size).toBe(all.length);
    });

    it('treats the cursor as expired when the membership changed', async () => {
        const feeds = {
            'did:plc:a': descendingFeed('did:plc:a', 40, 1000, 3),
            'did:plc:b': descendingFeed('did:plc:b', 40, 999, 3),
        };
        const first = makeAgent(feeds);
        const head = await getCloudListTimeline(first.agent, { limit: 20, cursor: '', algorithm: algorithmOf() });

        const changed = makeAgent({
            ...feeds,
            'did:plc:c': descendingFeed('did:plc:c', 10, 998, 3),
        });
        const resumed = await getCloudListTimeline(changed.agent, { limit: 20, cursor: head.cursor, algorithm: algorithmOf() });

        expect(resumed.feed).toEqual([]);
        expect(resumed.cursor).toBeUndefined();
    });

    it('reuses the member snapshot for load-more and refetches it on head', async () => {
        const feeds = {
            'did:plc:a': descendingFeed('did:plc:a', 40, 1000, 3),
            'did:plc:b': descendingFeed('did:plc:b', 40, 999, 3),
        };
        const { agent, stats } = makeAgent(feeds);
        const algorithm = algorithmOf();

        const head = await getCloudListTimeline(agent, { limit: 20, cursor: '', algorithm });
        expect(stats.getListCalls).toBe(1);

        await getCloudListTimeline(agent, { limit: 20, cursor: head.cursor, algorithm });
        expect(stats.getListCalls).toBe(1);

        await getCloudListTimeline(agent, { limit: 20, cursor: '', algorithm });
        expect(stats.getListCalls).toBe(2);
    });

    it('caps concurrent author feed fetches', async () => {
        const feeds: Record<string, any[]> = {};
        for (let i = 0; i < 25; i++) {
            feeds[`did:plc:m${i}`] = [post(`did:plc:m${i}`, 0, 1000 - i)];
        }
        const { agent, stats } = makeAgent(feeds, { fetchDelayMs: 5 });

        const res = await getCloudListTimeline(agent, { limit: 20, cursor: '', algorithm: algorithmOf() });

        expect(res.feed.length).toBe(20);
        expect(stats.authorFeedCalls).toBe(25);
        expect(stats.maxInFlight).toBeLessThanOrEqual(10);
    });

    it('keeps both the original post and a repost of it by another member', async () => {
        const original = post('did:plc:a', 0, 100);
        const repostByB = {
            post: { ...original.post },
            reason: { $type: 'app.bsky.feed.defs#reasonRepost', by: { did: 'did:plc:b' }, indexedAt: iso(105) },
        };
        const { agent } = makeAgent({
            'did:plc:a': [original],
            'did:plc:b': [repostByB],
        });

        const res = await getCloudListTimeline(agent, { limit: 20, cursor: '', algorithm: algorithmOf() });

        expect(res.feed.length).toBe(2);
        expect(res.feed[0].reason).toBeTruthy();
        expect(res.feed[1].reason).toBeFalsy();
    });

    it('drains an exhausted member completely while others continue', async () => {
        const feeds = {
            'did:plc:short': [post('did:plc:short', 0, 995), post('did:plc:short', 1, 500)],
            'did:plc:long': descendingFeed('did:plc:long', 30, 1000, 3),
        };
        const { agent } = makeAgent(feeds);
        const algorithm = algorithmOf();

        const all: any[] = [];
        let cursor: string | undefined = '';
        for (let i = 0; i < 10; i++) {
            const res = await getCloudListTimeline(agent, { limit: 20, cursor, algorithm });
            all.push(...res.feed);
            cursor = res.cursor;
            if (!cursor) {
                break;
            }
        }

        expect(cursor).toBeUndefined();
        expect(all.length).toBe(32);
        expect(all.filter(item => item.post.author.did === 'did:plc:short').length).toBe(2);
        const ks = keys(all);
        expect(ks).toEqual([...ks].sort((x, y) => y - x));
    });

    it('emits remaining members when one member fetch fails on head', async () => {
        const { agent } = makeAgent({
            'did:plc:a': [post('did:plc:a', 0, 100)],
            'did:plc:b': [post('did:plc:b', 0, 90)],
            'did:plc:broken': [post('did:plc:broken', 0, 95)],
        }, { failActors: ['did:plc:broken'] });

        const res = await getCloudListTimeline(agent, { limit: 20, cursor: '', algorithm: algorithmOf() });

        const dids = res.feed.map(item => item.post.author.did);
        expect(dids).toContain('did:plc:a');
        expect(dids).toContain('did:plc:b');
        expect(dids).not.toContain('did:plc:broken');
    });
});
