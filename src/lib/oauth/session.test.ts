import { describe, it, expect, vi, afterEach } from 'vitest';
import { createOAuthSession } from './session';
import { refreshToken } from './server';
import { getSession } from './store';

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
    putDPoPNonce: vi.fn(async () => {}),
    getDPoPNonce: vi.fn(async () => undefined),
}));

vi.mock('$lib/errorLog', () => ({
    recordError: vi.fn(),
}));

afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
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
