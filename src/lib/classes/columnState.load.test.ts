import { describe, it, expect, vi, beforeEach } from 'vitest';

const { db } = vi.hoisted(() => ({
    db: {
        profile: null as any,
        failGet: false,
        updates: [] as any[],
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
    appState: { profile: { current: 1 }, labelDefs: { current: [] } },
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
});

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
