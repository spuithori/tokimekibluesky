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
