import type { OAuthSession, StoredSession } from './types';
import type { DPoPKeyPair } from './dpop';
import { createDPoPProof, computeAth, importKeyPair } from './dpop';
import { OAuthTokenError, refreshToken } from './server';
import { putSession, deleteSession, getSession, putDPoPNonce, getDPoPNonce } from './store';
import { reportPersistFailure } from '$lib/sessionPersistNotice';

const REFRESH_BUFFER = 60_000;

const dirtyFlushes = new Set<() => Promise<void>>();
let globalFlushHooksInstalled = false;

function flushAllDirty() {
    for (const flush of [...dirtyFlushes]) {
        flush().catch(() => {});
    }
}

function installGlobalFlushHooks() {
    if (globalFlushHooksInstalled || typeof window === 'undefined') return;
    globalFlushHooksInstalled = true;

    window.addEventListener('online', flushAllDirty);
    window.addEventListener('pagehide', flushAllDirty);
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            flushAllDirty();
        }
    });
}

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
    let persistDirty = false;

    function clearPersistDirty() {
        persistDirty = false;
        dirtyFlushes.delete(flushPersistDirty);
    }

    async function persistStored(): Promise<void> {
        try {
            await putSession(stored);
            clearPersistDirty();
            return;
        } catch {
        }

        try {
            await putSession(stored);
            clearPersistDirty();
        } catch (error) {
            persistDirty = true;
            dirtyFlushes.add(flushPersistDirty);
            installGlobalFlushHooks();
            reportPersistFailure(stored.did, error);
        }
    }

    async function flushPersistDirty(): Promise<void> {
        if (!persistDirty || sessionDead) {
            clearPersistDirty();
            return;
        }

        const doFlush = async () => {
            if (!persistDirty || sessionDead) {
                clearPersistDirty();
                return;
            }

            const latest = await getSession(stored.did);
            if (latest && latest.expiresAt >= stored.expiresAt) {
                clearPersistDirty();
                return;
            }

            await putSession(stored);
            clearPersistDirty();
        };

        try {
            if (typeof navigator !== 'undefined' && navigator.locks) {
                await navigator.locks.request('oauth-refresh-' + stored.did, doFlush);
            } else {
                await doFlush();
            }
        } catch {
        }
    }

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

    function markDead(): void {
        if (sessionDead) return;
        currentRefreshToken = undefined;
        sessionDead = true;
        clearPersistDirty();
        onExpired?.();
    }

    async function performRefresh(): Promise<void> {
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
                markDead();
                await deleteSession(stored.did).catch(() => {});
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
        await persistStored();
    }

    async function refreshAgainstLatest(): Promise<void> {
        const latest = await getSession(stored.did);
        if (!latest || !latest.refreshToken) {
            markDead();
            throw new Error('Session no longer exists');
        }

        if (latest.refreshToken !== currentRefreshToken) {
            accessToken = latest.accessToken;
            currentRefreshToken = latest.refreshToken;
            expiresAt = latest.expiresAt;
            stored.accessToken = accessToken;
            stored.refreshToken = currentRefreshToken;
            stored.expiresAt = expiresAt;
            return;
        }

        await performRefresh();
    }

    async function doRefresh(): Promise<void> {
        if (typeof navigator !== 'undefined' && navigator.locks) {
            await navigator.locks.request('oauth-refresh-' + stored.did, refreshAgainstLatest);
        } else {
            await refreshAgainstLatest();
        }
    }

    function requestRefresh(): Promise<void> {
        if (!refreshPromise) {
            refreshPromise = doRefresh().finally(() => {
                refreshPromise = null;
            });
        }
        return refreshPromise;
    }

    async function ensureFreshToken(): Promise<void> {
        if (!isExpired()) return;
        return requestRefresh();
    }

    async function fetchHandler(
        input: string | URL | Request,
        init?: RequestInit,
    ): Promise<Response> {
        await ensureFreshToken().catch(() => {});

        if (persistDirty) {
            flushPersistDirty().catch(() => {});
        }

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

        let ath = await computeAth(accessToken);
        const origin = new URL(url).origin;
        let nonce = await getDPoPNonce(origin);
        let didRefresh = false;

        for (let attempt = 0; attempt < 4; attempt++) {
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

                if (!didRefresh && currentRefreshToken) {
                    didRefresh = true;
                    try {
                        await requestRefresh();
                        ath = await computeAth(accessToken);
                        continue;
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
