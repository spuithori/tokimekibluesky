import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOAuthClient } from '$lib/server/oauth-client.js';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const { handle } = await request.json();
		if (!handle || typeof handle !== 'string') {
			return json({ error: 'handle is required' }, { status: 400 });
		}

		const oauthClient = await getOAuthClient();
		const url = await oauthClient.authorize(handle, { scope: 'atproto transition:generic transition:chat.bsky' });

		return json({ url: url.toString() });
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		const stack = error instanceof Error ? error.stack : undefined;
		console.error('Login error message:', msg);
		if (stack) console.error('Login error stack:', stack);
		return json(
			{ error: msg || 'Login failed' },
			{ status: 500 }
		);
	}
};
