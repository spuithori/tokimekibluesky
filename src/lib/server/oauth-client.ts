import { NodeOAuthClient, requestLocalLock } from '@atproto/oauth-client-node';
import { JoseKey } from '@atproto/jwk-jose';
import { env } from '$env/dynamic/private';
import { getDb } from './db.js';
import { DbSessionStore, DbStateStore } from './oauth-stores.js';
import { CachedSessionStore } from './cached-session-store.js';

let client: NodeOAuthClient | null = null;
let clientPromise: Promise<NodeOAuthClient> | null = null;

function getOrigin(): string {
	if (env.ORIGIN) return env.ORIGIN;
	if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
	return 'http://127.0.0.1:5173';
}

function isLoopback(origin: string): boolean {
	try {
		const url = new URL(origin);
		return url.protocol === 'http:' && (url.hostname === '127.0.0.1' || url.hostname === 'localhost');
	} catch {
		return false;
	}
}

export async function getOAuthClient(): Promise<NodeOAuthClient> {
	if (client) return client;
	if (clientPromise) return clientPromise;

	clientPromise = (async () => {
		const db = await getDb();
		const origin = getOrigin();
		const loopback = isLoopback(origin);

		let clientMetadata: any;
		let keyset: any[] | undefined;

		if (loopback) {
			// Development: loopback client (public, no private key needed)
			const redirectUri = `http://127.0.0.1:${new URL(origin).port || '5173'}/api/auth/callback`;
			clientMetadata = {
				client_id: `http://localhost?redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent('atproto transition:generic transition:chat.bsky')}`,
				client_name: 'TOKIMEKI (dev)',
				client_uri: origin,
				redirect_uris: [redirectUri],
				scope: 'atproto transition:generic transition:chat.bsky',
				grant_types: ['authorization_code', 'refresh_token'],
				response_types: ['code'],
				token_endpoint_auth_method: 'none',
				application_type: 'web',
				dpop_bound_access_tokens: true,
			};
		} else {
			// Production: confidential client with private_key_jwt
			const privateKeyJwk = env.OAUTH_PRIVATE_KEY_JWK;
			if (!privateKeyJwk) {
				throw new Error('OAUTH_PRIVATE_KEY_JWK environment variable is not set');
			}

			const key = await JoseKey.fromImportable(privateKeyJwk);
			keyset = [key];
			clientMetadata = {
				client_id: `${origin}/oauth-client-metadata.json`,
				client_name: 'TOKIMEKI',
				client_uri: origin,
				logo_uri: 'https://tokimeki.blue/pwa-512x512.png',
				tos_uri: 'https://docs.tokimeki.blue/ja',
				policy_uri: 'https://docs.tokimeki.blue/ja',
				redirect_uris: [`${origin}/api/auth/callback`],
				scope: 'atproto transition:generic transition:chat.bsky',
				grant_types: ['authorization_code', 'refresh_token'],
				response_types: ['code'],
				token_endpoint_auth_method: 'private_key_jwt',
				token_endpoint_auth_signing_alg: 'ES256',
				application_type: 'web',
				dpop_bound_access_tokens: true,
				jwks_uri: `${origin}/oauth/jwks`
			};
		}

		client = new NodeOAuthClient({
			clientMetadata,
			...(keyset ? { keyset } : {}),
			requestLock: requestLocalLock,
			stateStore: new DbStateStore(db),
			sessionStore: new CachedSessionStore(new DbSessionStore(db))
		});

		return client;
	})();

	return clientPromise;
}

export async function getPublicJwks(): Promise<{ keys: any[] }> {
	const privateKeyJwk = env.OAUTH_PRIVATE_KEY_JWK;
	if (!privateKeyJwk) {
		return { keys: [] };
	}

	const jwk = typeof privateKeyJwk === 'string' ? JSON.parse(privateKeyJwk) : privateKeyJwk;
	// Return public key only (remove private component 'd')
	const { d, ...publicJwk } = jwk;
	return { keys: [publicJwk] };
}
