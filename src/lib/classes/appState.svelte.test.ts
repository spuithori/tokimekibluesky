import { describe, it, expect, vi, beforeEach } from 'vitest';

const { gotoMock, startResumeMock, db, resumeControls } = vi.hoisted(() => ({
    gotoMock: vi.fn(async () => {}),
    startResumeMock: vi.fn(),
    db: {
        profiles: [] as any[],
        accounts: [] as any[],
    },
    resumeControls: [] as Array<{
        accountId: number;
        account: any;
        callbacks: any;
        resolve: (outcome: any) => void;
        used?: boolean;
    }>,
}));

vi.mock('$app/navigation', () => ({ goto: gotoMock }));
vi.mock('$lib/resumeAccountsSession', () => ({ startAccountsResume: startResumeMock }));
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
            get: vi.fn(async (id: number) => db.accounts.find((a) => a.id === id)),
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
        did: () => 'did:plc:mock',
    };
}

function resumedOutcome(agent = makeAgent()) {
    return { status: 'resumed', agent };
}

function resolveResume(accountId: number, outcome: any) {
    const control = resumeControls.find((c) => c.accountId === accountId && !c.used);
    if (!control) throw new Error(`no pending resume for account ${accountId}`);
    control.used = true;
    control.callbacks?.onStatus?.(control.account, outcome.status);
    control.resolve(outcome);
}

function emitHandle(accountId: number, handle: string) {
    const control = resumeControls.find((c) => c.accountId === accountId && !c.used);
    if (!control) throw new Error(`no pending resume for account ${accountId}`);
    control.callbacks?.onHandle?.(control.account, handle);
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
    resumeControls.length = 0;
    startResumeMock.mockImplementation((accounts: any[], _proxy: any, callbacks: any) => {
        const perAccount = new Map<number, Promise<any>>();
        for (const account of accounts) {
            let resolver!: (outcome: any) => void;
            const promise = new Promise((resolve) => { resolver = resolve; });
            resumeControls.push({ accountId: account.id, account, callbacks, resolve: resolver });
            perAccount.set(account.id, promise);
            callbacks?.onStatus?.(account, 'pending');
        }
        const all = Promise.all([...perAccount.values()]).then(() => new Map());
        return { perAccount, all };
    });
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
        await vi.waitFor(() => expect(startResumeMock).toHaveBeenCalled());

        expect(appState.shellReady).toBe(true);
        expect(appState.ready).toBe(false);
        expect(appState.resumeStatus['did:plc:one'].phase).toBe('pending');
        expect(gotoMock).not.toHaveBeenCalled();

        resolveResume(1, resumedOutcome());
        await boot;

        expect(appState.shellReady).toBe(true);
        expect(appState.ready).toBe(true);
        expect(appState.resumeStatus['did:plc:one'].phase).toBe('resumed');
    });

    it('drops both flags during changeProfile until the new resume resolves', async () => {
        seedSingleProfile();
        db.accounts.push({ id: 2, did: 'did:plc:two' });
        db.profiles.push({ id: 2, accounts: [2], primary: 2, columns: [] });
        const appState = await loadAppState();

        const boot = appState.init();
        await vi.waitFor(() => expect(startResumeMock).toHaveBeenCalled());
        resolveResume(1, resumedOutcome());
        await boot;
        expect(appState.ready).toBe(true);

        appState.changeProfile(2);

        expect(appState.ready).toBe(false);
        expect(appState.shellReady).toBe(false);

        await vi.waitFor(() => expect(startResumeMock).toHaveBeenCalledTimes(2));
        expect(appState.ready).toBe(false);
        expect(appState.shellReady).toBe(false);

        resolveResume(2, resumedOutcome());
        await vi.waitFor(() => expect(appState.ready).toBe(true));
        expect(appState.shellReady).toBe(true);
    });

    it('ignores a stale in-flight init once changeProfile has started a newer one', async () => {
        seedSingleProfile();
        db.accounts.push({ id: 2, did: 'did:plc:two' });
        db.profiles.push({ id: 2, accounts: [2], primary: 2, columns: [] });
        const appState = await loadAppState();

        const firstBoot = appState.init();
        await vi.waitFor(() => expect(startResumeMock).toHaveBeenCalledTimes(1));

        appState.changeProfile(2);
        await vi.waitFor(() => expect(startResumeMock).toHaveBeenCalledTimes(2));

        resolveResume(1, resumedOutcome());
        await firstBoot;

        expect(appState.ready).toBe(false);
        const { agents } = await import('$lib/stores');
        const { get } = await import('svelte/store');
        expect(get(agents as any).size).toBe(0);

        resolveResume(2, resumedOutcome());
        await vi.waitFor(() => expect(appState.ready).toBe(true));
        expect(appState.shellReady).toBe(true);
        expect(get(agents as any).has(2)).toBe(true);
        expect(get(agents as any).has(1)).toBe(false);
    });
});

describe('appState primary-gated progressive resume', () => {
    function seedTwoAccountProfile() {
        db.accounts = [
            { id: 1, did: 'did:plc:one' },
            { id: 2, did: 'did:plc:two' },
        ];
        db.profiles = [{ id: 1, accounts: [1, 2], primary: 1, columns: [] }];
    }

    it('sets ready as soon as the primary resolves while others are still pending', async () => {
        seedTwoAccountProfile();
        const appState = await loadAppState();

        const boot = appState.init();
        await vi.waitFor(() => expect(resumeControls.length).toBe(2));

        resolveResume(1, resumedOutcome());
        await boot;

        expect(appState.ready).toBe(true);
        const { agents } = await import('$lib/stores');
        const { get } = await import('svelte/store');
        expect(get(agents as any).has(1)).toBe(true);
        expect(get(agents as any).has(2)).toBe(false);
        expect(appState.resumeStatus['did:plc:two'].phase).toBe('pending');

        resolveResume(2, resumedOutcome());
        await vi.waitFor(() => expect(get(agents as any).has(2)).toBe(true));
        expect(appState.resumeStatus['did:plc:two'].phase).toBe('resumed');
    });

    it('surfaces an auth-required primary immediately without waiting for other accounts', async () => {
        seedTwoAccountProfile();
        const appState = await loadAppState();

        const boot = appState.init();
        await vi.waitFor(() => expect(resumeControls.length).toBe(2));

        resolveResume(1, { status: 'auth-required' });
        await boot;

        expect(appState.ready).toBe(false);
        expect(appState.shellReady).toBe(true);
        expect(appState.missingAccounts.some((a: any) => a.id === 1)).toBe(true);
    });

    it('never marks an unreachable account as missing (no re-login demand)', async () => {
        seedSingleProfile();
        const appState = await loadAppState();

        const boot = appState.init();
        await vi.waitFor(() => expect(resumeControls.length).toBe(1));

        resolveResume(1, { status: 'unreachable', error: new Error('offline') });
        await boot;

        expect(appState.ready).toBe(false);
        expect(appState.missingAccounts).toHaveLength(0);
        expect(appState.resumeStatus['did:plc:one'].phase).toBe('unreachable');
    });

    it('recovers via retryAccount after the primary was unreachable', async () => {
        seedSingleProfile();
        const appState = await loadAppState();

        const boot = appState.init();
        await vi.waitFor(() => expect(resumeControls.length).toBe(1));
        resolveResume(1, { status: 'unreachable', error: new Error('offline') });
        await boot;
        expect(appState.ready).toBe(false);

        const retry = appState.retryAccount(1);
        await vi.waitFor(() => expect(resumeControls.filter(c => c.accountId === 1).length).toBe(2));
        resolveResume(1, resumedOutcome());
        await retry;

        expect(appState.ready).toBe(true);
        const { agents } = await import('$lib/stores');
        const { get } = await import('svelte/store');
        expect(get(agents as any).has(1)).toBe(true);
    });

    it('captures a preload failure as bootError and recovers on the next init', async () => {
        seedSingleProfile();
        const appState = await loadAppState();
        const { accountsDb } = await import('$lib/db');
        (accountsDb.profiles.toArray as any).mockImplementationOnce(async () => {
            throw new Error('VersionError: requested version is lower');
        });

        await appState.init();

        expect(appState.bootError?.message).toContain('VersionError');
        expect(appState.ready).toBe(false);
        expect(appState.shellReady).toBe(false);

        const boot = appState.init();
        await vi.waitFor(() => expect(resumeControls.length).toBe(1));
        expect(appState.bootError).toBe(null);

        resolveResume(1, resumedOutcome());
        await boot;

        expect(appState.ready).toBe(true);
    });

    it('never marks accounts missing on boot failure', async () => {
        seedSingleProfile();
        const appState = await loadAppState();
        const { accountsDb } = await import('$lib/db');
        (accountsDb.profiles.toArray as any).mockImplementationOnce(async () => {
            throw new Error('boom');
        });

        await appState.init();

        expect(appState.bootError).not.toBe(null);
        expect(appState.missingAccounts).toHaveLength(0);
    });

    it('keeps a refreshed handle across the resumed status update and notifies listeners until unregistered', async () => {
        seedSingleProfile();
        const appState = await loadAppState();
        const seen: Array<[string, string]> = [];
        const unregister = appState.registerHandleListener((did: string, handle: string) => seen.push([did, handle]));

        const boot = appState.init();
        await vi.waitFor(() => expect(resumeControls.length).toBe(1));

        emitHandle(1, 'renamed.example');
        expect(appState.getFreshHandle('did:plc:one')).toBe('renamed.example');
        expect(seen).toEqual([['did:plc:one', 'renamed.example']]);

        unregister();
        emitHandle(1, 'again.example');
        expect(seen).toEqual([['did:plc:one', 'renamed.example']]);
        expect(appState.getFreshHandle('did:plc:one')).toBe('again.example');

        resolveResume(1, resumedOutcome());
        await boot;

        expect(appState.resumeStatus['did:plc:one'].handle).toBe('again.example');
    });

    it('ignores handle updates from a stale epoch', async () => {
        seedSingleProfile();
        db.accounts.push({ id: 2, did: 'did:plc:two' });
        db.profiles.push({ id: 2, accounts: [2], primary: 2, columns: [] });
        const appState = await loadAppState();

        const firstBoot = appState.init();
        await vi.waitFor(() => expect(startResumeMock).toHaveBeenCalledTimes(1));

        appState.changeProfile(2);
        await vi.waitFor(() => expect(startResumeMock).toHaveBeenCalledTimes(2));

        emitHandle(1, 'stale.example');
        expect(appState.getFreshHandle('did:plc:one')).toBeUndefined();

        resolveResume(1, resumedOutcome());
        await firstBoot;
        resolveResume(2, resumedOutcome());
        await vi.waitFor(() => expect(appState.ready).toBe(true));
    });

    it('discards a stale attempt when a retry has superseded it', async () => {
        seedSingleProfile();
        const appState = await loadAppState();

        const boot = appState.init();
        await vi.waitFor(() => expect(resumeControls.length).toBe(1));

        const retry = appState.retryAccount(1);
        await vi.waitFor(() => expect(resumeControls.filter(c => c.accountId === 1).length).toBe(2));

        const staleControl = resumeControls[0];
        staleControl.used = true;
        staleControl.callbacks?.onStatus?.(staleControl.account, 'unreachable');
        staleControl.resolve({ status: 'unreachable', error: new Error('stale') });
        await boot;

        expect(appState.ready).toBe(false);
        expect(appState.resumeStatus['did:plc:one'].phase).toBe('pending');

        resolveResume(1, resumedOutcome());
        await retry;

        expect(appState.ready).toBe(true);
    });
});

describe('pdsRequestReady gating', () => {
    it('stays false while every resume is still pending', async () => {
        seedSingleProfile();
        const appState = await loadAppState();

        const boot = appState.init();
        await vi.waitFor(() => expect(startResumeMock).toHaveBeenCalled());

        expect(appState.pdsRequestReady).toBe(false);

        resolveResume(1, resumedOutcome());
        await boot;
    });

    it('flips true only after the resumed agent is registered in the agents store', async () => {
        seedSingleProfile();
        const appState = await loadAppState();
        const { agents } = await import('$lib/stores');

        const agentInstance = makeAgent();
        let readyWhenAgentRegistered: boolean | undefined;
        const unsubscribe = (agents as any).subscribe((map: Map<number, any>) => {
            if (map.get(1) === agentInstance && readyWhenAgentRegistered === undefined) {
                readyWhenAgentRegistered = appState.pdsRequestReady;
            }
        });

        const boot = appState.init();
        await vi.waitFor(() => expect(startResumeMock).toHaveBeenCalled());

        resolveResume(1, resumedOutcome(agentInstance));
        await boot;

        expect(appState.pdsRequestReady).toBe(true);
        expect(readyWhenAgentRegistered).toBe(false);
        unsubscribe();
    });

    it('opens the gate via a secondary account even when the primary needs re-login', async () => {
        db.accounts = [{ id: 1, did: 'did:plc:one' }, { id: 2, did: 'did:plc:two' }];
        db.profiles = [{ id: 1, accounts: [1, 2], primary: 1, columns: [] }];
        const appState = await loadAppState();

        const boot = appState.init();
        await vi.waitFor(() => expect(resumeControls.length).toBe(2));

        expect(appState.pdsRequestReady).toBe(false);

        resolveResume(1, { status: 'auth-required' });
        expect(appState.pdsRequestReady).toBe(false);

        resolveResume(2, resumedOutcome());
        await vi.waitFor(() => expect(appState.pdsRequestReady).toBe(true));

        await boot.catch(() => {});
    });
});
