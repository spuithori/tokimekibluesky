import type { Handle } from '@sveltejs/kit';
import { getDb } from '$lib/server/db.js';
import * as cookie from 'cookie';

export const handle: Handle = async ({ event, resolve }) => {
	const cookies = cookie.parse(event.request.headers.get('cookie') || '');
	const sessionId = cookies['tokimeki_session'];

	if (sessionId) {
		try {
			const db = await getDb();
			const userSession = await db.getUserSession(sessionId);
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
