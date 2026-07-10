import { describe, it, expect } from 'vitest';
import { XrpcClient, BSKY_APPVIEW_PROXY } from './xrpc-client';

function createClient(proxy?: string) {
	const captured: Array<Record<string, string>> = [];
	const client = new XrpcClient(async (_input, init) => {
		captured.push((init?.headers ?? {}) as Record<string, string>);
		return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } });
	}, proxy);
	return { client, captured };
}

describe('XrpcClient atproto-proxy', () => {
	it('adds the default AppView proxy header to app.bsky.* GET requests', async () => {
		const { client, captured } = createClient();
		await client.get('app.bsky.feed.getTimeline');
		expect(captured[0]['atproto-proxy']).toBe(BSKY_APPVIEW_PROXY);
	});

	it('adds the default AppView proxy header to app.bsky.* POST requests', async () => {
		const { client, captured } = createClient();
		await client.post('app.bsky.graph.muteActor', { actor: 'did:plc:abc' });
		expect(captured[0]['atproto-proxy']).toBe(BSKY_APPVIEW_PROXY);
	});

	it('does not add the header to non app.bsky.* requests', async () => {
		const { client, captured } = createClient();
		await client.get('com.atproto.repo.getRecord');
		await client.get('tech.tokimeki.bookmark.getBookmarks');
		await client.post('com.atproto.repo.createRecord', {});
		for (const headers of captured) {
			expect(headers['atproto-proxy']).toBeUndefined();
		}
	});

	it('keeps an explicitly passed atproto-proxy header', async () => {
		const { client, captured } = createClient();
		await client.get('app.bsky.feed.getFeed', {}, { headers: { 'atproto-proxy': 'did:web:custom.example#custom_appview' } });
		await client.get('chat.bsky.convo.listConvos', {}, { headers: { 'atproto-proxy': 'did:web:api.bsky.chat#bsky_chat' } });
		expect(captured[0]['atproto-proxy']).toBe('did:web:custom.example#custom_appview');
		expect(captured[1]['atproto-proxy']).toBe('did:web:api.bsky.chat#bsky_chat');
	});

	it('uses a custom AppView proxy passed to the constructor', async () => {
		const { client, captured } = createClient('did:web:appview.example#custom');
		await client.get('app.bsky.feed.getTimeline');
		await client.get('com.atproto.repo.getRecord');
		expect(captured[0]['atproto-proxy']).toBe('did:web:appview.example#custom');
		expect(captured[1]['atproto-proxy']).toBeUndefined();
	});

	it('coexists with the atproto-accept-labelers header', async () => {
		const { client, captured } = createClient();
		client.configureLabelers(['did:plc:labeler']);
		await client.get('app.bsky.feed.getTimeline');
		expect(captured[0]['atproto-proxy']).toBe(BSKY_APPVIEW_PROXY);
		expect(captured[0]['atproto-accept-labelers']).toBe('did:plc:labeler;redact');
	});
});
