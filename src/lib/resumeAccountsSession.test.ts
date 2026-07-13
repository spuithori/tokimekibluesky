import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { accountsDbMock, restoreSessionMock } = vi.hoisted(() => ({
    accountsDbMock: {
        accounts: {
            put: vi.fn(async () => 1),
            get: vi.fn(async () => undefined),
            update: vi.fn(async () => 1),
        },
    },
    restoreSessionMock: vi.fn(),
}));

vi.mock('$lib/db', () => ({ accountsDb: accountsDbMock }));
vi.mock('$lib/oauth', () => ({ restoreSession: restoreSessionMock }));
vi.mock('$lib/xrpc-client', () => ({ BSKY_APPVIEW_PROXY: 'did:web:api.bsky.app#bsky_appview' }));
vi.mock('$lib/agent', () => ({
    Agent: class {
        opts: any;
        constructor(opts: any) { this.opts = opts; }
        setHandle(handle: string) { this.opts.handle = handle; }
        did() { return this.opts.did; }
    },
}));

import { startAccountsResume, resumeAccountsSession } from './resumeAccountsSession';

function b64url(obj: Record<string, unknown>): string {
    return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

let jwtSeq = 0;

function fakeJwt(exp = Math.floor(Date.now() / 1000) + 3600): string {
    return `${b64url({ typ: 'JWT', alg: 'HS256' })}.${b64url({ sub: 'did:plc:one', exp, seq: jwtSeq++ })}.sig`;
}

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function installFetch(responder: (url: string) => Response) {
    const calls: string[] = [];
    vi.stubGlobal('fetch', vi.fn(async (input: any) => {
        const url = typeof input === 'string' ? input : input.url ?? String(input);
        calls.push(url);
        return responder(url);
    }));
    return calls;
}

function passwordAccount(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        did: 'did:plc:one',
        service: 'https://pds.example',
        session: {
            did: 'did:plc:one',
            handle: 'one.example',
            accessJwt: fakeJwt(),
            refreshJwt: fakeJwt(),
        },
        isOAuth: false,
        ...overrides,
    } as any;
}

function oauthAccount(overrides: Record<string, unknown> = {}) {
    return {
        id: 2,
        did: 'did:plc:oauth',
        service: 'https://pds.example',
        session: null,
        isOAuth: true,
        ...overrides,
    } as any;
}

function collectStatuses() {
    const events: Array<{ did: string; phase: string; attempt?: number }> = [];
    const handles: Array<{ did: string; handle: string }> = [];
    return {
        events,
        handles,
        callbacks: {
            onStatus: (account: any, phase: string, meta?: any) => {
                events.push({ did: account.did, phase, attempt: meta?.attempt });
            },
            onHandle: (account: any, handle: string) => {
                handles.push({ did: account.did, handle });
            },
        },
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    accountsDbMock.accounts.get.mockResolvedValue(undefined);
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('password account classification', () => {
    it('classifies a null session as auth-required without fetching or sleeping', async () => {
        vi.useFakeTimers();
        const calls = installFetch(() => json({}));
        const { events, callbacks } = collectStatuses();

        const { perAccount } = startAccountsResume([passwordAccount({ session: null })], undefined, callbacks);
        const outcome = await perAccount.get(1)!;

        expect(outcome.status).toBe('auth-required');
        expect(calls).toHaveLength(0);
        expect(events.map(e => e.phase)).toEqual(['pending', 'auth-required']);
    });

    it('classifies a session without refreshJwt as auth-required', async () => {
        installFetch(() => json({}));
        const account = passwordAccount({
            session: { did: 'did:plc:one', handle: 'one.example', accessJwt: fakeJwt(), refreshJwt: undefined },
        });

        const { perAccount } = startAccountsResume([account]);
        const outcome = await perAccount.get(1)!;

        expect(outcome.status).toBe('auth-required');
    });

    it('classifies an ExpiredToken refresh failure as auth-required after a single fetch', async () => {
        const calls = installFetch((url) => {
            if (url.includes('refreshSession')) return json({ error: 'ExpiredToken' }, 400);
            return json({});
        });
        const { events, callbacks } = collectStatuses();
        const account = passwordAccount({
            session: { did: 'did:plc:one', handle: 'one.example', accessJwt: fakeJwt(1), refreshJwt: fakeJwt() },
        });

        const { perAccount } = startAccountsResume([account], undefined, callbacks);
        const outcome = await perAccount.get(1)!;

        expect(outcome.status).toBe('auth-required');
        expect(calls.filter(u => u.includes('refreshSession'))).toHaveLength(1);
        expect(events.map(e => e.phase)).toEqual(['pending', 'auth-required']);
        expect(accountsDbMock.accounts.put).toHaveBeenCalledWith(expect.objectContaining({ session: null }));
    });

    it('classifies AccountTakedown as auth-required without retries', async () => {
        const calls = installFetch((url) => {
            if (url.includes('refreshSession')) return json({ error: 'AccountTakedown' }, 400);
            return json({});
        });
        const account = passwordAccount({
            session: { did: 'did:plc:one', handle: 'one.example', accessJwt: fakeJwt(1), refreshJwt: fakeJwt() },
        });

        const { perAccount } = startAccountsResume([account]);
        const outcome = await perAccount.get(1)!;

        expect(outcome.status).toBe('auth-required');
        expect(calls.filter(u => u.includes('refreshSession'))).toHaveLength(1);
    });

    it('retries network failures with backoff and ends unreachable, never auth-required', async () => {
        vi.useFakeTimers();
        installFetch(() => { throw new TypeError('Failed to fetch'); });
        const { events, callbacks } = collectStatuses();
        const account = passwordAccount({
            session: { did: 'did:plc:one', handle: 'one.example', accessJwt: fakeJwt(1), refreshJwt: fakeJwt() },
        });

        const { perAccount } = startAccountsResume([account], undefined, callbacks);
        const promise = perAccount.get(1)!;
        await vi.runAllTimersAsync();
        const outcome = await promise;

        expect(outcome.status).toBe('unreachable');
        expect(events.map(e => e.phase)).toEqual(['pending', 'retrying', 'retrying', 'retrying', 'unreachable']);
        expect(events.filter(e => e.phase === 'retrying').map(e => e.attempt)).toEqual([1, 2, 3]);
    });

    it('classifies failures as unreachable immediately when offline, without retrying', async () => {
        vi.useFakeTimers();
        installFetch(() => { throw new TypeError('Failed to fetch'); });
        Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
        const { events, callbacks } = collectStatuses();
        const account = passwordAccount({
            session: { did: 'did:plc:one', handle: 'one.example', accessJwt: fakeJwt(1), refreshJwt: fakeJwt() },
        });

        try {
            const { perAccount } = startAccountsResume([account], undefined, callbacks);
            const outcome = await perAccount.get(1)!;

            expect(outcome).toMatchObject({ status: 'unreachable', offline: true });
            expect(events.map(e => e.phase)).toEqual(['pending', 'unreachable']);
        } finally {
            Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
        }
    });

    it('resumes a valid session and returns an agent', async () => {
        installFetch((url) => {
            if (url.includes('refreshSession')) return json({ did: 'did:plc:one', handle: 'one.example', accessJwt: fakeJwt(), refreshJwt: fakeJwt() });
            return json({});
        });
        const { events, callbacks } = collectStatuses();

        const { perAccount } = startAccountsResume([passwordAccount()], undefined, callbacks);
        const outcome = await perAccount.get(1)!;

        expect(outcome.status).toBe('resumed');
        expect((outcome as any).agent).toBeDefined();
        expect(events.map(e => e.phase)).toEqual(['pending', 'resumed']);
    });
});

describe('password handle freshness', () => {
    it('adopts the refreshed handle after a blocking refresh and notifies exactly once', async () => {
        installFetch((url) => {
            if (url.includes('refreshSession')) return json({ did: 'did:plc:one', handle: 'renamed.example', accessJwt: fakeJwt(), refreshJwt: fakeJwt() });
            return json({});
        });
        const { handles, callbacks } = collectStatuses();
        const account = passwordAccount({
            session: { did: 'did:plc:one', handle: 'one.example', accessJwt: fakeJwt(1), refreshJwt: fakeJwt() },
        });

        const { perAccount } = startAccountsResume([account], undefined, callbacks);
        const outcome = await perAccount.get(1)!;

        expect(outcome.status).toBe('resumed');
        expect((outcome as any).agent.opts.handle).toBe('renamed.example');
        expect(handles).toEqual([{ did: 'did:plc:one', handle: 'renamed.example' }]);
    });

    it('never notifies handle.invalid or did-shaped handles', async () => {
        installFetch((url) => {
            if (url.includes('refreshSession')) return json({ did: 'did:plc:one', handle: 'handle.invalid', accessJwt: fakeJwt(), refreshJwt: fakeJwt() });
            return json({});
        });
        const { handles, callbacks } = collectStatuses();
        const account = passwordAccount({
            session: { did: 'did:plc:one', handle: 'one.example', accessJwt: fakeJwt(1), refreshJwt: fakeJwt() },
        });

        const { perAccount } = startAccountsResume([account], undefined, callbacks);
        const outcome = await perAccount.get(1)!;

        expect(outcome.status).toBe('resumed');
        expect(handles).toEqual([]);
    });

    it('notifies when a runtime refresh returns a changed handle', async () => {
        let dataCalls = 0;
        installFetch((url) => {
            if (url.includes('refreshSession')) return json({ did: 'did:plc:one', handle: 'runtime.example', accessJwt: fakeJwt(), refreshJwt: fakeJwt() });
            dataCalls++;
            return dataCalls === 1 ? json({ error: 'ExpiredToken' }, 401) : json({ ok: true });
        });
        const farExp = Math.floor(Date.now() / 1000) + 90 * 24 * 3600;
        const { handles, callbacks } = collectStatuses();
        const account = passwordAccount({
            session: { did: 'did:plc:one', handle: 'one.example', accessJwt: fakeJwt(), refreshJwt: fakeJwt(farExp) },
        });

        const { perAccount } = startAccountsResume([account], undefined, callbacks);
        const outcome = await perAccount.get(1)!;
        expect(handles).toEqual([{ did: 'did:plc:one', handle: 'one.example' }]);

        const res = await (outcome as any).agent.opts.fetchHandler('/xrpc/app.bsky.feed.getTimeline');
        expect(res.ok).toBe(true);
        expect(handles).toEqual([
            { did: 'did:plc:one', handle: 'one.example' },
            { did: 'did:plc:one', handle: 'runtime.example' },
        ]);
        expect((outcome as any).agent.opts.handle).toBe('runtime.example');
    });
});

describe('OAuth account classification', () => {
    it('classifies a missing stored session as auth-required', async () => {
        installFetch(() => json({}));
        restoreSessionMock.mockResolvedValue(null);
        const { events, callbacks } = collectStatuses();

        const { perAccount } = startAccountsResume([oauthAccount()], undefined, callbacks);
        const outcome = await perAccount.get(2)!;

        expect(outcome.status).toBe('auth-required');
        expect(events.map(e => e.phase)).toEqual(['pending', 'auth-required']);
    });

    it('retries unexpected restore errors and ends unreachable', async () => {
        vi.useFakeTimers();
        installFetch(() => json({}));
        restoreSessionMock.mockRejectedValue(new Error('boom'));
        const { events, callbacks } = collectStatuses();

        const { perAccount } = startAccountsResume([oauthAccount()], undefined, callbacks);
        const promise = perAccount.get(2)!;
        await vi.runAllTimersAsync();
        const outcome = await promise;

        expect(outcome.status).toBe('unreachable');
        expect(events.filter(e => e.phase === 'retrying')).toHaveLength(3);
    });

    it('resumes when a stored session is restored', async () => {
        installFetch(() => json({}));
        restoreSessionMock.mockResolvedValue({
            did: 'did:plc:oauth',
            fetchHandler: async () => json({}, 404),
        });

        const { perAccount } = startAccountsResume([oauthAccount()]);
        const outcome = await perAccount.get(2)!;

        expect(outcome.status).toBe('resumed');
        expect((outcome as any).agent.opts.isOAuth).toBe(true);
    });
});

describe('resumeAccountsSession wrapper', () => {
    it('returns a map containing only resumed agents', async () => {
        installFetch((url) => {
            if (url.includes('refreshSession')) return json({ did: 'did:plc:one', handle: 'one.example', accessJwt: fakeJwt(), refreshJwt: fakeJwt() });
            return json({});
        });

        const map = await resumeAccountsSession([
            passwordAccount(),
            passwordAccount({ id: 3, did: 'did:plc:three', session: null }),
        ]);

        expect(map.has(1)).toBe(true);
        expect(map.has(3)).toBe(false);
    });
});
