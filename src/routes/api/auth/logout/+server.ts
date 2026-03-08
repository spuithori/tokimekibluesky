import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOAuthClient } from '$lib/server/oauth-client.js';
import { getDb } from '$lib/server/db.js';
import { getRuntimeCache } from '$lib/server/runtime-cache.js';

export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { did } = await request.json();
		if (!did || typeof did !== 'string') {
			return json({ error: 'did is required' }, { status: 400 });
		}

		if (!locals.user) {
			return json({ error: 'Not authenticated' }, { status: 401 });
		}

		if (!locals.user.dids.includes(did)) {
			return json({ error: 'DID not in session' }, { status: 403 });
		}

		const db = await getDb();

		// Try revoking OAuth session
		try {
			const oauthClient = await getOAuthClient();
			const session = await oauthClient.restore(did);
			if (session) {
				await session.signOut();
			}
		} catch (e) {
			console.warn('Failed to revoke OAuth session:', e);
		}

		const remainingDids = locals.user.dids.filter((d) => d !== did);

		if (remainingDids.length === 0) {
			await db.deleteUserSession(locals.user.sessionId);
		} else {
			const newPrimary = locals.user.primaryDid === did ? remainingDids[0] : locals.user.primaryDid;
			await db.setUserSession(locals.user.sessionId, {
				dids: remainingDids,
				primaryDid: newPrimary,
				expiresAt: new Date('9999-12-31T23:59:59.999Z').toISOString()
			});
		}

		const cache = getRuntimeCache();
		if (cache) {
			try {
				await cache.delete(`user_session:${locals.user.sessionId}`);
			} catch {}
		}

		return json({ ok: true });
	} catch (error) {
		console.error('Logout error:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Logout failed' },
			{ status: 500 }
		);
	}
};
