import { describe, it, expect, vi, afterEach } from 'vitest';
import { PasswordSession, type SessionData } from './password-session';

afterEach(() => {
    vi.unstubAllGlobals();
});

function b64url(obj: Record<string, unknown>): string {
    return btoa(JSON.stringify(obj)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

let jwtSeq = 0;

function fakeJwt(exp = Math.floor(Date.now() / 1000) + 3600): string {
    return `${b64url({ typ: 'JWT', alg: 'HS256' })}.${b64url({ sub: 'did:plc:test', exp, seq: jwtSeq++ })}.sig`;
}

function sessionData(): SessionData {
    return {
        did: 'did:plc:test',
        handle: 'test.example',
        accessJwt: fakeJwt(),
        refreshJwt: fakeJwt(),
    } as SessionData;
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

async function loggedIn(opts: Partial<ConstructorParameters<typeof PasswordSession>[0]> = {}) {
    const session = new PasswordSession({ service: 'https://pds.example', ...opts });
    await session.login({ identifier: 'test.example', password: 'pw' });
    return session;
}

describe('PasswordSession fetchHandler 401 handling', () => {
    it('does not refresh on a 401 that names a non-token error', async () => {
        const calls = installFetch((url) => {
            if (url.includes('createSession')) return json(sessionData());
            return json({ error: 'AuthenticationRequired', message: 'auth required' }, 401);
        });
        const session = await loggedIn();
        const res = await session.createFetchHandler()('/xrpc/app.bsky.feed.getTimeline');

        expect(res.status).toBe(401);
        expect(calls.filter(u => u.includes('refreshSession'))).toHaveLength(0);
    });

    it('refreshes and retries on a 401 with ExpiredToken', async () => {
        let dataCalls = 0;
        const calls = installFetch((url) => {
            if (url.includes('createSession')) return json(sessionData());
            if (url.includes('refreshSession')) return json(sessionData());
            dataCalls++;
            return dataCalls === 1 ? json({ error: 'ExpiredToken' }, 401) : json({ ok: true });
        });
        const session = await loggedIn();
        const res = await session.createFetchHandler()('/xrpc/app.bsky.feed.getTimeline');

        expect(res.ok).toBe(true);
        expect(calls.filter(u => u.includes('refreshSession'))).toHaveLength(1);
    });

    it('still treats a body-less 401 as expired', async () => {
        let dataCalls = 0;
        const calls = installFetch((url) => {
            if (url.includes('createSession')) return json(sessionData());
            if (url.includes('refreshSession')) return json(sessionData());
            dataCalls++;
            return dataCalls === 1 ? new Response('', { status: 401 }) : json({ ok: true });
        });
        const session = await loggedIn();
        const res = await session.createFetchHandler()('/xrpc/app.bsky.feed.getTimeline');

        expect(res.ok).toBe(true);
        expect(calls.filter(u => u.includes('refreshSession'))).toHaveLength(1);
    });
});

describe('PasswordSession refresh coordination without Web Locks', () => {
    it('adopts a rotated session from storage instead of refreshing over the network', async () => {
        const rotated = { ...sessionData(), refreshJwt: 'rotated-refresh-token' };
        const calls = installFetch((url) => {
            if (url.includes('createSession')) return json(sessionData());
            return json({ error: 'ShouldNotBeCalled' }, 500);
        });
        const session = await loggedIn({ loadLatestSession: async () => rotated });
        await session.refreshSession();

        expect(session.session?.refreshJwt).toBe('rotated-refresh-token');
        expect(calls.filter(u => u.includes('refreshSession'))).toHaveLength(0);
    });
});
