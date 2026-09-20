import { describe, it, expect, vi, afterEach } from 'vitest';
import { createConfidentialFetch } from './confidential-fetch';
import { refreshToken } from './server';

vi.mock('./dpop', () => ({
    createDPoPProof: vi.fn(async ({ nonce }: { nonce?: string }) => `dpop-proof-${nonce ?? 'none'}`),
}));

vi.mock('./store', () => ({
    getDPoPNonce: vi.fn(async () => 'stale-nonce'),
    putDPoPNonce: vi.fn(async () => {}),
}));

const ASSERTION_ENDPOINT = '/api/oauth/client-assertion';
const TOKEN_URL = 'https://as.example/oauth/token';

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function tokenRequestInit(body = 'grant_type=refresh_token&refresh_token=abc'): RequestInit {
    return {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', DPoP: 'dpop-proof' },
        body,
    };
}

const useDpopNonce = () => json({ error: 'use_dpop_nonce' }, 400);

function numberedAssertions() {
    let issued = 0;
    return [() => json({ jwt: `assertion-${++issued}` })];
}

function setup(assertionResponses: Array<() => Response>, tokenResponses: Array<() => Response> = [() => json({})]) {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    let assertionCall = 0;
    let tokenCall = 0;
    const originalFetch = vi.fn(async (input: any, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        calls.push({ url, init });
        if (url === ASSERTION_ENDPOINT) {
            const responder = assertionResponses[Math.min(assertionCall, assertionResponses.length - 1)];
            assertionCall++;
            return responder();
        }
        const responder = tokenResponses[Math.min(tokenCall, tokenResponses.length - 1)];
        tokenCall++;
        return responder();
    });
    const confidentialFetch = createConfidentialFetch(ASSERTION_ENDPOINT, originalFetch as typeof fetch);
    return { confidentialFetch, calls };
}

function assertionsSent(calls: Array<{ url: string; init?: RequestInit }>): Array<string | null> {
    return calls
        .filter(c => c.url === TOKEN_URL)
        .map(c => new URLSearchParams(String(c.init?.body)).get('client_assertion'));
}

afterEach(() => {
    vi.useRealTimers();
});

describe('createConfidentialFetch', () => {
    it('injects a client assertion into token requests', async () => {
        const { confidentialFetch, calls } = setup([() => json({ jwt: 'assertion-jwt' })]);
        await confidentialFetch(TOKEN_URL, tokenRequestInit());

        const tokenCall = calls.find(c => c.url === TOKEN_URL);
        const body = String(tokenCall?.init?.body);
        expect(body).toContain('client_assertion=assertion-jwt');
        expect(body).toContain('client_assertion_type=');
        expect(calls.filter(c => c.url === ASSERTION_ENDPOINT)).toHaveLength(1);
    });

    it('retries the assertion request once on failure', async () => {
        const { confidentialFetch, calls } = setup([
            () => json({ error: 'cold start' }, 500),
            () => json({ jwt: 'assertion-jwt' }),
        ]);
        await confidentialFetch(TOKEN_URL, tokenRequestInit());

        expect(calls.filter(c => c.url === ASSERTION_ENDPOINT)).toHaveLength(2);
        const tokenCall = calls.find(c => c.url === TOKEN_URL);
        expect(String(tokenCall?.init?.body)).toContain('client_assertion=assertion-jwt');
    });

    it('fails closed when the assertion backend stays down instead of sending an unauthenticated token request', async () => {
        const { confidentialFetch, calls } = setup([() => json({ error: 'down' }, 500)]);
        await expect(confidentialFetch(TOKEN_URL, tokenRequestInit())).rejects.toThrow();

        expect(calls.filter(c => c.url === ASSERTION_ENDPOINT)).toHaveLength(2);
        expect(calls.find(c => c.url === TOKEN_URL)).toBeUndefined();
    });

    it('forwards the abort signal on authenticated token requests', async () => {
        const { confidentialFetch, calls } = setup([() => json({ jwt: 'assertion-jwt' })]);
        const controller = new AbortController();
        await confidentialFetch(TOKEN_URL, { ...tokenRequestInit(), signal: controller.signal });

        const tokenCall = calls.find(c => c.url === TOKEN_URL);
        expect(tokenCall?.init?.signal).toBe(controller.signal);
    });

    it('passes non-token requests through untouched', async () => {
        const { confidentialFetch, calls } = setup([() => json({ jwt: 'assertion-jwt' })]);
        await confidentialFetch('https://pds.example/xrpc/app.bsky.feed.getTimeline', { method: 'GET' });

        expect(calls.filter(c => c.url === ASSERTION_ENDPOINT)).toHaveLength(0);
        expect(calls).toHaveLength(1);
    });

    it('reuses the assertion for the retry when the token endpoint only asked for a DPoP nonce', async () => {
        const { confidentialFetch, calls } = setup(numberedAssertions(), [useDpopNonce, () => json({})]);
        await confidentialFetch(TOKEN_URL, tokenRequestInit());
        await confidentialFetch(TOKEN_URL, tokenRequestInit());

        expect(calls.filter(c => c.url === ASSERTION_ENDPOINT)).toHaveLength(1);
        expect(assertionsSent(calls)).toEqual(['assertion-1', 'assertion-1']);
    });

    it('never reuses an assertion the token endpoint may have consumed', async () => {
        const { confidentialFetch, calls } = setup(numberedAssertions(), [
            () => json({}),
            () => json({ error: 'server_error' }, 500),
            () => json({}),
        ]);
        await confidentialFetch(TOKEN_URL, tokenRequestInit());
        await confidentialFetch(TOKEN_URL, tokenRequestInit());
        await confidentialFetch(TOKEN_URL, tokenRequestInit());

        expect(assertionsSent(calls)).toEqual(['assertion-1', 'assertion-2', 'assertion-3']);
    });

    it('keeps nonce retries of parallel sessions apart', async () => {
        const { confidentialFetch, calls } = setup(numberedAssertions(), [useDpopNonce, useDpopNonce, () => json({})]);
        const first = tokenRequestInit('grant_type=refresh_token&refresh_token=first');
        const second = tokenRequestInit('grant_type=refresh_token&refresh_token=second');
        await confidentialFetch(TOKEN_URL, first);
        await confidentialFetch(TOKEN_URL, second);
        await confidentialFetch(TOKEN_URL, second);
        await confidentialFetch(TOKEN_URL, first);

        expect(assertionsSent(calls)).toEqual(['assertion-1', 'assertion-2', 'assertion-2', 'assertion-1']);
    });

    it('requests a new assertion once the unconsumed one has aged', async () => {
        vi.useFakeTimers();
        const { confidentialFetch, calls } = setup(numberedAssertions(), [useDpopNonce, () => json({})]);
        await confidentialFetch(TOKEN_URL, tokenRequestInit());
        vi.advanceTimersByTime(31_000);
        await confidentialFetch(TOKEN_URL, tokenRequestInit());

        expect(assertionsSent(calls)).toEqual(['assertion-1', 'assertion-2']);
    });

    it('only reuses assertions for refresh grants', async () => {
        const { confidentialFetch, calls } = setup(numberedAssertions(), [useDpopNonce, () => json({})]);
        const codeExchange = tokenRequestInit('grant_type=authorization_code&code=abc');
        await confidentialFetch(TOKEN_URL, codeExchange);
        await confidentialFetch(TOKEN_URL, codeExchange);

        expect(assertionsSent(calls)).toEqual(['assertion-1', 'assertion-2']);
    });

    it('turns the rejection of a reused assertion into a retryable error and starts over with a new one', async () => {
        const { confidentialFetch, calls } = setup(numberedAssertions(), [
            useDpopNonce,
            () => json({ error: 'invalid_grant', error_description: 'private_key_jwt jti reused' }, 400),
            () => json({}),
        ]);
        await confidentialFetch(TOKEN_URL, tokenRequestInit());
        await expect(confidentialFetch(TOKEN_URL, tokenRequestInit())).rejects.toThrow('Client assertion reuse rejected');
        const res = await confidentialFetch(TOKEN_URL, tokenRequestInit());

        expect(res.ok).toBe(true);
        expect(assertionsSent(calls)).toEqual(['assertion-1', 'assertion-1', 'assertion-2']);
    });

    it('spends a single assertion on a refresh that has to renew its DPoP nonce', async () => {
        const { confidentialFetch, calls } = setup(numberedAssertions(), [
            () => new Response(JSON.stringify({ error: 'use_dpop_nonce' }), { status: 400, headers: { 'DPoP-Nonce': 'fresh-nonce' } }),
            () => json({ access_token: 'new-token', refresh_token: 'r2', expires_in: 3600 }),
        ]);

        const tokens = await refreshToken(
            { token_endpoint: TOKEN_URL } as any,
            { refreshToken: 'r1', clientId: 'client-id' },
            {} as any,
            confidentialFetch,
        );

        expect(tokens.refresh_token).toBe('r2');
        expect(calls.filter(c => c.url === ASSERTION_ENDPOINT)).toHaveLength(1);
        expect(assertionsSent(calls)).toEqual(['assertion-1', 'assertion-1']);
        const proofs = calls.filter(c => c.url === TOKEN_URL).map(c => new Headers(c.init?.headers).get('DPoP'));
        expect(proofs).toEqual(['dpop-proof-stale-nonce', 'dpop-proof-fresh-nonce']);
    });
});
