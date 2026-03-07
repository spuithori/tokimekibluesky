import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOAuthClient } from '$lib/server/oauth-client.js';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.user) {
		return json({ valid: [], invalid: [] });
	}

	const oauthClient = await getOAuthClient();
	const results = await Promise.allSettled(
		locals.user.dids.map(async (did) => {
			await oauthClient.restore(did);
			return did;
		})
	);

	const valid: string[] = [];
	const invalid: string[] = [];
	for (let i = 0; i < results.length; i++) {
		const result = results[i];
		if (result.status === 'fulfilled') {
			valid.push(result.value);
		} else {
			invalid.push(locals.user.dids[i]);
		}
	}

	return json({ valid, invalid });
};
