import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createOAuthSession } from './session';
import { refreshToken } from './server';
import { getSession, getDPoPNonce, putDPoPNonce } from './store';
import { computeAth, createDPoPProof } from './dpop';

const { nonceStore } = vi.hoisted(() => ({ nonceStore: new Map<string, string>() }));

vi.mock('./dpop', () => ({
    importKeyPair: vi.fn(async () => ({})),
    createDPoPProof: vi.fn(async () => 'dpop-proof'),
    computeAth: vi.fn(async () => 'ath'),
}));

vi.mock('./server', () => {
    class OAuthTokenError extends Error {
        error: string;
        constructor(error: string, description?: string) {
            super(description || error);
            this.error = error;
        }
    }
    return { OAuthTokenError, refreshToken: vi.fn() };
});

vi.mock('./store', () => ({
    putSession: vi.fn(async () => {}),
    deleteSession: vi.fn(async () => {}),
    getSession: vi.fn(),
    putDPoPNonce: vi.fn(async (origin: string, nonce: string) => { nonceStore.set(origin, nonce); }),
    getDPoPNonce: vi.fn(async (origin: string) => nonceStore.get(origin)),
}));

vi.mock('$lib/errorLog', () => ({
    recordError: vi.fn(),
}));

beforeEach(() => {
    nonceStore.clear();
    vi.mocked(computeAth).mockImplementation(async () => 'ath');
});

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

const PDS_ORIGIN = 'https://pds.example';

function proofArgs() {
    return vi.mocked(createDPoPProof).mock.calls.map(([args]) => ({ nonce: args.nonce, ath: args.ath }));
}

function stubFetchSequence(responses: Array<() => Response>) {
    const fetchMock = vi.fn(async () => responses[Math.min(fetchMock.mock.calls.length - 1, responses.length - 1)]());
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
}

const ok = (nonce?: string) => () => new Response('{}', { status: 200, headers: nonce ? { 'DPoP-Nonce': nonce } : {} });
const useNonce = (nonce: string) => () => new Response('{}', {
    status: 401,
    headers: { 'WWW-Authenticate': 'DPoP error="use_dpop_nonce"', 'DPoP-Nonce': nonce },
});

function storedSession(overrides: Record<string, unknown> = {}): any {
    return {
        did: 'did:plc:test',
        accessToken: 'old-token',
        refreshToken: 'r1',
        expiresAt: Date.now() + 3600_000,
        dpopKeyJwk: {},
        pdsUrl: 'https://pds.example',
        serverMetadata: { issuer: 'https://as.example' },
        ...overrides,
    };
}

describe('OAuth session fetchHandler', () => {
    it('handles a DPoP nonce challenge after a mid-request token refresh', async () => {
        const stored = storedSession();
        vi.mocked(getSession).mockResolvedValue({ ...stored });
        vi.mocked(refreshToken).mockResolvedValue({ access_token: 'new-token', refresh_token: 'r2', expires_in: 3600 } as any);

        const responses = [
            () => new Response('{}', { status: 401, headers: { 'WWW-Authenticate': 'DPoP error="invalid_token"' } }),
            () => new Response('{}', { status: 401, headers: { 'WWW-Authenticate': 'DPoP error="use_dpop_nonce"', 'DPoP-Nonce': 'n1' } }),
            () => new Response('{}', { status: 200 }),
        ];
        const authHeaders: string[] = [];
        vi.stubGlobal('fetch', vi.fn(async (_url: any, init?: RequestInit) => {
            authHeaders.push(new Headers(init?.headers).get('Authorization') ?? '');
            return responses[Math.min(authHeaders.length - 1, responses.length - 1)]();
        }));

        const session = createOAuthSession(stored, 'client-id');
        const res = await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');

        expect(res.status).toBe(200);
        expect(vi.mocked(refreshToken)).toHaveBeenCalledTimes(1);
        expect(authHeaders).toHaveLength(3);
        expect(authHeaders[2]).toBe('DPoP new-token');
    });

    it('refreshes only once per request even after a nonce retry', async () => {
        const stored = storedSession();
        vi.mocked(getSession).mockResolvedValue({ ...stored });
        vi.mocked(refreshToken).mockResolvedValue({ access_token: 'new-token', refresh_token: 'r2', expires_in: 3600 } as any);

        vi.stubGlobal('fetch', vi.fn(async () =>
            new Response('{}', { status: 401, headers: { 'WWW-Authenticate': 'DPoP error="invalid_token"' } }),
        ));

        const session = createOAuthSession(stored, 'client-id');
        const res = await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');

        expect(res.status).toBe(401);
        expect(vi.mocked(refreshToken)).toHaveBeenCalledTimes(1);
    });

    it('refreshes on an invalid_token challenge using the Bearer scheme', async () => {
        const stored = storedSession();
        vi.mocked(getSession).mockResolvedValue({ ...stored });
        vi.mocked(refreshToken).mockResolvedValue({ access_token: 'new-token', refresh_token: 'r2', expires_in: 3600 } as any);

        stubFetchSequence([
            () => new Response('{}', { status: 401, headers: { 'WWW-Authenticate': 'Bearer error="invalid_token"' } }),
            ok(),
        ]);

        const session = createOAuthSession(stored, 'client-id');
        const res = await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');

        expect(res.status).toBe(200);
        expect(vi.mocked(refreshToken)).toHaveBeenCalledTimes(1);
    });

    it('never rotates the refresh token on a 401 that does not challenge the access token', async () => {
        const stored = storedSession();
        vi.mocked(getSession).mockResolvedValue({ ...stored });

        const upstreamRejections = [
            () => new Response('{"error":"AuthenticationRequired"}', { status: 401 }),
            () => new Response('{}', { status: 401, headers: { 'WWW-Authenticate': 'DPoP error="insufficient_scope"' } }),
            () => new Response('{}', { status: 401, headers: { 'WWW-Authenticate': 'Basic error="invalid_token"' } }),
        ];

        for (const rejection of upstreamRejections) {
            const fetchMock = stubFetchSequence([rejection]);
            const session = createOAuthSession(stored, 'client-id');
            const res = await session.fetchHandler('/xrpc/app.bsky.feed.getFeed');

            expect(res.status).toBe(401);
            expect(fetchMock).toHaveBeenCalledTimes(1);
        }

        expect(vi.mocked(refreshToken)).not.toHaveBeenCalled();
        expect(stored.refreshToken).toBe('r1');
    });
});

describe('OAuth session refresh coordination', () => {
    it('adopts a rotated stored session instead of refreshing over the network', async () => {
        const stored = storedSession({ expiresAt: Date.now() - 1000 });
        vi.mocked(getSession).mockResolvedValue(storedSession({
            accessToken: 'rotated-token',
            refreshToken: 'r2',
            expiresAt: Date.now() + 3600_000,
        }));

        const session = createOAuthSession(stored, 'client-id');
        await session.ensureValid();

        expect(vi.mocked(refreshToken)).not.toHaveBeenCalled();
    });
});

describe('OAuth session invalid_grant resilience', () => {
    it('adopts a newer stored token instead of dying when invalid_grant races another writer', async () => {
        const stored = storedSession({ expiresAt: Date.now() - 1000 });
        vi.mocked(getSession)
            .mockResolvedValueOnce({ ...stored })
            .mockResolvedValueOnce(storedSession({
                accessToken: 'a9',
                refreshToken: 'r9',
                expiresAt: Date.now() + 3600_000,
            }));
        const { OAuthTokenError } = await import('./server');
        vi.mocked(refreshToken).mockRejectedValue(new (OAuthTokenError as any)('invalid_grant'));

        const onExpired = vi.fn();
        const session = createOAuthSession(stored, 'client-id', undefined, onExpired);
        await session.ensureValid();

        expect(session.dead).toBe(false);
        expect(onExpired).not.toHaveBeenCalled();
        const { deleteSession } = await import('./store');
        expect(vi.mocked(deleteSession)).not.toHaveBeenCalled();
        expect(vi.mocked(refreshToken)).toHaveBeenCalledTimes(1);
        expect(stored.refreshToken).toBe('r9');
    });

    it('kills the session only when invalid_grant is confirmed against the stored token', async () => {
        const stored = storedSession({ expiresAt: Date.now() - 1000 });
        vi.mocked(getSession).mockResolvedValue({ ...stored });
        const { OAuthTokenError } = await import('./server');
        vi.mocked(refreshToken).mockRejectedValue(new (OAuthTokenError as any)('invalid_grant'));

        const onExpired = vi.fn();
        const session = createOAuthSession(stored, 'client-id', undefined, onExpired);
        await expect(session.ensureValid()).rejects.toThrow();

        expect(session.dead).toBe(true);
        expect(onExpired).toHaveBeenCalledTimes(1);
        const { deleteSession } = await import('./store');
        expect(vi.mocked(deleteSession)).toHaveBeenCalledWith('did:plc:test');
        const { recordError } = await import('$lib/errorLog');
        expect(vi.mocked(recordError)).toHaveBeenCalled();
    });

    it('does not kill the session when the store read comes back empty', async () => {
        const stored = storedSession({ expiresAt: Date.now() - 1000 });
        vi.mocked(getSession).mockResolvedValue(undefined);
        vi.mocked(refreshToken).mockResolvedValue({ access_token: 'a2', refresh_token: 'r2', expires_in: 3600 } as any);

        const onExpired = vi.fn();
        const session = createOAuthSession(stored, 'client-id', undefined, onExpired);
        await session.ensureValid();

        expect(session.dead).toBe(false);
        expect(onExpired).not.toHaveBeenCalled();
        expect(vi.mocked(refreshToken)).toHaveBeenCalledTimes(1);
        const { putSession } = await import('./store');
        expect(vi.mocked(putSession)).toHaveBeenCalled();
        expect(stored.refreshToken).toBe('r2');
    });
});

describe('OAuth session persist resilience', () => {
    it('keeps the refresh usable when persisting rotated tokens fails, then flushes on a later call', async () => {
        const stored = storedSession({ expiresAt: Date.now() - 1000 });
        vi.mocked(getSession).mockResolvedValue({ ...stored });
        vi.mocked(refreshToken).mockResolvedValue({ access_token: 'new-token', refresh_token: 'r2', expires_in: 3600 } as any);
        const { putSession } = await import('./store');
        vi.mocked(putSession)
            .mockRejectedValueOnce(new Error('quota'))
            .mockRejectedValueOnce(new Error('quota'));
        vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));

        const session = createOAuthSession(stored, 'client-id');
        const res = await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');

        expect(res.status).toBe(200);
        expect(session.dead).toBe(false);

        await vi.waitFor(() => expect(vi.mocked(putSession).mock.calls.length).toBeGreaterThanOrEqual(3));
    });

    it('never flushes over a newer session persisted by another tab', async () => {
        const stored = storedSession({ expiresAt: Date.now() - 1000 });
        vi.mocked(getSession).mockResolvedValue({ ...stored });
        vi.mocked(refreshToken).mockResolvedValue({ access_token: 'new-token', refresh_token: 'r2', expires_in: 3600 } as any);
        const { putSession } = await import('./store');
        vi.mocked(putSession)
            .mockRejectedValueOnce(new Error('quota'))
            .mockRejectedValueOnce(new Error('quota'))
            .mockRejectedValueOnce(new Error('quota'));
        vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 200 })));

        const session = createOAuthSession(stored, 'client-id');
        await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');
        await vi.waitFor(() => expect(vi.mocked(putSession).mock.calls.length).toBe(3));

        vi.mocked(getSession).mockResolvedValue(storedSession({
            refreshToken: 'r9',
            expiresAt: Date.now() + 24 * 3600_000,
        }));

        await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');
        await new Promise(resolve => setTimeout(resolve, 0));
        await new Promise(resolve => setTimeout(resolve, 0));

        expect(vi.mocked(putSession).mock.calls.length).toBe(3);
    });
});

describe('OAuth session DPoP nonce equivalence', () => {
    it('retries once with the fresh nonce when the stored nonce is stale, without touching refresh', async () => {
        nonceStore.set(PDS_ORIGIN, 'n1');
        const stored = storedSession();
        const fetchMock = stubFetchSequence([useNonce('n2'), ok('n2')]);

        const session = createOAuthSession(stored, 'client-id');
        const res = await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');

        expect(res.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(proofArgs().map(p => p.nonce)).toEqual(['n1', 'n2']);
        expect(vi.mocked(refreshToken)).not.toHaveBeenCalled();
        expect(session.dead).toBe(false);
        expect(nonceStore.get(PDS_ORIGIN)).toBe('n2');
    });

    it('carries the nonce received on one request into the next request without a retry', async () => {
        const stored = storedSession();
        const fetchMock = stubFetchSequence([ok('n1'), ok('n1')]);

        const session = createOAuthSession(stored, 'client-id');
        await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');
        await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(proofArgs().map(p => p.nonce)).toEqual([undefined, 'n1']);
        expect(vi.mocked(refreshToken)).not.toHaveBeenCalled();
    });

    it('gives up after four nonce challenges without refreshing or killing the session', async () => {
        const stored = storedSession();
        const fetchMock = stubFetchSequence([useNonce('n1'), useNonce('n2'), useNonce('n3'), useNonce('n4')]);

        const session = createOAuthSession(stored, 'client-id');
        await expect(session.fetchHandler('/xrpc/app.bsky.feed.getTimeline')).rejects.toThrow('DPoP nonce retry exhausted');

        expect(fetchMock).toHaveBeenCalledTimes(4);
        expect(proofArgs().map(p => p.nonce)).toEqual([undefined, 'n1', 'n2', 'n3']);
        expect(vi.mocked(refreshToken)).not.toHaveBeenCalled();
        expect(session.dead).toBe(false);
    });

    it('sends no nonce and writes nothing when the server never issues one', async () => {
        const stored = storedSession();
        const fetchMock = stubFetchSequence([ok(), ok()]);

        const session = createOAuthSession(stored, 'client-id');
        await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');
        await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');

        expect(fetchMock).toHaveBeenCalledTimes(2);
        expect(proofArgs().map(p => p.nonce)).toEqual([undefined, undefined]);
        expect(vi.mocked(putDPoPNonce)).not.toHaveBeenCalled();
    });

    it('signs the retry after a refresh with the ath of the new access token', async () => {
        vi.mocked(computeAth).mockImplementation(async (token: string) => `ath:${token}`);
        const stored = storedSession();
        vi.mocked(getSession).mockResolvedValue({ ...stored });
        vi.mocked(refreshToken).mockResolvedValue({ access_token: 'new-token', refresh_token: 'r2', expires_in: 3600 } as any);
        stubFetchSequence([
            () => new Response('{}', { status: 401, headers: { 'WWW-Authenticate': 'DPoP error="invalid_token"' } }),
            ok(),
        ]);

        const session = createOAuthSession(stored, 'client-id');
        const res = await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');

        expect(res.status).toBe(200);
        expect(proofArgs().map(p => p.ath)).toEqual(['ath:old-token', 'ath:new-token']);
        expect(vi.mocked(refreshToken)).toHaveBeenCalledTimes(1);
    });

    it('signs with the adopted token when another tab rotated the session first', async () => {
        vi.mocked(computeAth).mockImplementation(async (token: string) => `ath:${token}`);
        const stored = storedSession({ expiresAt: Date.now() - 1000 });
        vi.mocked(getSession).mockResolvedValue(storedSession({
            accessToken: 'tab-b-token',
            refreshToken: 'r9',
            expiresAt: Date.now() + 3600_000,
        }));
        stubFetchSequence([ok()]);

        const session = createOAuthSession(stored, 'client-id');
        const res = await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');

        expect(res.status).toBe(200);
        expect(proofArgs().map(p => p.ath)).toEqual(['ath:tab-b-token']);
        expect(vi.mocked(refreshToken)).not.toHaveBeenCalled();
    });
});

describe('OAuth session DPoP hot-path cost', () => {
    it('reads the stored nonce at most once per origin across sequential requests', async () => {
        nonceStore.set(PDS_ORIGIN, 'n1');
        const stored = storedSession();
        stubFetchSequence([ok('n1')]);

        const session = createOAuthSession(stored, 'client-id');
        await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');
        await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');
        await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');

        expect(vi.mocked(getDPoPNonce)).toHaveBeenCalledTimes(1);
        expect(proofArgs().map(p => p.nonce)).toEqual(['n1', 'n1', 'n1']);
    });

    it('reads the stored nonce once even when the first requests run in parallel', async () => {
        nonceStore.set(PDS_ORIGIN, 'n1');
        const stored = storedSession();
        stubFetchSequence([ok('n1')]);

        const session = createOAuthSession(stored, 'client-id');
        await Promise.all([
            session.fetchHandler('/xrpc/app.bsky.feed.getTimeline'),
            session.fetchHandler('/xrpc/app.bsky.notification.getUnreadCount'),
            session.fetchHandler('/xrpc/app.bsky.actor.getProfile'),
        ]);

        expect(vi.mocked(getDPoPNonce)).toHaveBeenCalledTimes(1);
        expect(vi.mocked(computeAth)).toHaveBeenCalledTimes(1);
        expect(proofArgs().map(p => p.nonce)).toEqual(['n1', 'n1', 'n1']);
    });

    it('writes the nonce only when the server rotates it', async () => {
        const stored = storedSession();
        stubFetchSequence([ok('n1'), ok('n1'), ok('n2')]);

        const session = createOAuthSession(stored, 'client-id');
        await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');
        await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');
        await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');

        expect(vi.mocked(putDPoPNonce).mock.calls).toEqual([[PDS_ORIGIN, 'n1'], [PDS_ORIGIN, 'n2']]);
        expect(nonceStore.get(PDS_ORIGIN)).toBe('n2');
    });

    it('computes ath only when the access token changes', async () => {
        vi.mocked(computeAth).mockImplementation(async (token: string) => `ath:${token}`);
        const stored = storedSession();
        vi.mocked(getSession).mockResolvedValue({ ...stored });
        vi.mocked(refreshToken).mockResolvedValue({ access_token: 'new-token', refresh_token: 'r2', expires_in: 3600 } as any);
        stubFetchSequence([
            ok(),
            ok(),
            () => new Response('{}', { status: 401, headers: { 'WWW-Authenticate': 'DPoP error="invalid_token"' } }),
            ok(),
            ok(),
        ]);

        const session = createOAuthSession(stored, 'client-id');
        await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');
        await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');
        await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');
        await session.fetchHandler('/xrpc/app.bsky.feed.getTimeline');

        expect(vi.mocked(computeAth).mock.calls.map(([token]) => token)).toEqual(['old-token', 'new-token']);
        expect(proofArgs().map(p => p.ath)).toEqual([
            'ath:old-token', 'ath:old-token', 'ath:old-token', 'ath:new-token', 'ath:new-token',
        ]);
    });
});
