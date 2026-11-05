import { describe, expect, it, vi } from 'vitest';
import { fetchMochottAuthorization } from '$lib/chotto/mochottApi';

function agentReturning(body: unknown) {
    const get = vi.fn(async () => body);
    return { agent: { xrpc: { get } }, get };
}

describe('fetchMochottAuthorization', () => {
    it('ユーザーの PDS から mochott へ中継して問い合わせる', async () => {
        const { agent, get } = agentReturning({ authorized: true, authorizeUrl: 'https://mochott.site/oauth/login' });
        expect(await fetchMochottAuthorization(agent)).toEqual({ authorized: true });
        expect(get).toHaveBeenCalledWith('site.mochott.account.getAuthorization', { display: 'popup' }, { headers: { 'atproto-proxy': 'did:web:mochott.site#mochott_appview' } });
    });

    it('未連携なら mochott が返したログインの URL を使う', async () => {
        const authorizeUrl = 'https://mochott.site/oauth/login?handle=did%3Aplc%3Axxxx&returnTo=%2Fdashboard';
        const { agent } = agentReturning({ authorized: false, authorizeUrl });
        expect(await fetchMochottAuthorization(agent)).toEqual({ authorized: false, authorizeUrl });
    });

    it('mochott 以外の URL や形の違う応答は受け付けない', async () => {
        await expect(fetchMochottAuthorization(agentReturning({ authorized: false, authorizeUrl: 'https://evil.example/oauth/login' }).agent)).rejects.toThrow();
        await expect(fetchMochottAuthorization(agentReturning({ authorized: false }).agent)).rejects.toThrow();
        await expect(fetchMochottAuthorization(agentReturning({}).agent)).rejects.toThrow();
    });
});
