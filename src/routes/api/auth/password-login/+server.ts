import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db.js';
import * as cookie from 'cookie';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { identifier, password, service, authFactorToken } = await request.json();

		if (!identifier || !password) {
			return json({ error: 'InvalidRequest', message: 'identifier and password are required' }, { status: 400 });
		}

		const pdsService = service || 'https://bsky.social';

		const body: Record<string, string> = { identifier, password };
		if (authFactorToken) {
			body.authFactorToken = authFactorToken;
		}

		const createSessionRes = await fetch(`${pdsService}/xrpc/com.atproto.server.createSession`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body),
		});

		const sessionData = await createSessionRes.json();

		if (!createSessionRes.ok) {
			return json(
				{
					error: sessionData.error || 'LoginFailed',
					message: sessionData.message || 'Login failed',
				},
				{ status: createSessionRes.status }
			);
		}

		const did = sessionData.did;
		const handle = sessionData.handle;

		const db = await getDb();

		// Store password session
		await db.setPasswordSession(did, {
			accessJwt: sessionData.accessJwt,
			refreshJwt: sessionData.refreshJwt,
			did,
			handle,
			service: pdsService,
		});

		// Create or update user session
		const existingCookies = cookie.parse(request.headers.get('cookie') || '');
		let sessionId = existingCookies['tokimeki_session'];
		let userSession = sessionId ? await db.getUserSession(sessionId) : undefined;

		if (!sessionId || !userSession) {
			sessionId = crypto.randomUUID();
			const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
			await db.setUserSession(sessionId, {
				dids: [did],
				primaryDid: did,
				expiresAt,
			});
		} else {
			const dids = userSession.dids.includes(did)
				? userSession.dids
				: [...userSession.dids, did];
			await db.setUserSession(sessionId, {
				dids,
				primaryDid: userSession.primaryDid,
				expiresAt: userSession.expiresAt,
			});
		}

		cookies.set('tokimeki_session', sessionId, {
			path: '/',
			httpOnly: true,
			secure: request.url.startsWith('https'),
			sameSite: 'lax',
			maxAge: 30 * 24 * 60 * 60,
		});

		return json({ did, handle });
	} catch (error) {
		console.error('Password login error:', error);
		return json(
			{ error: 'LoginFailed', message: error instanceof Error ? error.message : 'Login failed' },
			{ status: 500 }
		);
	}
};
