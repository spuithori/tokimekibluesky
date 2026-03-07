import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPublicJwks } from '$lib/server/oauth-client.js';

export const GET: RequestHandler = async () => {
	const jwks = await getPublicJwks();

	return json(jwks, {
		headers: {
			'Cache-Control': 'public, max-age=86400, s-maxage=86400',
			'Content-Type': 'application/json'
		}
	});
};
