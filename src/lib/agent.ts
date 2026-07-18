import { AppBskyEmbedVideo } from '$lib/atproto-guards';
import { hasGalleryImages } from '$lib/components/post/embedImages';
import type { currentAlgorithm } from '../app.d.ts';
import { CHAT_PROXY } from '$lib/components/chat/chatConst';
import { chatRealtime } from '$lib/components/chat/chatRealtime';
import { chatState } from '$lib/classes/chatState.svelte';
import { XrpcClient, type FetchHandler } from '$lib/xrpc-client';
import type { PasswordSession, SessionData } from '$lib/password-session';
import { interpretLabelValueDefinitions } from '$lib/atproto-moderation';
import { listRecords as listRecordsFromPds } from '$lib/util';

type timelineOpt = {
    limit: number,
    cursor: string,
    algorithm?: currentAlgorithm,
    type: 'default' | 'media',
    uris?: [],
    actors?: [],
    count?: number,
    lang?: string,
}

export class Agent {
    public xrpc: XrpcClient;
    public isOAuth: boolean;
    private _did: string;
    private _handle?: string;
    private _service?: string;
    private _passwordSession?: PasswordSession;
    latestRev: string = '';
    private _chatLogInFlight = false;
    unreadChat: number = 0;
    unreadChatRequests: number = 0;

    constructor(opts: {
        fetchHandler: FetchHandler;
        did: string;
        handle?: string;
        service?: string;
        isOAuth: boolean;
        passwordSession?: PasswordSession;
        appViewProxy?: string;
    }) {
        this.xrpc = new XrpcClient(opts.fetchHandler, opts.appViewProxy);
        this._did = opts.did;
        this._handle = opts.handle;
        this._service = opts.service;
        this.isOAuth = opts.isOAuth;
        this._passwordSession = opts.passwordSession;
    }

    did(): string {
        return this._did;
    }

    handle(): string | undefined {
        return this._handle || this._did;
    }

    setHandle(handle: string): void {
        this._handle = handle;
    }

    service(): string {
        return this._service || 'https://bsky.social';
    }

    getToken(): string | undefined {
        return this._passwordSession?.session?.accessJwt;
    }

    async getPdsUrl(): Promise<string | undefined> {
        const res = await fetch('https://plc.directory/' + this._did);
        const json = await res.json();
        return json?.service[0]?.serviceEndpoint;
    }

    configureLabelers(dids: string[]): void {
        this.xrpc.configureLabelers(dids);
    }

    async getLabelDefinitions(subscribedLabelers: string[]): Promise<Record<string, any[]>> {
        if (!subscribedLabelers.length) return {};

        const res = await this.xrpc.get('app.bsky.labeler.getServices', {
            dids: subscribedLabelers,
            detailed: true,
        });

        const labelDefs: Record<string, any[]> = {};
        for (const view of (res.views || [])) {
            if (view.policies?.labelValueDefinitions) {
                labelDefs[view.creator.did] = interpretLabelValueDefinitions(view);
            }
        }

        return labelDefs;
    }

    async resolveHandle(handle: string): Promise<string> {
        const res = await this.xrpc.get('com.atproto.identity.resolveHandle', { handle });
        return res.did;
    }

    async getProfile(actor: string) {
        return await this.xrpc.get('app.bsky.actor.getProfile', { actor });
    }

    async upsertProfile(updateFn: (existing: Record<string, any>) => Record<string, any>): Promise<void> {
        let existing: Record<string, any> | undefined;
        let cid: string | undefined;

        try {
            const res = await this.xrpc.get('com.atproto.repo.getRecord', {
                repo: this._did,
                collection: 'app.bsky.actor.profile',
                rkey: 'self',
            });
            existing = res.value as Record<string, any>;
            cid = res.cid as string;
        } catch (e: any) {
            // Record not found is ok, start with empty
            if (e?.status !== 400 && e?.error !== 'RecordNotFound') {
                throw e;
            }
        }

        const updated = updateFn(existing || {});
        updated.$type = 'app.bsky.actor.profile';

        await this.xrpc.post('com.atproto.repo.putRecord', {
            repo: this._did,
            collection: 'app.bsky.actor.profile',
            rkey: 'self',
            record: updated,
            swapRecord: cid || null,
        });
    }

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
            return this.xrpc.get(nsid, params, { headers: { 'atproto-proxy': proxyHeader } });
        } else {
            return this.xrpc.post(nsid, options?.data, { headers: { 'atproto-proxy': proxyHeader } });
        }
    }

    async getCloudBookmarks(): Promise<{ bookmarks: Array<{ id: number; name: string; text?: string }> }> {
        return this.callWithProxy('tech.tokimeki.bookmark.getBookmarks', {
            owner: this.did() as string,
        });
    }

    async getCloudBookmark(id: number): Promise<{ bookmark: { id: number; name: string; text?: string } }> {
        return this.callWithProxy('tech.tokimeki.bookmark.getBookmark', {
            owner: this.did() as string,
            id: id,
        });
    }

    async addCloudBookmark(bookmark: { id?: number; name: string; text?: string }): Promise<unknown> {
        return this.callWithProxy('tech.tokimeki.bookmark.addBookmark', undefined, {
            method: 'POST',
            data: {
                bookmark: {
                    id: bookmark.id,
                    owner: this.did() as string,
                    name: bookmark.name,
                    text: bookmark.text,
                }
            }
        });
    }

    async deleteCloudBookmark(id: number): Promise<unknown> {
        return this.callWithProxy('tech.tokimeki.bookmark.deleteBookmark', undefined, {
            method: 'POST',
            data: {
                bookmark: {
                    id: id,
                    owner: this.did() as string,
                }
            }
        });
    }

    async getCloudBookmarkFeed(id: string | number, cursor: string | number = 0, limit: number = 20): Promise<{ posts: string[]; cursor: string }> {
        return this.callWithProxy('tech.tokimeki.bookmark.getFeed', {
            owner: this.did() as string,
            id: id,
            cursor: cursor,
            limit: limit,
        });
    }

    async getRelatedCloudBookmark(cid: string): Promise<{ bookmarks: Array<{ id: number; name: string }> }> {
        return this.callWithProxy('tech.tokimeki.bookmark.getRelatedBookmark', {
            owner: this.did() as string,
            cid: cid,
        });
    }

    async addCloudBookmarkItem(bookmarkId: number, uri: string, cid: string): Promise<unknown> {
        return this.callWithProxy('tech.tokimeki.bookmark.addBookmarkItem', undefined, {
            method: 'POST',
            data: {
                bookmark: {
                    bookmark: bookmarkId,
                    owner: this.did() as string,
                    cid: cid,
                    uri: uri,
                }
            }
        });
    }

    async deleteCloudBookmarkItem(bookmarkId: number, uri: string, cid: string): Promise<unknown> {
        return this.callWithProxy('tech.tokimeki.bookmark.deleteBookmarkItem', undefined, {
            method: 'POST',
            data: {
                bookmark: {
                    bookmark: bookmarkId,
                    cid: cid,
                    owner: this.did() as string,
                }
            }
        });
    }

    async getTimeline(timelineOpt: timelineOpt = {limit: 20, cursor: '', type: 'default', lang: 'en'}, signal?: AbortSignal): Promise<any> {
        try {
            let res;
            res = await this.getTimelineByAlgo(timelineOpt, signal);

            if (timelineOpt.type === 'media') {
                res.feed = res.feed.filter(item => {
                    return item.post.embed && hasGalleryImages(item.post.embed);
                });
            }

            return res;
        } catch (e: any) {
            if (e.error === 'BlockedActor') {
                throw new Error('BlockedActor');
            }

            if (e.error === 'BlockedByActor') {
                throw new Error('BlockedByActor');
            }

            console.error(e);
            return undefined;
        }
    }

    async getTimelineByAlgo(timelineOpt: timelineOpt, signal?: AbortSignal) {
        switch (timelineOpt.algorithm.type) {
            case 'custom':
                return await this.xrpc.get('app.bsky.feed.getFeed', {
                    limit: timelineOpt.limit, cursor: timelineOpt.cursor, feed: timelineOpt.algorithm.algorithm
                }, {headers: {'Accept-Language': timelineOpt.lang}, signal});
            case 'list':
                return await this.getAuthorsFeed(timelineOpt.actors, timelineOpt.count);
            case 'officialList':
                return await this.xrpc.get('app.bsky.feed.getListFeed', {
                    limit: timelineOpt.limit, cursor: timelineOpt.cursor, list: timelineOpt.algorithm.algorithm
                }, {signal});
            case 'bookmark':
                return await this.xrpc.get('app.bsky.feed.getPosts', {uris: timelineOpt.uris || []});
            case 'cloudBookmark': {
                const cbResult = await this.getCloudBookmarkFeed(
                    timelineOpt.algorithm.algorithm,
                    timelineOpt.cursor || 0,
                    timelineOpt.limit
                );
                const ress = await this.xrpc.get('app.bsky.feed.getPosts', {uris: cbResult.posts});
                let tempBookmarkFeeds: any[] = [];
                ress.posts.forEach(post => {
                    tempBookmarkFeeds.push({ post: post });
                });
                return {
                    cursor: cbResult.cursor,
                    feed: tempBookmarkFeeds
                };
            }
            case 'officialBookmark': {
                const officialBookmarkRes = await this.xrpc.get('app.bsky.bookmark.getBookmarks', {
                    limit: timelineOpt.limit, cursor: timelineOpt.cursor
                }, {signal});
                const officialBookmarks = officialBookmarkRes.bookmarks.map(bookmark => ({
                    post: bookmark.item,
                }));
                return {
                    feed: officialBookmarks,
                    cursor: officialBookmarks.length ? officialBookmarkRes.cursor : undefined,
                };
            }
            case 'like':
                return await this.xrpc.get('app.bsky.feed.getActorLikes', {
                    limit: timelineOpt.limit, cursor: timelineOpt.cursor, actor: this.did() as string
                }, {signal});
            case 'search': {
                const algo = timelineOpt.algorithm;
                const sort = algo.sort === 'top' ? 'top' : 'recent';
                const { allTime, ...filters } = algo.searchFilters ?? {};
                const res = await this.xrpc.get('app.bsky.feed.searchPostsV2', {
                    query: algo.algorithm || undefined,
                    limit: timelineOpt.limit,
                    cursor: timelineOpt.cursor || undefined,
                    sort,
                    allTime: allTime ?? true,
                    ...filters,
                }, {signal});
                let tempFeeds: any[] = [];
                res.posts.forEach(post => {
                    tempFeeds.push({ post: post });
                });
                tempFeeds = tempFeeds.filter(feed => feed.post?.indexedAt);
                if (sort === 'recent') {
                    tempFeeds.sort((a, b) => {
                        return new Date(b.post.indexedAt).getTime() - new Date(a.post.indexedAt).getTime();
                    });
                }
                return {
                    cursor: res.cursor,
                    feed: tempFeeds,
                    hitsTotal: res.hitsTotal,
                };
            }
            case 'author':
                return await this.xrpc.get('app.bsky.feed.getAuthorFeed', {
                    limit: timelineOpt.limit, cursor: timelineOpt.cursor, actor: timelineOpt.algorithm.algorithm as string, includePins: true
                }, {signal});
            case 'authorLike': {
                const actor = timelineOpt.algorithm.algorithm as string;
                const did = actor.startsWith('did:') ? actor : await this.resolveHandle(actor);
                const authorLikeRes = await listRecordsFromPds('app.bsky.feed.like', timelineOpt.limit, timelineOpt.cursor, did);
                const likePosts = await this.getFeedsFromRecords(authorLikeRes.records);
                return {
                    cursor: authorLikeRes.cursor,
                    feed: likePosts,
                };
            }
            case 'authorReplies': {
                const repliesRes = await this.xrpc.get('app.bsky.feed.searchPostsV2', {
                    authors: [timelineOpt.algorithm.algorithm as string],
                    repliesOnly: true,
                    sort: 'recent',
                    allTime: true,
                    limit: timelineOpt.limit,
                    cursor: timelineOpt.cursor || undefined,
                }, {signal});
                const replyPosts = repliesRes.posts.filter(post => post?.indexedAt);
                replyPosts.sort((a, b) => {
                    return new Date(b.indexedAt).getTime() - new Date(a.indexedAt).getTime();
                });

                const viewByUri = new Map(replyPosts.map(post => [post.uri, post]));
                const contextUris = new Set<string>();
                replyPosts.forEach(post => {
                    const ref = post.record?.reply;
                    [ref?.parent?.uri, ref?.root?.uri].forEach(uri => {
                        if (uri && !viewByUri.has(uri)) {
                            contextUris.add(uri);
                        }
                    });
                });

                if (contextUris.size) {
                    const uris = [...contextUris];
                    const chunks = [];
                    for (let i = 0; i < uris.length; i += 25) {
                        chunks.push(uris.slice(i, i + 25));
                    }
                    try {
                        const contextResults = await Promise.all(chunks.map(chunk => this.xrpc.get('app.bsky.feed.getPosts', {uris: chunk}, {signal})));
                        contextResults.forEach(result => {
                            result.posts.forEach(view => viewByUri.set(view.uri, view));
                        });
                    } catch (e) {
                        if (signal?.aborted || e?.name === 'AbortError') {
                            throw e;
                        }
                        console.error(e);
                    }
                }

                const replyFeeds = replyPosts.map(post => {
                    const ref = post.record?.reply;
                    const parent = ref?.parent?.uri ? viewByUri.get(ref.parent.uri) : undefined;
                    if (!parent) {
                        return { post };
                    }
                    const root = (ref?.root?.uri ? viewByUri.get(ref.root.uri) : undefined) ?? parent;
                    return { post, reply: { parent, root } };
                });
                return {
                    cursor: repliesRes.cursor,
                    feed: replyFeeds,
                };
            }
            case 'authorReposts': {
                const repostActor = timelineOpt.algorithm.algorithm as string;
                const repostDid = repostActor.startsWith('did:') ? repostActor : await this.resolveHandle(repostActor);
                const repostRes = await listRecordsFromPds('app.bsky.feed.repost', timelineOpt.limit, timelineOpt.cursor, repostDid);
                const repostPosts = await this.getFeedsFromRecords(repostRes.records);
                return {
                    cursor: repostRes.cursor,
                    feed: repostPosts,
                };
            }
            case 'authorMedia': {
                const mediaRes = await this.xrpc.get('app.bsky.feed.getAuthorFeed', {
                    actor: timelineOpt.algorithm.algorithm,
                    limit: timelineOpt.limit,
                    cursor: timelineOpt.cursor,
                    filter: 'posts_with_media'
                }, {signal});
                const mediaPosts = mediaRes.feed.filter(item =>
                    hasGalleryImages(item.post?.embed) ||
                    hasGalleryImages(item.post?.embed?.media)
                );
                return {
                    cursor: mediaRes.cursor,
                    feed: mediaPosts,
                };
            }
            case 'authorVideo': {
                const videoRes = await this.xrpc.get('app.bsky.feed.getAuthorFeed', {
                    actor: timelineOpt.algorithm.algorithm,
                    limit: timelineOpt.limit,
                    cursor: timelineOpt.cursor,
                    filter: 'posts_with_video'
                }, {signal});
                const videoPosts = videoRes.feed.filter(item =>
                    AppBskyEmbedVideo.isView(item.post?.embed) ||
                    hasGalleryImages(item.post?.embed?.media)
                );
                return {
                    cursor: videoRes.cursor,
                    feed: videoPosts,
                };
            }
            case 'myPost':
                return await this.xrpc.get('app.bsky.feed.getAuthorFeed', {
                    limit: timelineOpt.limit, cursor: timelineOpt.cursor, actor: this.did() as string
                }, {signal});
            case 'myMedia':
                return await this.xrpc.get('app.bsky.feed.getAuthorFeed', {
                    limit: timelineOpt.limit, cursor: timelineOpt.cursor, actor: this.did() as string, filter: 'posts_with_media'
                }, {signal});
            default:
                return await this.xrpc.get('app.bsky.feed.getTimeline', {
                    limit: timelineOpt.limit, cursor: timelineOpt.cursor
                }, {signal});
        }
    }

    async getAuthorsFeed(actors, count: number) {
        let promises = [];
        actors.forEach(member => {
            if (member.cursor !== undefined || count === 0) {
                const res = this.xrpc.get('app.bsky.feed.getAuthorFeed', {
                    actor: member.actor,
                    limit: member.limit || 20,
                    cursor: member.cursor || '',
                });
                promises.push(res);
            }
        });

        let res = [];
        await Promise.allSettled(promises)
            .then((results) => {
                results.forEach((result) => {
                    if (result.status === 'fulfilled') {
                        res.push(result.value);
                    }
                });
            });

        return res;
    }

    async setVote(cid: string, uri: string, likeUri = '', via = undefined) {
        if (!likeUri) {
            return await this.xrpc.post('com.atproto.repo.createRecord', {
                repo: this.did(),
                collection: 'app.bsky.feed.like',
                record: { subject: { cid, uri }, via, createdAt: new Date().toISOString(), $type: 'app.bsky.feed.like' },
            });
        } else {
            const rkey = likeUri.split('/').slice(-1)[0];
            return await this.xrpc.post('com.atproto.repo.deleteRecord', {
                repo: this.did(),
                collection: 'app.bsky.feed.like',
                rkey: rkey,
            });
        }
    }

    async setRepost(cid: string, uri: string, repostUri: string = '', via = undefined) {
        if (!repostUri) {
            return await this.xrpc.post('com.atproto.repo.createRecord', {
                repo: this.did(),
                collection: 'app.bsky.feed.repost',
                record: { subject: { cid, uri }, via, createdAt: new Date().toISOString(), $type: 'app.bsky.feed.repost' },
            });
        } else {
            const rkey = repostUri.split('/').slice(-1)[0];
            return await this.xrpc.post('com.atproto.repo.deleteRecord', {
                repo: this.did(),
                collection: 'app.bsky.feed.repost',
                rkey: rkey,
            });
        }
    }

    async getVotes(uri: string) {
        const res = await this.xrpc.get('app.bsky.feed.getLikes', { uri });
        return res.likes;
    }

    async getFeed(uri: string, depth: number = 0) {
        const res = await this.xrpc.get('app.bsky.feed.getPostThread', { uri, depth });
        return res.thread;
    }

    async getNotificationCount(priority: boolean = false) {
        const res = await this.xrpc.get('app.bsky.notification.getUnreadCount', priority ? { priority: true } : {});
        return res.count;
    }

    async getPreferences() {
        const res = await this.xrpc.get('app.bsky.actor.getPreferences');
        return res.preferences;
    }

    async getSavedFeeds() {
        try {
            const preferences = await this.getPreferences();
            const savedFeeds = preferences.filter(preference => preference.$type === 'app.bsky.actor.defs#savedFeedsPref')[0]?.saved;

            if (savedFeeds && savedFeeds.length) {
                const res = await this.xrpc.get('app.bsky.feed.getFeedGenerators', { feeds: savedFeeds });
                let customFeeds = [];
                res.feeds.forEach(feed => {
                    customFeeds = [...customFeeds, {
                        uri: feed.uri,
                        name: feed.displayName,
                        cid: feed.cid,
                        avatar: feed.avatar,
                        description: feed.description,
                        contentMode: feed.contentMode ?? null,
                        creator: feed.creator ? { did: feed.creator.did, handle: feed.creator.handle } : undefined,
                    }];
                });
                return customFeeds;
            } else {
                return [];
            }
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    async getV2PinnedFeeds() {
        try {
            const preferences = await this.getPreferences();
            const savedFeeds = preferences.filter(preference => preference.$type === 'app.bsky.actor.defs#savedFeedsPrefV2')[0]?.items;
            return savedFeeds.filter(savedFeed => savedFeed?.pinned);
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    async getMuteWords() {
        try {
            const preferences = await this.getPreferences();
            const muteWords = preferences.filter(preferences => preferences.$type === 'app.bsky.actor.defs#mutedWordsPref')[0].items;
            return muteWords;
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    async getListActors(uri: string) {
        const res = await this.xrpc.get('app.bsky.graph.getList', { list: uri });
        const items = res.items;
        return items.map(item => item.subject.did);
    }

    async getSavedLabelerDids() {
        try {
            const preferences = await this.getPreferences();
            const labelers = preferences.filter(preferences => preferences.$type === 'app.bsky.actor.defs#labelersPref')[0]?.labelers;

            if (labelers) {
                return labelers.map(labeler => labeler.did);
            } else {
                return [];
            }
        } catch (e) {
            console.error(e);
            return [];
        }
    }

    async getChatLogs() {
        if (this._chatLogInFlight) {
            return [];
        }
        this._chatLogInFlight = true;

        try {
            if (!this.latestRev) {
                const res = await this.xrpc.get('chat.bsky.convo.getLog', {}, {
                    headers: { 'atproto-proxy': CHAT_PROXY }
                });
                this.latestRev = res?.cursor || '';
                this.updateChatCount();
                return [];
            }

            const aggregated: any[] = [];
            let changed = false;

            for (let i = 0; i < 20; i++) {
                const res = await this.xrpc.get('chat.bsky.convo.getLog', { cursor: this.latestRev }, {
                    headers: { 'atproto-proxy': CHAT_PROXY }
                });

                const logs = res?.logs || [];
                const nextCursor = res?.cursor || this.latestRev;
                const advanced = nextCursor !== this.latestRev;

                this.latestRev = nextCursor;
                if (advanced) changed = true;

                if (logs.length) {
                    chatRealtime.dispatch(this.did(), logs);
                    aggregated.push(...logs);
                }

                if (!advanced || !logs.length) break;
            }

            if (changed) {
                this.updateChatCount();
            }

            return aggregated;
        } catch (e: any) {
            if (e.message !== 'XRPCNotSupported') {
                console.error(e);
            }
            return [];
        } finally {
            this._chatLogInFlight = false;
        }
    }

    async updateChatCount() {
        try {
            const res = await this.xrpc.get('chat.bsky.convo.getUnreadCounts', { includeGroupChats: true }, {
                headers: { 'atproto-proxy': CHAT_PROXY }
            });

            this.setChatCounts(res.unreadAcceptedConvos, res.unreadRequestConvos);
        } catch (e: any) {
            if (e.status === 404 || e.error === 'MethodNotImplemented') {
                await this.updateChatCountFallback();
            }
        }
    }

    async updateChatCountFallback() {
        try {
            const [accepted, requests] = await Promise.all([
                this.xrpc.get('chat.bsky.convo.listConvos', { status: 'accepted', readState: 'unread', limit: 31 }, {
                    headers: { 'atproto-proxy': CHAT_PROXY }
                }),
                this.xrpc.get('chat.bsky.convo.listConvos', { status: 'request', readState: 'unread', limit: 11 }, {
                    headers: { 'atproto-proxy': CHAT_PROXY }
                }),
            ]);

            this.setChatCounts(accepted?.convos?.length || 0, requests?.convos?.length || 0);
        } catch (e: any) {
            console.error(e);
        }
    }

    setChatCounts(accepted: number, requests: number) {
        this.unreadChat = accepted;
        this.unreadChatRequests = requests;
        chatState.setCounts(this.did(), accepted, requests);
    }

    async getAvatar(did: string) {
        try {
            const res = await this.xrpc.get('app.bsky.actor.getProfile', { actor: did });
            return res.avatar;
        } catch (e) {
            console.error(e);
            return undefined;
        }
    }

    async listRecords(collection: string, limit: number, cursor: any, repo: string) {
        return await this.xrpc.get('com.atproto.repo.listRecords', {
            collection, limit, reverse: false, cursor, repo
        });
    }

    async getFeedsFromRecords(records) {
        if (!records.length) {
            return [];
        }

        const uris = records.map(record => record.value.subject.uri);
        const res = await this.xrpc.get('app.bsky.feed.getPosts', { uris });
        let feeds = [];
        res.posts.forEach(post => {
            feeds.push({ post: post });
        });
        return feeds;
    }

    async getServiceAuth(opts: { aud: string; lxm?: string; exp?: number }) {
        return await this.xrpc.get('com.atproto.server.getServiceAuth', opts);
    }

    async uploadBlob(data: Uint8Array | ArrayBuffer, encoding: string) {
        return await this.xrpc.post('com.atproto.repo.uploadBlob', data, { encoding });
    }

    async getBlob(did: string, cid: string) {
        return await this.xrpc.get('com.atproto.sync.getBlob', { did, cid });
    }
}
