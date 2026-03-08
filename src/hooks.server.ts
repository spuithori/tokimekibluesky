import type { Handle } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import { getRuntimeCache } from '$lib/server/runtime-cache.js';
import * as cookie from 'cookie';

const USER_SESSION_TTL = 300; // 5 minutes

export const handle: Handle = async ({ event, resolve }) => {
	const cookies = cookie.parse(event.request.headers.get('cookie') || '');
	const sessionId = cookies['tokimeki_session'];

	if (sessionId) {
		try {
			const cache = getRuntimeCache();
			let userSession;

			if (cache) {
				try {
					userSession = await cache.get(`user_session:${sessionId}`) as
						{ dids: string[]; primaryDid: string; expiresAt: string } | null;
				} catch {}
			}

			if (!userSession) {
				const db = await getDb();
				userSession = await db.getUserSession(sessionId);

				if (userSession && cache) {
					try {
						await cache.set(`user_session:${sessionId}`, userSession, {
							ttl: USER_SESSION_TTL,
						});
					} catch {}
				}
			}

			if (userSession) {
				event.locals.user = {
					sessionId,
					dids: userSession.dids,
					primaryDid: userSession.primaryDid
				};
			}
		} catch (e) {
			console.error('Failed to load user session:', e);
		}
	}

	return resolve(event);
};
