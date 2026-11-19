import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Column } from '$lib/types/column';
import type { HomePlusRecipe } from './recipe';

const state = vi.hoisted(() => ({
    profiles: [] as { id: number; columns: any[] }[],
    agents: new Map<string, any>(),
}));

vi.mock('$lib/db', () => ({
    accountsDb: { profiles: { toArray: async () => state.profiles } },
}));
vi.mock('$lib/classes/appState.svelte', () => ({
    appState: { profile: { current: 1 } },
}));
vi.mock('$lib/stores', async () => {
    const { readable } = await import('svelte/store');
    return { agentsByDid: readable(state.agents) };
});
vi.mock('tokimeki-i18n', () => ({
    t: (key: string, values?: Record<string, unknown>) => (values ? `${key}:${Object.values(values).join(',')}` : key),
}));

import {
    commitHomePlus,
    countHomePlusFeedUses,
    forgetHomePlusProfiles,
    homePlusAlgorithm,
    isHomePlusAutoNamed,
    loadHomePlusFeeds,
    prepareHomePlusColumn,
    releaseHomePlus,
    removeUnusedHomePlusFeed,
    renameHomePlus,
    resolveHomePlusFeed,
    restoreHomePlusColumn,
} from './lifecycle';
import { buildHomePlusItems } from './catalog';
import { listHomePlusFeeds } from './feeds';

const DID = 'did:plc:me';
const DEF = 'tech.tokimeki.feeds.definition';
const GEN = 'app.bsky.feed.generator';

function fakeAgent(records = new Map<string, any>()) {
    const key = (collection: string, rkey: string) => `${collection}/${rkey}`;
    const agent = {
        records,
        did: () => DID,
        callWithProxy: vi.fn(async (nsid: string, _params: unknown, options: any) =>
            nsid.endsWith('composeGenerator') ? { record: { $type: GEN, did: 'did:web:feeds.tokimeki.blue', displayName: options.data.definition.name } } : {}),
        xrpc: {
            get: vi.fn(async (nsid: string, params: any) => {
                if (nsid.endsWith('listRecords')) {
                    return {
                        records: [...records.entries()]
                            .filter(([k]) => k.startsWith(`${params.collection}/`))
                            .map(([k, value]) => ({ uri: `at://${DID}/${k}`, value })),
                    };
                }
                const value = records.get(key(params.collection, params.rkey));
                if (!value) throw Object.assign(new Error('not found'), { status: 400, error: 'RecordNotFound' });
                return { value };
            }),
            post: vi.fn(async (nsid: string, data: any) => {
                if (nsid.endsWith('putRecord')) records.set(key(data.collection, data.rkey), data.record);
                if (nsid.endsWith('deleteRecord')) records.delete(key(data.collection, data.rkey));
                return {};
            }),
        },
    };
    return agent;
}

function feedCount(agent: ReturnType<typeof fakeAgent>): number {
    return [...agent.records.keys()].filter((k) => k.startsWith(`${GEN}/homeplus-`)).length;
}

function columnOf(id: string, algorithm: Column['algorithm']): Column {
    return { id, did: DID, algorithm, style: 'default', settings: {}, data: {} } as Column;
}

function pendingColumn(id: string, recipe: HomePlusRecipe): Column {
    return columnOf(id, { type: 'custom', algorithm: '', name: 'x', homePlus: { recipe, createdAt: '' } });
}

const MISSING = Object.assign(new Error('could not find feed'), { status: 400 });
const IMAGES: HomePlusRecipe = { conds: [{ id: 'image' }], sort: 'new' };
const POPULAR: HomePlusRecipe = { conds: [{ id: 'image' }, { id: 'minLikes', value: 10 }], sort: 'new' };

let agent: ReturnType<typeof fakeAgent>;

beforeEach(() => {
    agent = fakeAgent();
    state.profiles = [];
    forgetHomePlusProfiles();
    state.agents.clear();
    state.agents.set(DID, agent);
});

describe('HOME+ feeds stay bounded by the recipes in use', () => {
    it('reuses the feed when the same recipe is added again, even from another device', async () => {
        const first = await resolveHomePlusFeed(agent as any, IMAGES);
        const again = await resolveHomePlusFeed(agent as any, { ...IMAGES });
        const otherDevice = await resolveHomePlusFeed(fakeAgent(agent.records) as any, { ...IMAGES });

        expect(again.uri).toBe(first.uri);
        expect(otherDevice.uri).toBe(first.uri);
        expect(feedCount(agent)).toBe(1);
    });

    it('creates one feed when the same recipe is added twice before the first finishes', async () => {
        const [a, b] = await Promise.all([
            resolveHomePlusFeed(agent as any, IMAGES),
            resolveHomePlusFeed(agent as any, IMAGES),
        ]);

        expect(a.uri).toBe(b.uri);
        expect(feedCount(agent)).toBe(1);
    });

    it('rewrites the same feed when its conditions change', async () => {
        const feed = await resolveHomePlusFeed(agent as any, IMAGES);
        const column = columnOf('a', homePlusAlgorithm(feed));

        await commitHomePlus(agent as any, column, IMAGES, POPULAR, () => [column]);

        expect(column.algorithm.algorithm).toBe(feed.uri);
        expect(feedCount(agent)).toBe(1);
        expect((await listHomePlusFeeds(agent as any))[0].recipe).toEqual(POPULAR);
    });

    it('splits off a new feed when another column, in this or another profile, shows the same one', async () => {
        const feed = await resolveHomePlusFeed(agent as any, IMAGES);
        const a = columnOf('a', homePlusAlgorithm(feed));
        const b = columnOf('b', homePlusAlgorithm(feed));

        await commitHomePlus(agent as any, a, IMAGES, POPULAR, () => [a, b]);
        expect(a.algorithm.algorithm).not.toBe(feed.uri);
        expect(b.algorithm.algorithm).toBe(feed.uri);
        expect(feedCount(agent)).toBe(2);

        state.profiles = [{ id: 2, columns: [columnOf('c', homePlusAlgorithm(feed))] }];
        forgetHomePlusProfiles();
        await commitHomePlus(agent as any, b, IMAGES, { conds: [], sort: 'likes' }, () => [a, b]);
        expect(b.algorithm.algorithm).not.toBe(feed.uri);
        expect(feedCount(agent)).toBe(3);
    });

    it('deletes the feed with its last column, and keeps it while a column or a merged source still uses it', async () => {
        const feed = await resolveHomePlusFeed(agent as any, IMAGES);
        const a = columnOf('a', homePlusAlgorithm(feed));
        const merged = columnOf('m', { type: 'merge', sources: [{ id: 's', type: 'custom', algorithm: feed.uri, name: 'x' }] } as Column['algorithm']);

        await releaseHomePlus(a, [merged]);
        expect(feedCount(agent)).toBe(1);

        state.profiles = [{ id: 2, columns: [a] }];
        forgetHomePlusProfiles();
        await releaseHomePlus(merged, []);
        expect(feedCount(agent)).toBe(1);

        state.profiles = [];
        forgetHomePlusProfiles();
        await releaseHomePlus(a, []);
        expect(feedCount(agent)).toBe(0);
        expect(agent.records.size).toBe(0);
    });

    it('never deletes a feed that is not a HOME+ feed', async () => {
        agent.records.set(`${GEN}/whats-hot`, {});
        agent.records.set(`${DEF}/whats-hot`, {});
        const column = columnOf('a', { type: 'custom', algorithm: `at://${DID}/${GEN}/whats-hot`, name: 'x' });

        await releaseHomePlus(column, []);

        expect(agent.records.size).toBe(2);
    });
});

describe('a column added before its feed exists', () => {
    it('gets the feed on its first load, and two columns with the same recipe share one', async () => {
        const a = pendingColumn('a', IMAGES);
        const b = pendingColumn('b', { ...IMAGES });

        await Promise.all([
            prepareHomePlusColumn(agent as any, a, () => [a, b]),
            prepareHomePlusColumn(agent as any, b, () => [a, b]),
            prepareHomePlusColumn(agent as any, a, () => [a, b]),
        ]);

        expect(a.algorithm.algorithm).toMatch(/\/app\.bsky\.feed\.generator\/homeplus-/);
        expect(b.algorithm.algorithm).toBe(a.algorithm.algorithm);
        expect(a.algorithm.homePlus?.createdAt).not.toBe('');
        expect(feedCount(agent)).toBe(1);
    });

    it('leaves no feed behind when the column is removed while the feed is being created', async () => {
        const column = pendingColumn('a', IMAGES);
        let columns = [column];

        const task = prepareHomePlusColumn(agent as any, column, () => columns);
        columns = [];
        await task;

        expect(column.algorithm.algorithm).toBe('');
        expect(agent.records.size).toBe(0);
    });

    it('applies a condition change made before the feed was ready', async () => {
        const column = pendingColumn('a', IMAGES);

        await commitHomePlus(agent as any, column, IMAGES, POPULAR, () => [column]);

        expect(feedCount(agent)).toBe(1);
        expect((await listHomePlusFeeds(agent as any))[0].recipe).toEqual(POPULAR);
        expect(column.algorithm.homePlus?.recipe).toEqual(POPULAR);
    });
});

describe('a column restores its feed after another device deleted it', () => {
    it('writes the records back under the same key, once', async () => {
        const feed = await resolveHomePlusFeed(agent as any, POPULAR);
        const column = columnOf('a', homePlusAlgorithm(feed));
        agent.records.clear();

        expect(await restoreHomePlusColumn(agent as any, column, MISSING)).toBe(true);
        expect((await listHomePlusFeeds(agent as any)).map((f) => [f.uri, f.recipe])).toEqual([[feed.uri, POPULAR]]);
        expect(feedCount(agent)).toBe(1);

        agent.records.clear();
        expect(await restoreHomePlusColumn(agent as any, column, MISSING)).toBe(false);
        expect(agent.records.size).toBe(0);
    });

    it('leaves existing records alone and asks for one more read, since the index may only be behind', async () => {
        const feed = await resolveHomePlusFeed(agent as any, IMAGES);
        const column = columnOf('b', homePlusAlgorithm(feed));
        const writes = agent.xrpc.post.mock.calls.length;

        expect(await restoreHomePlusColumn(agent as any, column, MISSING)).toBe(true);
        expect(agent.xrpc.post.mock.calls.length).toBe(writes);
        expect(await restoreHomePlusColumn(agent as any, column, MISSING)).toBe(false);
    });

    it('can be retried after the restore itself failed', async () => {
        const feed = await resolveHomePlusFeed(agent as any, IMAGES);
        const column = columnOf('c', homePlusAlgorithm(feed));
        agent.records.clear();
        agent.xrpc.post.mockRejectedValueOnce(Object.assign(new Error('boom'), { status: 500 }));

        expect(await restoreHomePlusColumn(agent as any, column, MISSING)).toBe(false);
        expect(await restoreHomePlusColumn(agent as any, column, MISSING)).toBe(true);
        expect(feedCount(agent)).toBe(1);
    });

    it('does not touch the repository for a network failure or a rate limit', async () => {
        const feed = await resolveHomePlusFeed(agent as any, IMAGES);
        const column = columnOf('d', homePlusAlgorithm(feed));
        const reads = agent.xrpc.get.mock.calls.length;

        expect(await restoreHomePlusColumn(agent as any, column, new TypeError('Failed to fetch'))).toBe(false);
        expect(await restoreHomePlusColumn(agent as any, column, Object.assign(new Error('slow down'), { status: 429 }))).toBe(false);
        expect(agent.xrpc.get.mock.calls.length).toBe(reads);
    });
});

describe('names', () => {
    it('keeps a renamed feed apart from another column that shows the same feed', async () => {
        const feed = await resolveHomePlusFeed(agent as any, IMAGES);
        const a = columnOf('a', homePlusAlgorithm(feed));
        const b = columnOf('b', homePlusAlgorithm(feed));

        await renameHomePlus(agent as any, a, '推し絵', () => [a, b]);

        expect(a.algorithm.name).toBe('推し絵');
        expect(a.algorithm.algorithm).not.toBe(feed.uri);
        expect(b.algorithm.name).toBe(feed.name);
        expect(agent.records.get(`${DEF}/${feed.rkey}`).name).toBe(feed.name);
        expect(isHomePlusAutoNamed(a)).toBe(false);
        expect(isHomePlusAutoNamed(b)).toBe(true);
    });

    it('keeps a custom name through a condition change and follows the conditions otherwise', async () => {
        const feed = await resolveHomePlusFeed(agent as any, IMAGES);
        const column = columnOf('a', homePlusAlgorithm(feed));
        await commitHomePlus(agent as any, column, IMAGES, POPULAR, () => [column]);
        expect(column.algorithm.name).not.toBe(feed.name);
        expect(isHomePlusAutoNamed(column)).toBe(true);

        await renameHomePlus(agent as any, column, '推し絵', () => [column]);
        await commitHomePlus(agent as any, column, POPULAR, IMAGES, () => [column]);
        expect(column.algorithm.name).toBe('推し絵');

        await renameHomePlus(agent as any, column, '  ', () => [column]);
        expect(column.algorithm.name).toBe(feed.name);
        expect(isHomePlusAutoNamed(column)).toBe(true);
    });
});

describe('the list of existing feeds', () => {
    it('does not hand out a feed whose conditions were changed since', async () => {
        const first = columnOf('a', homePlusAlgorithm(await resolveHomePlusFeed(agent as any, IMAGES)));
        await commitHomePlus(agent as any, first, IMAGES, POPULAR, () => [first]);

        const second = await resolveHomePlusFeed(agent as any, IMAGES);

        expect(second.uri).not.toBe(first.algorithm.algorithm);
        expect(feedCount(agent)).toBe(2);
    });

    it('gives every catalog row its own key even when two feeds share the same conditions', async () => {
        const a = columnOf('a', homePlusAlgorithm(await resolveHomePlusFeed(agent as any, IMAGES)));
        const b = columnOf('b', homePlusAlgorithm(await resolveHomePlusFeed(agent as any, { conds: [], sort: 'new' })));
        await commitHomePlus(agent as any, a, IMAGES, POPULAR, () => [a, b]);
        await commitHomePlus(agent as any, b, { conds: [], sort: 'new' }, POPULAR, () => [a, b]);
        const feeds = await loadHomePlusFeeds(agent as any, true);
        expect(feeds).toHaveLength(2);

        const keys = buildHomePlusItems(DID, 'me.test', feeds, (key) => key).map((item) => item.key);

        expect(new Set(keys).size).toBe(keys.length);
    });

    it('counts a feed used only as a merged source, and refuses to delete one another profile shows', async () => {
        const feed = await resolveHomePlusFeed(agent as any, POPULAR);
        const merged = columnOf('m', { type: 'merge', sources: [{ id: 's', type: 'custom', algorithm: feed.uri, name: 'x' }] } as Column['algorithm']);
        expect(countHomePlusFeedUses([merged]).get(feed.uri)).toBe(1);

        state.profiles = [{ id: 2, columns: [columnOf('c', homePlusAlgorithm(feed))] }];
        forgetHomePlusProfiles();
        expect(await removeUnusedHomePlusFeed(agent as any, feed, [])).toBe(false);
        expect(feedCount(agent)).toBe(1);

        state.profiles = [];
        forgetHomePlusProfiles();
        expect(await removeUnusedHomePlusFeed(agent as any, feed, [])).toBe(true);
        expect(agent.records.size).toBe(0);
    });
});

describe('a column removed while its conditions are being saved', () => {
    it('leaves no feed behind', async () => {
        const feed = await resolveHomePlusFeed(agent as any, IMAGES);
        const column = columnOf('a', homePlusAlgorithm(feed));
        let columns = [column];

        const task = commitHomePlus(agent as any, column, IMAGES, POPULAR, () => columns);
        columns = [];
        await task;

        expect(agent.records.size).toBe(0);
    });
});
