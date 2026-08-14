import { describe, it, expect } from 'vitest';
import { appendSoloPage, initialSoloState, soloFeedKey, visibleSoloKeys } from './mergeSolo';
import { createPool, emitBatch, integratePage, type MergeSource } from './mergeEngine';

const BASE = Date.parse('2026-01-01T00:00:00.000Z');

function iso(min: number): string {
    return new Date(BASE + min * 60_000).toISOString();
}

function post(uri: string, min: number) {
    return { post: { uri: `at://did:plc:test/app.bsky.feed.post/${uri}`, indexedAt: iso(min), author: { did: 'did:plc:test' } } };
}

function src(id: string): MergeSource {
    return { id, type: 'custom', algorithm: `at://feed/${id}`, name: id };
}

function uris(feed: any[]): string[] {
    return feed.map(item => item.post.uri.split('/').pop());
}

describe('soloFeedKey', () => {
    it('is namespaced away from any column id', () => {
        expect(soloFeedKey('abc')).toBe('abc::merge-solo');
        expect(soloFeedKey('abc')).not.toBe('abc');
    });
});

describe('initialSoloState', () => {
    const sources = [src('a'), src('b')];

    function issuedCursor() {
        const pool = createPool(sources, null);
        integratePage(pool, 0, '', { feed: [post('a1', 100), post('a2', 40)], cursor: 'cur-a' });
        integratePage(pool, 1, '', { feed: [post('b1', 90)] });
        return emitBatch(pool, sources, 2).cursor;
    }

    it('resumes from the per-source cursor inside a composite cursor', () => {
        const state = initialSoloState(issuedCursor(), sources, 'a');
        expect(state.complete).toBe(false);
        expect(typeof state.cursor).toBe('string');
    });

    it('marks an exhausted source complete', () => {
        const state = initialSoloState(issuedCursor(), sources, 'b');
        expect(state.complete).toBe(true);
    });

    it('treats a completed merged column as complete', () => {
        expect(initialSoloState(undefined, sources, 'a').complete).toBe(true);
    });

    it('starts from the head for an unloaded column', () => {
        expect(initialSoloState('', sources, 'a')).toEqual({ cursor: '', complete: false });
    });

    it('falls back to the head on an undecodable cursor', () => {
        expect(initialSoloState('not json', sources, 'a')).toEqual({ cursor: '', complete: false });
    });

    it('treats an unknown source as complete', () => {
        expect(initialSoloState(issuedCursor(), sources, 'nope').complete).toBe(true);
    });
});

describe('visibleSoloKeys', () => {
    it('collects only the solo source from the main feed plus every extra item', () => {
        const main = [
            { ...post('a1', 100), __sourceId: 'a' },
            { ...post('b1', 90), __sourceId: 'b' },
        ];
        const extra = [{ ...post('a2', 80), __sourceId: 'a' }];
        const keys = visibleSoloKeys(main, extra, 'a');
        expect(keys.size).toBe(2);
        expect([...keys].some(k => k.includes('/b1'))).toBe(false);
    });
});

describe('appendSoloPage', () => {
    it('dedupes against already-visible items and stamps attribution', () => {
        const keys = visibleSoloKeys([{ ...post('a1', 100), __sourceId: 'a' }], [], 'a');
        const page = appendSoloPage(keys, { feed: [post('a1', 100), post('a2', 80)], cursor: 'next' }, 'a');
        expect(uris(page.items)).toEqual(['a2']);
        expect(page.items[0].__sourceId).toBe('a');
        expect(page.cursor).toBe('next');
        expect(page.complete).toBe(false);
    });

    it('strips stale stamps from fetched items', () => {
        const page = appendSoloPage(new Set(), { feed: [{ ...post('a1', 100), memoryCursor: 'old', isDivider: true }], cursor: 'next' }, 'a');
        expect(page.items[0].memoryCursor).toBeUndefined();
        expect(page.items[0].isDivider).toBeUndefined();
    });

    it('completes on a missing or empty-string cursor and never returns an empty string', () => {
        expect(appendSoloPage(new Set(), { feed: [post('a1', 100)] }, 'a')).toMatchObject({ complete: true, cursor: undefined });
        expect(appendSoloPage(new Set(), { feed: [], cursor: '' }, 'a')).toMatchObject({ complete: true, cursor: undefined });
    });

    it('tolerates an undefined page', () => {
        expect(appendSoloPage(new Set(), undefined, 'a')).toEqual({ items: [], cursor: undefined, complete: true });
    });

    it('accumulates keys across successive pages', () => {
        const keys = new Set<string>();
        const first = appendSoloPage(keys, { feed: [post('a1', 100)], cursor: 'c2' }, 'a');
        const second = appendSoloPage(keys, { feed: [post('a1', 100), post('a2', 80)], cursor: 'c3' }, 'a');
        expect(uris(first.items)).toEqual(['a1']);
        expect(uris(second.items)).toEqual(['a2']);
    });
});
