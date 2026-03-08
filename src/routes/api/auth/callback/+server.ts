import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getOAuthClient } from '$lib/server/oauth-client.js';
import { getDb } from '$lib/server/db.js';
import * as cookie from 'cookie';

export const GET: RequestHandler = async ({ url, request, cookies }) => {
	try {
		const oauthClient = await getOAuthClient();
		const params = new URLSearchParams(url.search);

		const { session } = await oauthClient.callback(params);
		const did = session.did;

		let handle: string | undefined;
		let avatar: string | undefined;
		let displayName: string | undefined;

		// Fetch profile using the OAuth session's fetchHandler
		try {
			const res = await session.fetchHandler('/xrpc/app.bsky.actor.getProfile?actor=' + encodeURIComponent(did), {
				method: 'GET',
				headers: {},
			});
			if (res.ok) {
				const profile = await res.json();
				handle = profile.handle;
				avatar = profile.avatar;
				displayName = profile.displayName;
			}
		} catch (e) {
			console.warn('Failed to fetch profile for OAuth account:', e);
		}

		const db = await getDb();

		const existingCookies = cookie.parse(request.headers.get('cookie') || '');
		let sessionId = existingCookies['tokimeki_session'];
		let userSession = sessionId ? await db.getUserSession(sessionId) : undefined;

		const newAccount = { did, handle, avatar, displayName };

		if (!sessionId || !userSession) {
			sessionId = crypto.randomUUID();
			const expiresAt = new Date('9999-12-31T23:59:59.999Z').toISOString();
			await db.setUserSession(sessionId, {
				dids: [did],
				primaryDid: did,
				expiresAt,
				accounts: [newAccount]
			});
		} else {
			const dids = userSession.dids.includes(did)
				? userSession.dids
				: [...userSession.dids, did];
			const existingAccounts = (userSession.accounts || []).filter(a => a.did !== did);
			await db.setUserSession(sessionId, {
				dids,
				primaryDid: userSession.primaryDid,
				expiresAt: userSession.expiresAt,
				accounts: [...existingAccounts, newAccount]
			});
		}

		cookies.set('tokimeki_session', sessionId, {
			path: '/',
			httpOnly: true,
			secure: url.protocol === 'https:',
			sameSite: 'lax',
			maxAge: 10 * 365 * 24 * 60 * 60
		});

		const callbackParams = new URLSearchParams();
		callbackParams.set('new_did', did);
		if (handle) callbackParams.set('handle', handle);
		if (avatar) callbackParams.set('avatar', avatar);
		if (displayName) callbackParams.set('name', displayName);

		redirect(302, `/oauth/callback?${callbackParams.toString()}`);
	} catch (error) {
		if ((error as any)?.status === 302) throw error;

		const msg = error instanceof Error ? error.message : String(error);
		console.error('OAuth callback error:', msg);
		const errorMessage = encodeURIComponent(msg);
		redirect(302, `/oauth/callback?error=${errorMessage}`);
	}
};
