import { AppBskyEmbedImages, AppBskyEmbedVideo } from '$lib/atproto-guards';
type currentAlgorithm = App.currentAlgorithm;
import { CHAT_PROXY } from '$lib/components/chat/chatConst';
import { chatState } from '$lib/classes/chatState.svelte';

type timelineOpt = {
	limit: number;
	cursor: string;
	algorithm?: currentAlgorithm;
	type: 'default' | 'media';
	uris?: [];
	actors?: [];
	count?: number;
	lang?: string;
};

export class ProxyAgent {
	private _did: string;
	private _handle: string | undefined;
	private _inflightGets = new Map<string, Promise<{ data: any }>>();
	latestRev: string = '';
	unreadChat: number = 0;

	constructor(did: string, handle?: string) {
		this._did = did;
		this._handle = handle;
	}

	did(): string | undefined {
		return this._did;
	}

	handle(): string | undefined {
		return this._handle || this._did;
	}

	setHandle(handle: string): void {
		this._handle = handle;
	}

	service(): string {
		return 'https://bsky.social';
	}

	async xrpcGet<T = any>(
		nsid: string,
		params?: Record<string, any>,
		opts?: { signal?: AbortSignal; lang?: string; proxy?: string }
	): Promise<{ data: T }> {
		const url = this._buildGetUrl(nsid, params, opts);

		if (opts?.signal) return this._doGet<T>(url, opts.signal);

		const existing = this._inflightGets.get(url);
		if (existing) return existing as Promise<{ data: T }>;

		const promise = this._doGet<T>(url).finally(() => {
			this._inflightGets.delete(url);
		});
		this._inflightGets.set(url, promise);
		return promise;
	}

	private _buildGetUrl(
		nsid: string,
		params?: Record<string, any>,
		opts?: { lang?: string; proxy?: string }
	): string {
		const searchParams = new URLSearchParams();
		searchParams.set('_did', this._did);
		if (opts?.lang) searchParams.set('_lang', opts.lang);
		if (opts?.proxy) searchParams.set('_proxy', opts.proxy);

		if (params) {
			for (const [key, value] of Object.entries(params)) {
				if (value !== undefined && value !== null) {
					if (Array.isArray(value)) {
						for (const v of value) {
							searchParams.append(key, String(v));
						}
					} else {
						searchParams.set(key, String(value));
					}
				}
			}
		}

		return `/api/xrpc/${nsid}?${searchParams.toString()}`;
	}

	private async _doGet<T>(url: string, signal?: AbortSignal): Promise<{ data: T }> {
		const response = await fetch(url, { signal });

		if (!response.ok) {
			const errorBody = await response.json().catch(() => ({}));
			const error: any = new Error(errorBody.message || `XRPC failed: ${response.status}`);
			error.status = response.status;
			error.error = errorBody.error;
			throw error;
		}

		const data = await response.json();
		return { data };
	}

	async xrpcPost<T = any>(
		nsid: string,
		data?: any,
		opts?: { proxy?: string; contentType?: string; body?: ArrayBuffer }
	): Promise<{ data: T }> {
		const searchParams = new URLSearchParams();
		searchParams.set('_did', this._did);
		if (opts?.proxy) searchParams.set('_proxy', opts.proxy);

		const headers: Record<string, string> = {};
		let body: string | ArrayBuffer;

		if (opts?.body) {
			headers['Content-Type'] = opts.contentType || 'application/octet-stream';
			body = opts.body;
		} else {
			headers['Content-Type'] = 'application/json';
			body = JSON.stringify(data || {});
		}

		const response = await fetch(`/api/xrpc/${nsid}?${searchParams.toString()}`, {
			method: 'POST',
			headers,
			body
		});

		if (!response.ok) {
			const errorBody = await response.json().catch(() => ({}));
			const error: any = new Error(errorBody.message || `XRPC ${nsid} failed: ${response.status}`);
			error.status = response.status;
			error.error = errorBody.error;
			throw error;
		}

		const contentType = response.headers.get('content-type') || '';
		if (contentType.includes('application/json')) {
			return { data: await response.json() };
		}
		return { data: undefined as any };
	}

	// Proxy method for callWithProxy (tokimeki/other custom XRPC services)
	async callWithProxy<T = unknown>(
		nsid: string,
		params?: Record<string, unknown>,
		options?: {
			method?: 'GET' | 'POST';
			data?: unknown;
			proxyDid?: string;
			proxyServiceId?: string;
		}
	): Promise<T> {
		const proxyDid = options?.proxyDid || 'did:web:api.tokimeki.tech';
		const proxyServiceId = options?.proxyServiceId || 'tokimeki_api';
		const proxyHeader = `${proxyDid}#${proxyServiceId}`;

		const method = options?.method || 'GET';

		if (method === 'GET') {
			const result = await this.xrpcGet<T>(nsid, params as Record<string, any>, {
				proxy: proxyHeader
			});
			return result.data;
		} else {
			const result = await this.xrpcPost<T>(nsid, options?.data, {
				proxy: proxyHeader
			});
			return result.data;
		}
	}

	// Cloud Bookmarks
	async getCloudBookmarks(): Promise<{
		bookmarks: Array<{ id: number; name: string; text?: string }>;
	}> {
		return this.callWithProxy('tech.tokimeki.bookmark.getBookmarks', {
			owner: this._did
		});
	}

	async getCloudBookmark(
		id: number
	): Promise<{ bookmark: { id: number; name: string; text?: string } }> {
		return this.callWithProxy('tech.tokimeki.bookmark.getBookmark', {
			owner: this._did,
			id: id
		});
	}

	async addCloudBookmark(bookmark: {
		id?: number;
		name: string;
		text?: string;
	}): Promise<unknown> {
		return this.callWithProxy('tech.tokimeki.bookmark.addBookmark', undefined, {
			method: 'POST',
			data: { bookmark: { id: bookmark.id, owner: this._did, name: bookmark.name, text: bookmark.text } }
		});
	}

	async deleteCloudBookmark(id: number): Promise<unknown> {
		return this.callWithProxy('tech.tokimeki.bookmark.deleteBookmark', undefined, {
			method: 'POST',
			data: { bookmark: { id: id, owner: this._did } }
		});
	}

	async getCloudBookmarkFeed(
		id: string | number,
		cursor: string | number = 0,
		limit: number = 20
	): Promise<{ posts: string[]; cursor: string }> {
		return this.callWithProxy('tech.tokimeki.bookmark.getFeed', {
			owner: this._did,
			id: id,
			cursor: cursor,
			limit: limit
		});
	}

	async getRelatedCloudBookmark(
		cid: string
	): Promise<{ bookmarks: Array<{ id: number; name: string }> }> {
		return this.callWithProxy('tech.tokimeki.bookmark.getRelatedBookmark', {
			owner: this._did,
			cid: cid
		});
	}

	async addCloudBookmarkItem(bookmarkId: number, uri: string, cid: string): Promise<unknown> {
		return this.callWithProxy('tech.tokimeki.bookmark.addBookmarkItem', undefined, {
			method: 'POST',
			data: { bookmark: { bookmark: bookmarkId, owner: this._did, cid: cid, uri: uri } }
		});
	}

	async deleteCloudBookmarkItem(
		bookmarkId: number,
		uri: string,
		cid: string
	): Promise<unknown> {
		return this.callWithProxy('tech.tokimeki.bookmark.deleteBookmarkItem', undefined, {
			method: 'POST',
			data: { bookmark: { bookmark: bookmarkId, cid: cid, owner: this._did } }
		});
	}

	// Timeline
	async getTimeline(
		timelineOpt: timelineOpt = { limit: 20, cursor: '', type: 'default', lang: 'en' },
		signal?: AbortSignal
	) {
		try {
			let res;
			res = await this.getTimelineByAlgo(timelineOpt, signal);

			if (timelineOpt.type === 'media') {
				res.data.feed = res.data.feed.filter((item: any) => {
					return item.post.embed && AppBskyEmbedImages.isView(item.post.embed);
				});
			}

			return res;
		} catch (e: any) {
			if (e.error === 'BlockedActor') throw new Error('BlockedActor');
			if (e.error === 'BlockedByActor') throw new Error('BlockedByActor');
			console.error(e);
			return undefined;
		}
	}

	async getTimelineByAlgo(timelineOpt: timelineOpt, signal?: AbortSignal) {
		switch (timelineOpt.algorithm.type) {
			case 'custom':
				return await this.xrpcGet('app.bsky.feed.getFeed', {
					limit: timelineOpt.limit, cursor: timelineOpt.cursor, feed: timelineOpt.algorithm.algorithm
				}, { signal, lang: timelineOpt.lang });
			case 'list':
				return await this.getAuthorsFeed(timelineOpt.actors, timelineOpt.count);
			case 'officialList':
				return await this.xrpcGet('app.bsky.feed.getListFeed', {
					limit: timelineOpt.limit, cursor: timelineOpt.cursor, list: timelineOpt.algorithm.algorithm
				}, { signal });
			case 'bookmark':
				return await this.xrpcGet('app.bsky.feed.getPosts', { uris: timelineOpt.uris || [] });
			case 'cloudBookmark': {
				const cbResult = await this.getCloudBookmarkFeed(
					timelineOpt.algorithm.algorithm, timelineOpt.cursor || 0, timelineOpt.limit
				);
				const ress = await this.xrpcGet('app.bsky.feed.getPosts', { uris: cbResult.posts });
				const tempBookmarkFeeds: any[] = [];
				ress.data.posts.forEach((post: any) => {
					tempBookmarkFeeds.push({ post: post });
				});
				return { data: { cursor: cbResult.cursor, feed: tempBookmarkFeeds } };
			}
			case 'officialBookmark': {
				const officialBookmarkRes = await this.xrpcGet('app.bsky.bookmark.getBookmarks', {
					limit: timelineOpt.limit, cursor: timelineOpt.cursor
				}, { signal });
				const officialBookmarks = officialBookmarkRes.data.bookmarks.map((bookmark: any) => ({
					post: bookmark.item
				}));
				return {
					data: {
						feed: officialBookmarks,
						cursor: officialBookmarks.length ? officialBookmarkRes.data.cursor : undefined
					}
				};
			}
			case 'like':
				return await this.xrpcGet('app.bsky.feed.getActorLikes', {
					limit: timelineOpt.limit, cursor: timelineOpt.cursor, actor: this._did
				}, { signal });
			case 'search': {
				const res = await this.xrpcGet('app.bsky.feed.searchPosts', {
					q: timelineOpt.algorithm.algorithm, limit: timelineOpt.limit,
					cursor: timelineOpt.cursor, sort: timelineOpt.algorithm.sort || 'latest'
				}, { signal });
				let tempFeeds: any[] = res.data.posts.map((post: any) => ({ post }));
				tempFeeds = tempFeeds.filter((feed: any) => feed.post?.indexedAt);
				tempFeeds.sort((a: any, b: any) => new Date(b.post.indexedAt).getTime() - new Date(a.post.indexedAt).getTime());
				return { data: { cursor: res.data.cursor, feed: tempFeeds } };
			}
			case 'author':
				return await this.xrpcGet('app.bsky.feed.getAuthorFeed', {
					limit: timelineOpt.limit, cursor: timelineOpt.cursor,
					actor: timelineOpt.algorithm.algorithm, includePins: true
				}, { signal });
			case 'authorLike': {
				const authorLikeRes = await this.listRecords(
					'app.bsky.feed.like', timelineOpt.limit, timelineOpt.cursor,
					timelineOpt.algorithm.algorithm as string
				);
				const likePosts = await this.getFeedsFromRecords(authorLikeRes.data.records);
				return { data: { cursor: authorLikeRes.data.cursor, feed: likePosts } };
			}
			case 'authorMedia': {
				const mediaRes = await this.xrpcGet('app.bsky.feed.getAuthorFeed', {
					actor: timelineOpt.algorithm.algorithm, limit: timelineOpt.limit,
					cursor: timelineOpt.cursor, filter: 'posts_with_media'
				}, { signal });
				const mediaPosts = mediaRes.data.feed.filter(
					(item: any) => AppBskyEmbedImages.isView(item.post?.embed) || AppBskyEmbedImages.isView(item.post?.embed?.media)
				);
				return { data: { cursor: mediaRes.data.cursor, feed: mediaPosts } };
			}
			case 'authorVideo': {
				const videoRes = await this.xrpcGet('app.bsky.feed.getAuthorFeed', {
					actor: timelineOpt.algorithm.algorithm, limit: timelineOpt.limit,
					cursor: timelineOpt.cursor, filter: 'posts_with_video'
				}, { signal });
				const videoPosts = videoRes.data.feed.filter(
					(item: any) => AppBskyEmbedVideo.isView(item.post?.embed) || AppBskyEmbedImages.isView(item.post?.embed?.media)
				);
				return { data: { cursor: videoRes.data.cursor, feed: videoPosts } };
			}
			case 'myPost':
				return await this.xrpcGet('app.bsky.feed.getAuthorFeed', {
					limit: timelineOpt.limit, cursor: timelineOpt.cursor, actor: this._did
				}, { signal });
			case 'myMedia':
				return await this.xrpcGet('app.bsky.feed.getAuthorFeed', {
					limit: timelineOpt.limit, cursor: timelineOpt.cursor, actor: this._did, filter: 'posts_with_media'
				}, { signal });
			default:
				return await this.xrpcGet('app.bsky.feed.getTimeline', {
					limit: timelineOpt.limit, cursor: timelineOpt.cursor
				}, { signal });
		}
	}

	async getAuthorsFeed(actors: any, count: number) {
		const promises: any[] = [];
		actors.forEach((member: any) => {
			if (member.cursor !== undefined || count === 0) {
				const res = this.xrpcGet('app.bsky.feed.getAuthorFeed', {
					actor: member.actor, limit: member.limit || 20, cursor: member.cursor || ''
				});
				promises.push(res);
			}
		});

		const res: any[] = [];
		await Promise.allSettled(promises).then((results) => {
			results.forEach((result) => {
				if (result.status === 'fulfilled') {
					res.push(result.value);
				}
			});
		});
		return res;
	}

	// Feed interactions
	async setVote(cid: string, uri: string, likeUri = '', via = undefined) {
		if (!likeUri) {
			return await this.xrpcPost('com.atproto.repo.createRecord', {
				repo: this._did,
				collection: 'app.bsky.feed.like',
				record: { subject: { cid, uri }, via, createdAt: new Date().toISOString(), $type: 'app.bsky.feed.like' }
			});
		} else {
			const rkey = likeUri.split('/').slice(-1)[0];
			return await this.xrpcPost('com.atproto.repo.deleteRecord', {
				repo: this._did,
				collection: 'app.bsky.feed.like',
				rkey: rkey
			});
		}
	}

	async setRepost(cid: string, uri: string, repostUri: string = '', via = undefined) {
		if (!repostUri) {
			return await this.xrpcPost('com.atproto.repo.createRecord', {
				repo: this._did,
				collection: 'app.bsky.feed.repost',
				record: { subject: { cid, uri }, via, createdAt: new Date().toISOString(), $type: 'app.bsky.feed.repost' }
			});
		} else {
			const rkey = repostUri.split('/').slice(-1)[0];
			return await this.xrpcPost('com.atproto.repo.deleteRecord', {
				repo: this._did,
				collection: 'app.bsky.feed.repost',
				rkey: rkey
			});
		}
	}

	async getVotes(uri: string) {
		const res = await this.xrpcGet('app.bsky.feed.getLikes', { uri });
		return res.data.likes;
	}

	async getFeed(uri: string, depth: number = 0) {
		const res = await this.xrpcGet('app.bsky.feed.getPostThread', { uri, depth });
		return res.data.thread;
	}

	async getNotificationCount() {
		const res = await this.xrpcGet('app.bsky.notification.getUnreadCount');
		return res.data.count;
	}

	async getPreferences() {
		const res = await this.xrpcGet('app.bsky.actor.getPreferences');
		return res.data.preferences;
	}

	async getSavedFeeds() {
		try {
			const preferences = await this.getPreferences();
			const savedFeeds = preferences.filter(
				(preference: any) => preference.$type === 'app.bsky.actor.defs#savedFeedsPref'
			)[0]?.saved;

			if (savedFeeds && savedFeeds.length) {
				const res = await this.xrpcGet('app.bsky.feed.getFeedGenerators', { feeds: savedFeeds });
				return res.data.feeds.map((feed: any) => ({
					uri: feed.uri,
					name: feed.displayName
				}));
			}
			return [];
		} catch (e) {
			console.error(e);
			return [];
		}
	}

	async getV2PinnedFeeds() {
		try {
			const preferences = await this.getPreferences();
			const savedFeeds = preferences.filter(
				(preference: any) => preference.$type === 'app.bsky.actor.defs#savedFeedsPrefV2'
			)[0]?.items;
			return savedFeeds.filter((savedFeed: any) => savedFeed?.pinned);
		} catch (e) {
			console.error(e);
			return [];
		}
	}

	async getMuteWords() {
		try {
			const preferences = await this.getPreferences();
			return preferences.filter(
				(p: any) => p.$type === 'app.bsky.actor.defs#mutedWordsPref'
			)[0].items;
		} catch (e) {
			console.error(e);
			return [];
		}
	}

	async getListActors(uri: string) {
		const res = await this.xrpcGet('app.bsky.graph.getList', { list: uri });
		return res.data.items.map((item: any) => item.subject.did);
	}

	async getSavedLabelerDids() {
		try {
			const preferences = await this.getPreferences();
			const labelers = preferences.filter(
				(p: any) => p.$type === 'app.bsky.actor.defs#labelersPref'
			)[0]?.labelers;
			return labelers ? labelers.map((labeler: any) => labeler.did) : [];
		} catch (e) {
			console.error(e);
			return [];
		}
	}

	async getChatLogs() {
		try {
			const res = await this.xrpcGet(
				'chat.bsky.convo.getLog',
				{ cursor: this.latestRev },
				{ proxy: CHAT_PROXY }
			);

			if (this.latestRev !== res.data.cursor) {
				this.updateChatCount();
			}

			this.latestRev = res.data.cursor || '';
			return res.data.logs;
		} catch (e: any) {
			if (e.message === 'XRPCNotSupported') {
				setTimeout(() => this.updateChatCount(), 1000);
			} else {
				console.error(e);
				return [];
			}
		}
	}

	async updateChatCount() {
		try {
			const res = await this.xrpcGet(
				'chat.bsky.convo.listConvos',
				{},
				{ proxy: CHAT_PROXY }
			);
			const convos = res?.data?.convos || [];
			const count = convos.reduce((acc: number, val: any) => acc + val.unreadCount, 0);
			this.updateChatUnread(count);
			chatState.updateTotalChatCount();
		} catch (e: any) {
			if (e.message === 'XRPCNotSupported') {
				setTimeout(() => this.updateChatCount(), 1000);
			}
		}
	}

	updateChatUnread(count: number) {
		this.unreadChat = count;
	}

	async getAvatar(did: string) {
		try {
			const res = await this.xrpcGet('app.bsky.actor.getProfile', { actor: did });
			return res.data.avatar;
		} catch (e) {
			console.error(e);
			return undefined;
		}
	}

	async getFeedsFromRecords(records: any[]) {
		const uris = records.map((record: any) => record.value.subject.uri);
		const res = await this.xrpcGet('app.bsky.feed.getPosts', { uris });
		return res.data.posts.map((post: any) => ({ post }));
	}

	// Helper: listRecords via XRPC
	async listRecords(collection: string, limit: number, cursor: any, repo: string) {
		return await this.xrpcGet('com.atproto.repo.listRecords', {
			repo, collection, limit, cursor
		});
	}

	// Resolve handle
	async resolveHandle(params: { handle: string }) {
		return await this.xrpcGet('com.atproto.identity.resolveHandle', params);
	}

	// Get profile
	async getProfile(params: { actor: string }) {
		return await this.xrpcGet('app.bsky.actor.getProfile', params);
	}

	// upsertProfile: get-modify-put pattern matching BskyAgent.upsertProfile
	async upsertProfile(updateFn: (existing: any) => any): Promise<void> {
		let existing: any = {};
		try {
			const res = await this.xrpcGet('com.atproto.repo.getRecord', {
				repo: this._did,
				collection: 'app.bsky.actor.profile',
				rkey: 'self',
			});
			existing = res.data.value || {};
		} catch (e: any) {
			// Profile may not exist yet
			if (e.status !== 400) throw e;
		}

		const updated = updateFn(existing);
		await this.xrpcPost('com.atproto.repo.putRecord', {
			repo: this._did,
			collection: 'app.bsky.actor.profile',
			rkey: 'self',
			record: { ...updated, $type: 'app.bsky.actor.profile' },
		});
	}

	// getLabelers
	async getLabelers(params: { dids: string[] }) {
		return await this.xrpcGet('app.bsky.labeler.getServices', {
			dids: params.dids,
			detailed: true,
		});
	}

	// getLabelDefinitions: fetch labeler services and extract label defs
	async getLabelDefinitions(subscribedLabelers: string[]) {
		try {
			if (!subscribedLabelers.length) return [];
			const res = await this.getLabelers({ dids: subscribedLabelers });
			const views = res.data?.views || [];
			const labelDefs: any[] = [];
			for (const view of views) {
				if (view.policies?.labelValueDefinitions) {
					for (const def of view.policies.labelValueDefinitions) {
						labelDefs.push({
							...def,
							definedBy: view.creator?.did,
						});
					}
				}
			}
			return labelDefs;
		} catch (e) {
			console.error(e);
			return [];
		}
	}

	// configureLabelersHeader: no-op in proxy mode (server handles labelers header)
	configureLabelersHeader(_dids: string[]) {
		// In proxy mode, labeler configuration is handled server-side
	}

	// Service token (for video uploads)
	async getServiceAuthToken(params: { aud: string; lxm: string; exp?: number }): Promise<string> {
		const res = await fetch('/api/auth/service-token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ ...params, did: this._did })
		});
		if (!res.ok) throw new Error('Failed to get service token');
		const data = await res.json();
		return data.token;
	}
}
