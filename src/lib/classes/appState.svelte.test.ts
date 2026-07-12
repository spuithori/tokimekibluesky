import { describe, it, expect, vi, beforeEach } from 'vitest';

const { gotoMock, resumeMock, db, resumeResolvers } = vi.hoisted(() => ({
    gotoMock: vi.fn(async () => {}),
    resumeMock: vi.fn(),
    db: {
        profiles: [] as any[],
        accounts: [] as any[],
    },
    resumeResolvers: [] as Array<(map: Map<number, any>) => void>,
}));

vi.mock('$app/navigation', () => ({ goto: gotoMock }));
vi.mock('$lib/resumeAccountsSession', () => ({ resumeAccountsSession: resumeMock }));
vi.mock('$lib/stores', async () => {
    const { writable } = await import('svelte/store');
    return {
        agent: writable(undefined),
        agents: writable(new Map()),
    };
});
vi.mock('$lib/db', () => ({
    accountsDb: {
        profiles: {
            toArray: vi.fn(async () => db.profiles),
            put: vi.fn(async () => 1),
            get: vi.fn(async () => null),
            update: vi.fn(async () => 1),
        },
        accounts: {
            toArray: vi.fn(async () => db.accounts),
            where: () => ({
                anyOf: (ids: number[]) => ({
                    toArray: async () => db.accounts.filter((a) => ids.includes(a.id)),
                }),
            }),
        },
    },
}));

function makeAgent() {
    return {
        configureLabelers: vi.fn(),
        getLabelDefinitions: vi.fn(async () => ({ mock: 'defs' })),
    };
}

async function loadAppState() {
    const mod = await import('$lib/classes/appState.svelte');
    return mod.appState;
}

beforeEach(async () => {
    vi.resetModules();
    vi.clearAllMocks();
    localStorage.clear();
    db.profiles = [];
    db.accounts = [];
    resumeResolvers.length = 0;
    resumeMock.mockImplementation(
        () => new Promise((resolve) => { resumeResolvers.push(resolve); }),
    );
    const { agents, agent } = await import('$lib/stores');
    (agents as any).set(new Map());
    (agent as any).set(undefined);
});

function seedSingleProfile() {
    db.accounts = [{ id: 1, did: 'did:plc:one' }];
    db.profiles = [{ id: 1, accounts: [1], primary: 1, columns: [] }];
}

describe('appState boot gating', () => {
    it('goes straight to /login with zero accounts and never raises shellReady', async () => {
        const appState = await loadAppState();

        await appState.init();

        expect(gotoMock).toHaveBeenCalledWith('/login');
        expect(appState.shellReady).toBe(false);
        expect(appState.ready).toBe(false);
    });

    it('raises shellReady before session resume resolves, ready only after', async () => {
        seedSingleProfile();
        const appState = await loadAppState();

        const boot = appState.init();
        await vi.waitFor(() => expect(resumeMock).toHaveBeenCalled());

        expect(appState.shellReady).toBe(true);
        expect(appState.ready).toBe(false);
        expect(gotoMock).not.toHaveBeenCalled();

        resumeResolvers[0](new Map([[1, makeAgent()]]));
        await boot;

        expect(appState.shellReady).toBe(true);
        expect(appState.ready).toBe(true);
    });

    it('drops both flags during changeProfile until the new resume resolves', async () => {
        seedSingleProfile();
        db.accounts.push({ id: 2, did: 'did:plc:two' });
        db.profiles.push({ id: 2, accounts: [2], primary: 2, columns: [] });
        const appState = await loadAppState();

        const boot = appState.init();
        await vi.waitFor(() => expect(resumeMock).toHaveBeenCalled());
        resumeResolvers[0](new Map([[1, makeAgent()]]));
        await boot;
        expect(appState.ready).toBe(true);

        appState.changeProfile(2);

        expect(appState.ready).toBe(false);
        expect(appState.shellReady).toBe(false);

        await vi.waitFor(() => expect(resumeMock).toHaveBeenCalledTimes(2));
        expect(appState.ready).toBe(false);
        expect(appState.shellReady).toBe(false);

        resumeResolvers[1](new Map([[2, makeAgent()]]));
        await vi.waitFor(() => expect(appState.ready).toBe(true));
        expect(appState.shellReady).toBe(true);
    });

    it('ignores a stale in-flight init once changeProfile has started a newer one', async () => {
        seedSingleProfile();
        db.accounts.push({ id: 2, did: 'did:plc:two' });
        db.profiles.push({ id: 2, accounts: [2], primary: 2, columns: [] });
        const appState = await loadAppState();

        const firstBoot = appState.init();
        await vi.waitFor(() => expect(resumeMock).toHaveBeenCalledTimes(1));

        appState.changeProfile(2);
        await vi.waitFor(() => expect(resumeMock).toHaveBeenCalledTimes(2));

        resumeResolvers[0](new Map([[1, makeAgent()]]));
        await firstBoot;

        expect(appState.ready).toBe(false);
        const { agents } = await import('$lib/stores');
        const { get } = await import('svelte/store');
        expect(get(agents as any).size).toBe(0);

        resumeResolvers[1](new Map([[2, makeAgent()]]));
        await vi.waitFor(() => expect(appState.ready).toBe(true));
        expect(appState.shellReady).toBe(true);
        expect(get(agents as any).has(2)).toBe(true);
        expect(get(agents as any).has(1)).toBe(false);
    });
});
