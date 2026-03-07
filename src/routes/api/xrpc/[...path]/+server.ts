import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOAuthClient } from '$lib/server/oauth-client.js';
import { getDb } from '$lib/server/db.js';

const CHAT_PROXY = 'did:web:api.bsky.chat#bsky_chat';
const TOKIMEKI_PROXY = 'did:web:api.tokimeki.tech#tokimeki_api';

function getProxyHeader(nsid: string, customProxy?: string): string | undefined {
	if (customProxy) return customProxy;
	if (nsid.startsWith('chat.bsky.')) return CHAT_PROXY;
	if (nsid.startsWith('tech.tokimeki.')) return TOKIMEKI_PROXY;
	return undefined;
}

interface SessionHandler {
	fetchHandler(path: string, init: RequestInit): Promise<Response>;
}

async function getSession(did: string): Promise<SessionHandler> {
	// Try OAuth session first
	try {
		const oauthClient = await getOAuthClient();
		const session = await oauthClient.restore(did);
		if (session) return session;
	} catch {
		// Fall through to password session
	}

	// Try password session
	const db = await getDb();
	const pwSession = await db.getPasswordSession(did);
	if (!pwSession) {
		throw error(401, 'No session found for DID');
	}

	return {
		async fetchHandler(path: string, init: RequestInit): Promise<Response> {
			const url = pwSession.service + path;
			const headers = new Headers(init.headers);
			headers.set('Authorization', `Bearer ${pwSession.accessJwt}`);

			let response = await fetch(url, { ...init, headers });

			// Token refresh on 401
			if (response.status === 401) {
				try {
					const refreshRes = await fetch(
						`${pwSession.service}/xrpc/com.atproto.server.refreshSession`,
						{
							method: 'POST',
							headers: { 'Authorization': `Bearer ${pwSession.refreshJwt}` },
						}
					);

					if (refreshRes.ok) {
						const newTokens = await refreshRes.json();
						await db.setPasswordSession(did, {
							...pwSession,
							accessJwt: newTokens.accessJwt,
							refreshJwt: newTokens.refreshJwt,
						});

						headers.set('Authorization', `Bearer ${newTokens.accessJwt}`);
						response = await fetch(url, { ...init, headers });
					}
				} catch (e) {
					console.error('Token refresh failed:', e);
				}
			}

			return response;
		},
	};
}

async function handleXrpc(
	{ params, url, request, locals }: { params: { path: string }; url: URL; request: Request; locals: App.Locals },
	method: 'GET' | 'POST'
) {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	const nsid = params.path;
	const searchParams = new URLSearchParams(url.search);

	const did = searchParams.get('_did') || locals.user.primaryDid;
	const customProxy = searchParams.get('_proxy') || undefined;
	const lang = searchParams.get('_lang') || undefined;

	searchParams.delete('_did');
	searchParams.delete('_proxy');
	searchParams.delete('_lang');
	searchParams.delete('_moderate');
	searchParams.delete('_moderationPrefs');
	searchParams.delete('_labelers');

	if (!locals.user.dids.includes(did)) {
		throw error(403, 'DID not in session');
	}

	const session = await getSession(did);

	const proxyHeader = getProxyHeader(nsid, customProxy);

	const headers: Record<string, string> = {};
	if (proxyHeader) headers['atproto-proxy'] = proxyHeader;
	if (lang) headers['Accept-Language'] = lang;

	let xrpcPath = `/xrpc/${nsid}`;
	const qs = searchParams.toString();
	if (qs) xrpcPath += `?${qs}`;

	let fetchInit: RequestInit;

	if (method === 'GET') {
		fetchInit = { method: 'GET', headers };
	} else {
		const contentType = request.headers.get('content-type') || 'application/json';
		headers['Content-Type'] = contentType;

		let body: ArrayBuffer | string;
		if (contentType.includes('application/json')) {
			body = await request.text();
		} else {
			body = await request.arrayBuffer();
		}

		fetchInit = { method: 'POST', headers, body };
	}

	const response = await session.fetchHandler(xrpcPath, fetchInit);

	const responseContentType = response.headers.get('content-type') || '';
	const responseBody = responseContentType.includes('application/json')
		? await response.text()
		: await response.arrayBuffer();

	return new Response(responseBody, {
		status: response.status,
		headers: {
			'Content-Type': responseContentType
		}
	});
}

export const GET: RequestHandler = async (event) => {
	return handleXrpc(event, 'GET');
};

export const POST: RequestHandler = async (event) => {
	return handleXrpc(event, 'POST');
};
