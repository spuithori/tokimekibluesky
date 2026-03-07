import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOAuthClient } from '$lib/server/oauth-client.js';

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
	const oauthClient = await getOAuthClient();
	try {
		return await oauthClient.restore(did);
	} catch (e) {
		throw error(401, 'No session found for DID');
	}
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
