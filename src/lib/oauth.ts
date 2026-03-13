import { OAuthClient } from './oauth/client';
import { createConfidentialFetch } from './oauth/confidential-fetch';
import type { OAuthSession } from './oauth/types';

const SCOPE = 'atproto transition:generic transition:chat.bsky';

function isLocalhost(): boolean {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
}

function getLoopbackClientId(): string {
    const port = window.location.port || '5173';
    const redirectUri = `http://127.0.0.1:${port}/oauth/callback`;
    return `http://localhost?redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(SCOPE)}`;
}

function getClientId(): string {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/oauth-client-metadata.json`;
}

function getRedirectUri(): string {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/oauth/callback`;
}

let oauthClient: OAuthClient | null = null;

function getOAuthClient(): OAuthClient {
    if (oauthClient) return oauthClient;

    if (isLocalhost()) {
        oauthClient = new OAuthClient({
            clientId: getLoopbackClientId(),
            redirectUri: `http://127.0.0.1:${window.location.port || '5173'}/oauth/callback`,
            scope: SCOPE,
        });
    } else {
        const confidentialFetch = createConfidentialFetch('/api/oauth/client-assertion');
        oauthClient = new OAuthClient({
            clientId: getClientId(),
            redirectUri: getRedirectUri(),
            scope: SCOPE,
            fetch: confidentialFetch,
        });
    }

    return oauthClient;
}

export async function initOAuth(): Promise<{
    session: OAuthSession | null;
    state: string | null;
}> {
    const client = getOAuthClient();

    try {
        const result = await client.init();
        if (result?.session) {
            return {
                session: result.session,
                state: result.state ?? null,
            };
        }
    } catch (error) {
        console.error('OAuth init error:', error);
    }

    return {
        session: null,
        state: null,
    };
}

export async function signIn(handle: string): Promise<void> {
    const client = getOAuthClient();
    await client.signIn(handle);
}

export async function restoreSession(did: string, onExpired?: () => void): Promise<OAuthSession | null> {
    const client = getOAuthClient();
    try {
        const session = await client.restore(did, onExpired);
        if (!session) return null;
        try {
            await session.ensureValid();
        } catch {
            if (session.dead) {
                return null;
            }
            console.warn('OAuth token refresh failed during restore, will retry on next API call');
        }
        return session;
    } catch {
        return null;
    }
}

export async function signOut(did: string): Promise<void> {
    const client = getOAuthClient();

    try {
        await client.revoke(did);
    } catch (error) {
        console.error('Failed to sign out:', error);
    }
}

export type { OAuthSession };
