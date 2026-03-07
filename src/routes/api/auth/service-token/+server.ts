import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOAuthClient } from '$lib/server/oauth-client.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	if (!locals.user) {
		throw error(401, 'Not authenticated');
	}

	try {
		const { aud, lxm, exp, did: requestDid } = await request.json();
		const did = requestDid || locals.user.primaryDid;

		if (!locals.user.dids.includes(did)) {
			throw error(403, 'DID not in session');
		}

		const oauthClient = await getOAuthClient();
		const session = await oauthClient.restore(did);

		const path = `/xrpc/com.atproto.server.getServiceAuth?aud=${encodeURIComponent(aud)}&lxm=${encodeURIComponent(lxm)}${exp ? `&exp=${exp}` : ''}`;
		const response = await session.fetchHandler(path, { method: 'GET' });

		if (!response.ok) {
			throw new Error(`Service auth failed: ${response.status}`);
		}

		const data = await response.json();
		return json({ token: data.token });
	} catch (e) {
		if ((e as any)?.status) throw e;
		console.error('Service token error:', e);
		return json(
			{ error: e instanceof Error ? e.message : 'Failed to get service token' },
			{ status: 500 }
		);
	}
};
