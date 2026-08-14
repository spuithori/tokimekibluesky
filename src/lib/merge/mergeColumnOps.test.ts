import { describe, it, expect, vi } from 'vitest';

vi.mock('$lib/db', () => ({
    accountsDb: {
        profiles: {
            get: () => Promise.resolve(null),
            update: () => Promise.resolve(),
        },
    },
}));
vi.mock('$lib/classes/appState.svelte', () => ({
    appState: { profile: { current: 1 }, labelDefs: { current: [] }, registerHandleListener: () => () => {}, getFreshHandle: () => undefined },
}));
vi.mock('$lib/classes/settingsState.svelte', () => ({
    settingsState: { settings: { markedUnread: false } },
}));

import { createRealDeckColumnState } from '$lib/classes/columnState.perf.harness.svelte';
import { flattenLeafIds } from '$lib/classes/deckLayout';
import { canMergeColumns, mergeColumns, extractMergeSource, removeMergeSource } from './mergeColumnOps';
import { decodeMergeCursor, sortKeyOf } from './mergeEngine';
import { soloFeedKey } from './mergeSolo';

const BASE = Date.parse('2026-01-01T00:00:00.000Z');

function iso(min: number): string {
    return new Date(BASE + min * 60_000).toISOString();
}

function post(uri: string, min: number) {
    return { post: { uri: `at://did:plc:test/app.bsky.feed.post/${uri}`, indexedAt: iso(min), author: { did: 'did:plc:test' } } };
}

function uris(feed: any[]): string[] {
    return feed.map(item => item.post.uri.split('/').pop());
}

function homeCol(id: string, did = 'did:plc:viewer'): any {
    return {
        id,
        algorithm: { type: 'default', name: 'HOME' },
        style: 'default',
        did,
        settings: {},
        data: { feed: [], cursor: '' },
    };
}

function feedCol(id: string, feedUri: string, did = 'did:plc:viewer'): any {
    return {
        id,
        algorithm: { type: 'custom', algorithm: feedUri, name: feedUri.split('/').pop() },
        style: 'default',
        did,
        settings: {},
        data: { feed: [], cursor: '' },
    };
}

describe('canMergeColumns', () => {
    it('accepts two mergeable same-account columns and rejects mismatches', () => {
        const { cs, cleanup } = createRealDeckColumnState();
        cs.add(homeCol('a'));
        cs.add(feedCol('b', 'at://feed/news'));
        cs.add(homeCol('c', 'did:plc:other'));
        cs.add({ ...homeCol('d'), algorithm: { type: 'notification', name: 'N' } });

        const get = (id: string) => cs.columnById.get(id);
        expect(canMergeColumns(get('a'), get('b'))).toBe(true);
        expect(canMergeColumns(get('a'), get('a'))).toBe(false);
        expect(canMergeColumns(get('a'), get('c'))).toBe(false);
        expect(canMergeColumns(get('a'), get('d'))).toBe(false);
        cleanup();
    });

    it('rejects source counts beyond the cap', () => {
        const { cs, cleanup } = createRealDeckColumnState();
        const many = {
            ...homeCol('m'),
            algorithm: {
                type: 'merge',
                name: 'M',
                sources: Array.from({ length: 5 }, (_, i) => ({ id: `s${i}`, type: 'custom', algorithm: `at://feed/${i}`, name: `f${i}` })),
            },
        };
        cs.add(many);
        cs.add(homeCol('a'));
        expect(canMergeColumns(cs.columnById.get('m'), cs.columnById.get('a'))).toBe(false);
        cleanup();
    });
});

describe('mergeColumns', () => {
    it('merges two plain columns into one seeded merge column and removes the source', () => {
        const { cs, cleanup } = createRealDeckColumnState();
        cs.add(homeCol('a'));
        cs.add(feedCol('b', 'at://feed/news'));
        cs.setFeed('a', [post('a1', 100), post('a2', 80)]);
        cs.columnById.get('a').data.cursor = 'cur-a';
        cs.setFeed('b', [post('b1', 90)]);
        cs.columnById.get('b').data.cursor = 'cur-b';

        expect(mergeColumns(cs, 'a', 'b')).toBe(true);

        const merged = cs.columnById.get('a');
        expect(merged.algorithm.type).toBe('merge');
        expect(merged.algorithm.sources).toHaveLength(2);
        expect(cs.columnById.get('b')).toBeUndefined();
        expect(cs.slots).toHaveLength(1);

        const feed = cs.getFeed('a');
        expect(uris(feed)).toEqual(['a1', 'b1']);
        const keys = feed.map(sortKeyOf);
        expect([...keys].sort((x, y) => y - x)).toEqual(keys);
        expect(feed.every((item: any) => typeof item.__sourceId === 'string')).toBe(true);
        expect(feed.every((item: any) => item.memoryCursor === merged.data.cursor)).toBe(true);

        const state = decodeMergeCursor(merged.data.cursor, merged.algorithm.sources);
        expect(state).not.toBeNull();
        expect(state!.s).toHaveLength(2);
        cleanup();
    });

    it('absorbs an existing merge column source list', () => {
        const { cs, cleanup } = createRealDeckColumnState();
        cs.add(homeCol('a'));
        cs.add(feedCol('b', 'at://feed/news'));
        cs.setFeed('a', [post('a1', 100)]);
        cs.setFeed('b', [post('b1', 90)]);
        mergeColumns(cs, 'a', 'b');

        cs.add(feedCol('c', 'at://feed/tech'));
        cs.setFeed('c', [post('c1', 95)]);
        expect(mergeColumns(cs, 'a', 'c')).toBe(true);

        const merged = cs.columnById.get('a');
        expect(merged.algorithm.sources).toHaveLength(3);
        expect(merged.algorithm.sources.map((s: any) => s.type)).toEqual(['default', 'custom', 'custom']);
        cleanup();
    });
});

describe('extractMergeSource', () => {
    function setupMerged() {
        const { cs, cleanup } = createRealDeckColumnState();
        cs.add(homeCol('a'));
        cs.add(feedCol('b', 'at://feed/news'));
        cs.setFeed('a', [post('a1', 100), post('a2', 80)]);
        cs.columnById.get('a').data.cursor = 'cur-a';
        cs.setFeed('b', [post('b1', 90)]);
        cs.columnById.get('b').data.cursor = 'cur-b';
        mergeColumns(cs, 'a', 'b');
        const sources = cs.columnById.get('a').algorithm.sources;
        return { cs, cleanup, sources };
    }

    it('splits a source out into its own slot and converts the remainder back to a plain column', () => {
        const { cs, cleanup, sources } = setupMerged();
        const bSource = sources[1];

        expect(extractMergeSource(cs, 'a', bSource.id, { kind: 'extract', beforeId: null })).toBe(true);

        const remainder = cs.columnById.get('a');
        expect(remainder.algorithm.type).toBe('default');
        expect(uris(cs.getFeed('a'))).toEqual(['a1', 'a2']);
        expect(cs.getFeed('a').every((item: any) => item.__sourceId === undefined)).toBe(true);

        expect(cs.columns).toHaveLength(2);
        const extracted = cs.columns.find((c: any) => c.id !== 'a');
        expect(extracted.algorithm.type).toBe('custom');
        expect(extracted.algorithm.algorithm).toBe('at://feed/news');
        expect(uris(cs.getFeed(extracted.id))).toEqual(['b1']);
        expect(cs.slots).toHaveLength(2);
        cleanup();
    });

    it('drops a source onto another tile as a split pane', () => {
        const { cs, cleanup, sources } = setupMerged();
        cs.add(homeCol('t'));
        const bSource = sources[1];

        expect(extractMergeSource(cs, 'a', bSource.id, { kind: 'split', id: 't', zone: 'bottom' })).toBe(true);

        const tSlotIndex = cs.slotIndexOf('t');
        const leafIds = flattenLeafIds(cs.slots[tSlotIndex].layout);
        expect(leafIds).toHaveLength(2);
        expect(leafIds[0]).toBe('t');
        cleanup();
    });

    it('refuses to extract from a non-merge column or a missing source', () => {
        const { cs, cleanup } = createRealDeckColumnState();
        cs.add(homeCol('a'));
        expect(extractMergeSource(cs, 'a', 'nope', { kind: 'extract', beforeId: null })).toBe(false);
        cleanup();
    });
});

describe('solo overlay feed cleanup', () => {
    it('purges the solo overlay feed when the column is removed', () => {
        const { cs, cleanup } = createRealDeckColumnState();
        cs.add(homeCol('a'));
        cs.setFeed(soloFeedKey('a'), [post('s1', 100)]);
        expect((cs as any)._feeds.has(soloFeedKey('a'))).toBe(true);

        cs.remove('a');
        expect((cs as any)._feeds.has(soloFeedKey('a'))).toBe(false);
        cleanup();
    });

    it('sweeps orphan solo overlay feeds on replaceAllColumns while keeping regular feeds hot', () => {
        const { cs, cleanup } = createRealDeckColumnState();
        cs.add(homeCol('a'));
        cs.setFeed('a', [post('a1', 100)]);
        cs.setFeed(soloFeedKey('a'), [post('s1', 100)]);

        cs.replaceAllColumns([homeCol('a')], undefined, 2);
        expect((cs as any)._feeds.has(soloFeedKey('a'))).toBe(false);
        expect((cs as any)._feeds.has('a')).toBe(true);
        cleanup();
    });
});

describe('removeMergeSource', () => {
    it('keeps merge type at 3→2 sources and converts to plain at 2→1', () => {
        const { cs, cleanup } = createRealDeckColumnState();
        cs.add(homeCol('a'));
        cs.add(feedCol('b', 'at://feed/news'));
        cs.add(feedCol('c', 'at://feed/tech'));
        cs.setFeed('a', [post('a1', 100)]);
        cs.setFeed('b', [post('b1', 90)]);
        cs.setFeed('c', [post('c1', 95)]);
        mergeColumns(cs, 'a', 'b');
        mergeColumns(cs, 'a', 'c');

        const merged = cs.columnById.get('a');
        expect(merged.algorithm.sources).toHaveLength(3);

        const second = merged.algorithm.sources[1];
        expect(removeMergeSource(cs, 'a', second.id)).toBe(true);
        expect(cs.columnById.get('a').algorithm.type).toBe('merge');
        expect(cs.columnById.get('a').algorithm.sources).toHaveLength(2);

        const last = cs.columnById.get('a').algorithm.sources[1];
        expect(removeMergeSource(cs, 'a', last.id)).toBe(true);
        expect(cs.columnById.get('a').algorithm.type).toBe('default');
        cleanup();
    });
});
