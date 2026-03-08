import { getOAuthClient } from './oauth-client.js';

export async function prefetchTimeline(did: string): Promise<{ feed: any[]; cursor?: string } | null> {
	try {
		const oauthClient = await getOAuthClient();
		const session = await oauthClient.restore(did);
		if (!session) return null;

		const res = await session.fetchHandler(
			'/xrpc/app.bsky.feed.getTimeline?limit=20',
			{ method: 'GET', headers: {} }
		);
		if (!res.ok) return null;

		const data = await res.json();
		return { feed: data.feed, cursor: data.cursor };
	} catch (e) {
		console.warn('Timeline prefetch failed:', e);
		return null;
	}
}
