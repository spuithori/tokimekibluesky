import type { OAuthSession, OAuthServerMetadata, StoredSession, ClientMetadata } from './types';
import { generateDPoPKeyPair, exportKeyPair, importKeyPair } from './dpop';
import { resolveFromHandle } from './resolver';
import { pushAuthorizationRequest, exchangeCode, revokeToken } from './server';
import {
    getSession,
    putSession,
    deleteSession,
    getState,
    putState,
    deleteState,
    cleanupExpiredStates,
} from './store';
import { createOAuthSession } from './session';

/**
 * Generate PKCE code verifier and challenge.
 */
async function generatePKCE(): Promise<{ codeVerifier: string; codeChallenge: string }> {
    const buffer = new Uint8Array(32);
    crypto.getRandomValues(buffer);
    const codeVerifier = base64url(buffer);

    const encoder = new TextEncoder();
    const digest = await crypto.subtle.digest('SHA-256', encoder.encode(codeVerifier));
    const codeChallenge = base64url(new Uint8Array(digest));

    return { codeVerifier, codeChallenge };
}

function base64url(bytes: Uint8Array): string {
    const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export interface OAuthClientOptions {
    clientId: string;
    redirectUri: string;
    scope: string;
    fetch?: typeof fetch;
}

export class OAuthClient {
    private clientId: string;
    private redirectUri: string;
    private scope: string;
    private fetchFn: typeof fetch;

    constructor(options: OAuthClientOptions) {
        this.clientId = options.clientId;
        this.redirectUri = options.redirectUri;
        this.scope = options.scope;
        this.fetchFn = options.fetch || globalThis.fetch.bind(globalThis);
    }

    /**
     * Initialize: check for OAuth callback or restore existing session.
     * Returns a session if found (either from callback or stored).
     */
    async init(callbackUrl?: string): Promise<{ session: OAuthSession; state?: string } | null> {
        // Clean up expired states
        cleanupExpiredStates().catch(() => {});

        // Check if this is a callback
        const url = callbackUrl ? new URL(callbackUrl) : new URL(window.location.href);
        const code = url.searchParams.get('code');
        const state = url.searchParams.get('state');
        const iss = url.searchParams.get('iss');

        if (code && state) {
            const session = await this.handleCallback(code, state, iss);
            if (session) {
                return { session, state };
            }
        }

        return null;
    }

    /**
     * Start the sign-in flow: resolve handle → PAR → redirect.
     */
    async signIn(handle: string): Promise<void> {
        const { did, pdsUrl, serverMetadata } = await resolveFromHandle(handle);

        const dpopKeyPair = await generateDPoPKeyPair();
        const { codeVerifier, codeChallenge } = await generatePKCE();
        const state = crypto.randomUUID();

        const { requestUri } = await pushAuthorizationRequest(
            serverMetadata,
            {
                clientId: this.clientId,
                redirectUri: this.redirectUri,
                codeChallenge,
                scope: this.scope,
                state,
                loginHint: handle,
            },
            dpopKeyPair,
            this.fetchFn,
        );

        // Save state for callback
        const exportedKey = await exportKeyPair(dpopKeyPair);
        await putState({
            state,
            codeVerifier,
            dpopKeyJwk: exportedKey,
            serverMetadata,
            redirectUri: this.redirectUri,
            pdsUrl,
            timestamp: Date.now(),
        });

        // Redirect to authorization endpoint
        const authUrl = new URL(serverMetadata.authorization_endpoint);
        authUrl.searchParams.set('request_uri', requestUri);
        authUrl.searchParams.set('client_id', this.clientId);
        window.location.href = authUrl.toString();
    }

    /**
     * Handle the OAuth callback: exchange code for tokens, create session.
     */
    private async handleCallback(
        code: string,
        state: string,
        iss: string | null,
    ): Promise<OAuthSession | null> {
        const storedState = await getState(state);
        if (!storedState) {
            console.error('OAuth callback: state not found');
            return null;
        }

        // Clean up state
        await deleteState(state);

        // Validate issuer if present
        if (iss && iss !== storedState.serverMetadata.issuer) {
            console.error('OAuth callback: issuer mismatch');
            return null;
        }

        const dpopKeyPair = await importKeyPair(storedState.dpopKeyJwk);

        const tokenRes = await exchangeCode(
            storedState.serverMetadata,
            {
                code,
                codeVerifier: storedState.codeVerifier,
                redirectUri: storedState.redirectUri,
                clientId: this.clientId,
            },
            dpopKeyPair,
            this.fetchFn,
        );

        const stored: StoredSession = {
            did: tokenRes.sub,
            accessToken: tokenRes.access_token,
            refreshToken: tokenRes.refresh_token,
            tokenType: tokenRes.token_type,
            scope: tokenRes.scope,
            expiresAt: Date.now() + (tokenRes.expires_in || 3600) * 1000,
            dpopKeyJwk: storedState.dpopKeyJwk,
            serverMetadata: storedState.serverMetadata,
            pdsUrl: storedState.pdsUrl,
        };

        await putSession(stored);

        return createOAuthSession(stored, this.clientId, this.fetchFn);
    }

    /**
     * Restore a session from IndexedDB.
     */
    async restore(did: string, onExpired?: () => void): Promise<(OAuthSession & { ensureValid: () => Promise<void>; dead: boolean }) | null> {
        const stored = await getSession(did);
        if (!stored) return null;

        return createOAuthSession(stored, this.clientId, this.fetchFn, onExpired);
    }

    /**
     * Revoke a session and remove from storage.
     */
    async revoke(did: string): Promise<void> {
        const stored = await getSession(did);
        if (stored?.refreshToken) {
            await revokeToken(stored.serverMetadata, stored.refreshToken, this.fetchFn);
        }
        await deleteSession(did);
    }
}
