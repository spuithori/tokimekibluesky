import { BrowserOAuthClient, type OAuthSession } from '@atproto/oauth-client-browser';
import { createConfidentialBrowserClient } from './oauth/confidential-browser-client';

const HANDLE_RESOLVER = 'https://bsky.social';

function getLoopbackClientId(): string {
    const port = window.location.port || '5173';
    const redirectUri = `http://127.0.0.1:${port}/oauth/callback`;
    const scope = 'atproto transition:generic transition:chat.bsky';
    return `http://localhost?redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;
}

function isLocalhost(): boolean {
    if (typeof window === 'undefined') return false;
    const hostname = window.location.hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1';
}

function getClientId(): string {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/oauth-client-metadata.json`;
}

let oauthClient: BrowserOAuthClient | null = null;
let oauthClientPromise: Promise<BrowserOAuthClient> | null = null;

export async function getOAuthClient(): Promise<BrowserOAuthClient> {
    if (oauthClient) {
        return oauthClient;
    }

    if (oauthClientPromise) {
        return oauthClientPromise;
    }

    if (isLocalhost()) {
        oauthClientPromise = BrowserOAuthClient.load({
            clientId: getLoopbackClientId(),
            handleResolver: HANDLE_RESOLVER,
        }).then(client => {
            oauthClient = client;
            return client;
        });
    } else {
        oauthClientPromise = createConfidentialBrowserClient({
            clientId: getClientId(),
            handleResolver: HANDLE_RESOLVER,
            clientAssertionEndpoint: '/api/oauth/client-assertion',
        }).then(client => {
            oauthClient = client;
            return client;
        });
    }

    return oauthClientPromise;
}

export async function initOAuth(): Promise<{
    session: OAuthSession | null;
    state: string | null;
}> {
    const client = await getOAuthClient();

    try {
        const result = await client.init();
        if (result?.session) {
            return {
                session: result.session,
                state: 'state' in result ? result.state ?? null : null,
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
    const client = await getOAuthClient();
    await client.signInRedirect(handle, {});
}

export async function restoreSession(did: string): Promise<OAuthSession | null> {
    const client = await getOAuthClient();
    try {
        return await client.restore(did);
    } catch {
        return null;
    }
}

export async function signOut(did: string): Promise<void> {
    const client = await getOAuthClient();

    try {
        await client.revoke(did);
    } catch (error) {
        console.error('Failed to sign out:', error);
    }
}

export type { OAuthSession };
