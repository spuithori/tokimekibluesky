import { describe, it, expect, vi, beforeEach } from 'vitest';

const { db, handleHarness } = vi.hoisted(() => ({
    db: {
        profile: null as any,
        failGet: false,
        updates: [] as any[],
    },
    handleHarness: {
        listeners: new Set<(did: string, handle: string) => void>(),
        fresh: {} as Record<string, string>,
    },
}));

vi.mock('$lib/db', () => ({
    accountsDb: {
        profiles: {
            get: vi.fn(async () => {
                if (db.failGet) throw new Error('idb read failure');
                return db.profile;
            }),
            update: vi.fn(async (...args: any[]) => {
                db.updates.push(args);
                return 1;
            }),
        },
    },
}));
vi.mock('$lib/classes/appState.svelte', () => ({
    appState: {
        profile: { current: 1 },
        labelDefs: { current: [] },
        registerHandleListener: (cb: any) => {
            handleHarness.listeners.add(cb);
            return () => handleHarness.listeners.delete(cb);
        },
        getFreshHandle: (did: string) => handleHarness.fresh[did],
    },
}));
vi.mock('$lib/classes/settingsState.svelte', () => ({
    settingsState: { settings: { markedUnread: false } },
}));

import { flushSync } from 'svelte';
import { createRealDeckColumnState } from '$lib/classes/columnState.perf.harness.svelte';

beforeEach(() => {
    db.profile = null;
    db.failGet = false;
    db.updates.length = 0;
    handleHarness.listeners.clear();
    for (const key of Object.keys(handleHarness.fresh)) {
        delete handleHarness.fresh[key];
    }
});

function col(id: string, did: string, handle: string, extra: Record<string, unknown> = {}) {
    return { id, did, handle, algorithm: { type: 'default' }, data: { feed: [], cursor: '' }, ...extra };
}

describe('columnState load failure handling', () => {
    it('marks loadFailed without raising isColumnsLoaded when the profile read rejects', async () => {
        db.failGet = true;
        const { cs, cleanup } = createRealDeckColumnState();

        await vi.waitFor(() => expect(cs.loadFailed).toBe(true));
        expect(cs.isColumnsLoaded).toBe(false);

        cs.columns.push({ id: 'x', algorithm: { type: 'default' }, data: { feed: [], cursor: '' } });
        flushSync();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(db.updates).toHaveLength(0);

        cleanup();
    });

    it('reconciles refreshed handles into matching columns and splitColumns, once per change', async () => {
        db.profile = {
            id: 1,
            columns: [
                col('c1', 'did:plc:one', 'old.example'),
                col('c2', 'did:plc:two', 'other.example', {
                    splitColumn: col('c2s', 'did:plc:one', 'old.example'),
                }),
            ],
        };
        const { cs, cleanup } = createRealDeckColumnState();
        flushSync();
        await vi.waitFor(() => expect(cs.isColumnsLoaded).toBe(true));
        flushSync();
        await new Promise(resolve => setTimeout(resolve, 0));
        db.updates.length = 0;

        expect(handleHarness.listeners.size).toBe(1);
        const listener = [...handleHarness.listeners][0];
        listener('did:plc:one', 'renamed.example');
        flushSync();
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(cs.columns[0].handle).toBe('renamed.example');
        expect(cs.columns[1].handle).toBe('other.example');
        expect(cs.columns[1].splitColumn.handle).toBe('renamed.example');
        expect(db.updates).toHaveLength(1);

        listener('did:plc:one', 'renamed.example');
        flushSync();
        await new Promise(resolve => setTimeout(resolve, 0));
        expect(db.updates).toHaveLength(1);

        cleanup();
        expect(handleHarness.listeners.size).toBe(0);
    });

    it('sweeps already-known fresh handles when columns finish loading', async () => {
        handleHarness.fresh['did:plc:one'] = 'fresh.example';
        db.profile = { id: 1, columns: [col('c1', 'did:plc:one', 'old.example')] };

        const { cs, cleanup } = createRealDeckColumnState();
        flushSync();
        await vi.waitFor(() => expect(cs.isColumnsLoaded).toBe(true));

        expect(cs.columns[0].handle).toBe('fresh.example');

        cleanup();
    });

    it('recovers when loadColumns succeeds on retry', async () => {
        db.failGet = true;
        const { cs, cleanup } = createRealDeckColumnState();
        await vi.waitFor(() => expect(cs.loadFailed).toBe(true));

        db.failGet = false;
        db.profile = {
            id: 1,
            columns: [{ id: 'c1', algorithm: { type: 'default' }, data: { feed: [], cursor: '' } }],
        };
        cs.loadColumns();
        expect(cs.loadFailed).toBe(false);

        await vi.waitFor(() => expect(cs.isColumnsLoaded).toBe(true));
        expect(cs.columns).toHaveLength(1);

        cleanup();
    });
});
