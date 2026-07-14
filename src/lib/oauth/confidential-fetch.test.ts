import { describe, it, expect, vi } from 'vitest';
import { createConfidentialFetch } from './confidential-fetch';

const ASSERTION_ENDPOINT = '/api/oauth/client-assertion';
const TOKEN_URL = 'https://as.example/oauth/token';

function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function tokenRequestInit(): RequestInit {
    return {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', DPoP: 'dpop-proof' },
        body: 'grant_type=refresh_token&refresh_token=abc',
    };
}

function setup(assertionResponses: Array<() => Response>) {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    let assertionCall = 0;
    const originalFetch = vi.fn(async (input: any, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
        calls.push({ url, init });
        if (url === ASSERTION_ENDPOINT) {
            const responder = assertionResponses[Math.min(assertionCall, assertionResponses.length - 1)];
            assertionCall++;
            return responder();
        }
        return json({});
    });
    const confidentialFetch = createConfidentialFetch(ASSERTION_ENDPOINT, originalFetch as typeof fetch);
    return { confidentialFetch, calls };
}

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
});
