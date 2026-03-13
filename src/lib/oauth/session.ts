import type { OAuthSession, StoredSession } from './types';
import type { DPoPKeyPair } from './dpop';
import { createDPoPProof, computeAth, importKeyPair } from './dpop';
import { OAuthTokenError, refreshToken } from './server';
import { putSession, putDPoPNonce, getDPoPNonce } from './store';

const REFRESH_BUFFER = 60_000;

export function createOAuthSession(
    stored: StoredSession,
    clientId: string,
    fetchFn: typeof fetch = globalThis.fetch,
    onExpired?: () => void,
): OAuthSession & { _stored: StoredSession; ensureValid: () => Promise<void>; dead: boolean } {
    let accessToken = stored.accessToken;
    let currentRefreshToken = stored.refreshToken;
    let expiresAt = stored.expiresAt;
    let dpopKeyPair: DPoPKeyPair | null = null;
    let refreshPromise: Promise<void> | null = null;
    let sessionDead = false;

    const keyPairPromise = importKeyPair(stored.dpopKeyJwk);

    async function getKeyPair(): Promise<DPoPKeyPair> {
        if (!dpopKeyPair) {
            dpopKeyPair = await keyPairPromise;
        }
        return dpopKeyPair;
    }

    function isExpired(): boolean {
        return Date.now() >= expiresAt - REFRESH_BUFFER;
    }

    async function doRefresh(): Promise<void> {
        if (!currentRefreshToken) {
            throw new Error('No refresh token available');
        }

        let tokenRes;
        try {
            const keyPair = await getKeyPair();
            tokenRes = await refreshToken(
                stored.serverMetadata,
                { refreshToken: currentRefreshToken, clientId },
                keyPair,
                fetchFn,
            );
        } catch (e) {
            if (e instanceof OAuthTokenError && e.error === 'invalid_grant') {
                currentRefreshToken = undefined;
                sessionDead = true;
                onExpired?.();
            }
            throw e;
        }

        accessToken = tokenRes.access_token;
        if (tokenRes.refresh_token) {
            currentRefreshToken = tokenRes.refresh_token;
        }
        expiresAt = Date.now() + (tokenRes.expires_in || 3600) * 1000;

        stored.accessToken = accessToken;
        stored.refreshToken = currentRefreshToken;
        stored.expiresAt = expiresAt;
        await putSession(stored);
    }

    async function ensureFreshToken(): Promise<void> {
        if (!isExpired()) return;

        if (!refreshPromise) {
            refreshPromise = doRefresh().finally(() => {
                refreshPromise = null;
            });
        }
        return refreshPromise;
    }

    async function fetchHandler(
        input: string | URL | Request,
        init?: RequestInit,
    ): Promise<Response> {
        await ensureFreshToken().catch(() => {});

        const keyPair = await getKeyPair();

        let url: string;
        let method: string;

        if (typeof input === 'string') {
            url = input.startsWith('http') ? input : `${stored.pdsUrl}${input}`;
            method = init?.method || 'GET';
        } else if (input instanceof URL) {
            url = input.toString();
            method = init?.method || 'GET';
        } else {
            url = input.url;
            method = input.method;
        }

        const ath = await computeAth(accessToken);
        const origin = new URL(url).origin;
        let nonce = await getDPoPNonce(origin);

        for (let attempt = 0; attempt < 3; attempt++) {
            const dpopProof = await createDPoPProof({
                keyPair,
                htm: method,
                htu: url,
                nonce: nonce || undefined,
                ath,
            });

            const headers = new Headers(init?.headers);
            headers.set('Authorization', `DPoP ${accessToken}`);
            headers.set('DPoP', dpopProof);

            const res = await fetch(url, {
                ...init,
                method,
                headers,
            });

            const responseNonce = res.headers.get('DPoP-Nonce');
            if (responseNonce) {
                nonce = responseNonce;
                await putDPoPNonce(origin, responseNonce);
            }

            if (res.status === 401) {
                const wwwAuth = res.headers.get('WWW-Authenticate') || '';

                if (wwwAuth.includes('use_dpop_nonce') && responseNonce) {
                    continue;
                }

                if (attempt === 0 && currentRefreshToken) {
                    try {
                        await doRefresh();
                        const newAth = await computeAth(accessToken);
                        const newProof = await createDPoPProof({
                            keyPair,
                            htm: method,
                            htu: url,
                            nonce: nonce || undefined,
                            ath: newAth,
                        });
                        const retryHeaders = new Headers(init?.headers);
                        retryHeaders.set('Authorization', `DPoP ${accessToken}`);
                        retryHeaders.set('DPoP', newProof);
                        return fetch(url, { ...init, method, headers: retryHeaders });
                    } catch {
                        return res;
                    }
                }
            }

            return res;
        }

        throw new Error('DPoP nonce retry exhausted');
    }

    return {
        did: stored.did,
        fetchHandler,
        _stored: stored,
        ensureValid: ensureFreshToken,
        get dead() { return sessionDead; },
    };
}
