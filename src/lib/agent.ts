import {AppBskyEmbedVideo, type AppBskyFeedGetTimeline, type BskyAgent} from '@atproto/api';
import {AppBskyEmbedImages} from "@atproto/api";
import type {currentAlgorithm} from "../app.d.ts";
import {parseISO} from "date-fns";
import {CHAT_PROXY} from "$lib/components/chat/chatConst";
import {listRecordsWithBsky} from "$lib/util";
import {chatState} from "$lib/classes/chatState.svelte";

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
    public agent: BskyAgent;
    latestRev: string = '';
    unreadChat: number = 0;

    constructor(agent: BskyAgent) {
        this.agent = agent;
    }

    did(): string | undefined {
        if (this.agent.session) {
            return this.agent.session.did;
        }
    }

    handle(): string | undefined {
        if (this.agent.session) {
            return this.agent.session.handle;
        }
    }

    service(): string | undefined {
        if (this.agent.session) {
            return this.agent.service.toString();
        }
    }

    getToken(): string | undefined {
        if (this.agent.session) {
            return this.agent.session.accessJwt;
        }
    }

    async getPdsUrl(): Promise<string | undefined> {
        if (this.agent.pdsUrl) {
            return this.agent.pdsUrl.origin;
        } else {
            const res = await fetch('https://plc.directory/' + this.did());
            const json = await res.json();
            return json?.service[0]?.serviceEndpoint;
        }
    }

    async getTimeline(timelineOpt: timelineOpt = {limit: 20, cursor: '', type: 'default', lang: 'en'}, signal?: AbortSignal): Promise<AppBskyFeedGetTimeline.Response["data"] | undefined> {
        try {
            let res;
            res = await this.getTimelineByAlgo(timelineOpt, signal);

            if (timelineOpt.type === 'media') {
                res.data.feed = res.data.feed.filter(item => {
                    return item.post.embed && AppBskyEmbedImages.isView(item.post.embed);
                });
            }

            return res;
        } catch (e) {
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
                return await this.agent.api.app.bsky.feed.getFeed({
                    limit: timelineOpt.limit, cursor: timelineOpt.cursor, feed: timelineOpt.algorithm.algorithm}, {headers: {'Accept-Language': timelineOpt.lang}, signal});
            case 'list':
                return await this.getAuthorsFeed(timelineOpt.actors, timelineOpt.count);
            case 'officialList':
                return await this.agent.api.app.bsky.feed.getListFeed({
                    limit: timelineOpt.limit, cursor: timelineOpt.cursor, list: timelineOpt.algorithm.algorithm}, {signal})
            case 'bookmark':
                return await this.agent.api.app.bsky.feed.getPosts({uris: timelineOpt.uris || []});
            case 'cloudBookmark':
                const cbres = await fetch(`${await this.getPdsUrl()}/xrpc/tech.tokimeki.bookmark.getFeed?owner=${this.did() as string}&id=${timelineOpt.algorithm.algorithm}&cursor=${timelineOpt.cursor || 0}&limit=${timelineOpt.limit}`, {
                    method: 'GET',
                    headers: {
                        'atproto-proxy': 'did:web:api.tokimeki.tech#tokimeki_api',
                        Authorization: 'Bearer ' + this.getToken(),
                        'Content-Type': 'application/json'
                    }
                })
                const cbjson = await cbres.json();
                const ress = await this.agent.api.app.bsky.feed.getPosts({uris: cbjson.posts});
                let tempBookmarkFeeds: any[] = [];
                ress.data.posts.forEach(post => {
                    tempBookmarkFeeds.push({
                        post: post,
                    })
                });

                return {
                    data: {
                        cursor: cbjson.cursor,
                        feed: tempBookmarkFeeds
                    }
                }
            case 'officialBookmark':
                const officialBookmarkRes = await this.agent.api.app.bsky.bookmark.getBookmarks({
                    limit: timelineOpt.limit, cursor: timelineOpt.cursor}, {signal});
                const officialBookmarks = officialBookmarkRes.data.bookmarks.map(bookmark => {
                    return {
                        post: bookmark.item,
                    }
                });

                return {
                    data: {
                        feed: officialBookmarks,
                        cursor: officialBookmarks.length ? officialBookmarkRes.data.cursor : undefined,
                    }
                }
            case 'like':
                return await this.agent.api.app.bsky.feed.getActorLikes({limit: timelineOpt.limit, cursor: timelineOpt.cursor, actor: this.did() as string}, {signal});
            case 'search':
                const res =  await this.agent.api.app.bsky.feed.searchPosts({q: timelineOpt.algorithm.algorithm, limit: timelineOpt.limit, cursor: timelineOpt.cursor, sort: timelineOpt.algorithm.sort || 'latest'}, {signal});
                let tempFeeds: any[] = [];
                res.data.posts.forEach(post => {
                    tempFeeds.push({
                        post: post,
                    })
                });
                tempFeeds = tempFeeds.filter(feed => feed.post?.indexedAt);
                tempFeeds.sort((a, b) => {
                    return parseISO(b.post.indexedAt).getTime() - parseISO(a.post.indexedAt).getTime();
                });

                return {
                    data: {
                        cursor: res.data.cursor,
                        feed: tempFeeds,
                    }
                }
            case 'author':
                return await this.agent.api.app.bsky.feed.getAuthorFeed({limit: timelineOpt.limit, cursor: timelineOpt.cursor, actor: timelineOpt.algorithm.algorithm as string, includePins: true}, {signal});
            case 'authorLike':
                const authorLikeRes = await listRecordsWithBsky(this, 'app.bsky.feed.like', timelineOpt.limit, timelineOpt.cursor, timelineOpt.algorithm.algorithm as string);
                const likePosts = await this.getFeedsFromRecords(authorLikeRes.data.records);

                return {
                    data: {
                        cursor: authorLikeRes.data.cursor,
                        feed: likePosts,
                    }
                }
            case 'authorMedia':
                const mediaRes = await this.agent.api.app.bsky.feed.getAuthorFeed({
                    actor: timelineOpt.algorithm.algorithm,
                    limit: timelineOpt.limit,
                    cursor: timelineOpt.cursor,
                    filter: 'posts_with_media'
                }, {signal});

                const mediaPosts = mediaRes.data.feed.filter(item =>
                    AppBskyEmbedImages.isView(item.post?.embed) ||
                    AppBskyEmbedImages.isView(item.post?.embed?.media)
                );

                return {
                    data: {
                        cursor: mediaRes.data.cursor,
                        feed: mediaPosts,
                    }
                }
            case 'authorVideo':
                const videoRes = await this.agent.api.app.bsky.feed.getAuthorFeed({
                    actor: timelineOpt.algorithm.algorithm,
                    limit: timelineOpt.limit,
                    cursor: timelineOpt.cursor,
                    filter: 'posts_with_video'
                }, {signal});

                const videoPosts = videoRes.data.feed.filter(item =>
                  AppBskyEmbedVideo.isView(item.post?.embed) ||
                  AppBskyEmbedImages.isView(item.post?.embed?.media)
                );

                return {
                    data: {
                        cursor: videoRes.data.cursor,
                        feed: videoPosts,
                    }
                }
            case 'myPost':
                return await this.agent.api.app.bsky.feed.getAuthorFeed({limit: timelineOpt.limit, cursor: timelineOpt.cursor, actor: this.did() as string}, {signal});
            case 'myMedia':
                return await this.agent.api.app.bsky.feed.getAuthorFeed({limit: timelineOpt.limit, cursor: timelineOpt.cursor, actor: this.did() as string, filter: 'posts_with_media'}, {signal});
            default:
                return await this.agent.api.app.bsky.feed.getTimeline({ limit: timelineOpt.limit, cursor: timelineOpt.cursor }, {signal});
        }
    }

    async getAuthorsFeed(actors, count: number) {
        let promises = [];
        actors.forEach(member => {
            if (member.cursor !== undefined || count === 0) {
                const res = this.agent.api.app.bsky.feed.getAuthorFeed({
                    actor: member.actor,
                    limit: member.limit || 20,
                    cursor: member.cursor || '',
                })
                promises.push(res);
            }
        })

        let res = [];
        await Promise.allSettled(promises)
            .then((results) => {
                results.forEach((result, index) => {
                    if (result.status === 'fulfilled') {
                        res.push(result.value)
                    }
                })
            });

        return res;
    }

    async setVote(cid: string, uri: string, likeUri = '', via = undefined) {
        if (!likeUri) {
            return await this.agent.api.app.bsky.feed.like.create(
                {repo: this.did()},
                {subject: {cid: cid, uri: uri}, via, createdAt: new Date().toISOString()},
            );
        } else {
            const rkey = likeUri.split('/').slice(-1)[0];

            return await this.agent.api.app.bsky.feed.like.delete(
                {repo: this.did(), rkey: rkey},
                {subject: {cid: cid, uri: uri}, createdAt: new Date().toISOString()},
            );
        }
    }

    async setRepost(cid: string, uri: string, repostUri: string = '', via = undefined) {
        if (!repostUri) {
            return await this.agent.api.app.bsky.feed.repost.create(
                { repo: this.did() },
                { subject: { cid: cid, uri: uri }, via, createdAt: new Date().toISOString() },
            );
        } else {
            const rkey = repostUri.split('/').slice(-1)[0];

            return await this.agent.api.app.bsky.feed.repost.delete(
                {rkey: rkey, repo: this.did() },
            );
        }
    }

    async getVotes(uri: string) {
        const res = await this.agent.api.app.bsky.feed.getLikes({uri: uri});
        return res.data.likes;
    }

    async getFeed(uri: string, depth: number = 0) {
        const res = await this.agent.api.app.bsky.feed.getPostThread({uri: uri, depth: depth});
        return res.data.thread;
    }

    async getNotificationCount() {
        const res = await this.agent.api.app.bsky.notification.getUnreadCount();
        return res.data.count;
    }

    async getPreferences() {
        const res = await this.agent.api.app.bsky.actor.getPreferences();
        return res.data.preferences;
    }

    async getSavedFeeds() {
        try {
            const preferences = await this.getPreferences();
            const savedFeeds = preferences.filter(preference => preference.$type === 'app.bsky.actor.defs#savedFeedsPref')[0]?.saved;

            if (savedFeeds && savedFeeds.length) {
                const res = await this.agent.api.app.bsky.feed.getFeedGenerators({feeds: savedFeeds});
                let customFeeds = [];
                res.data.feeds.forEach(feed => {
                    customFeeds = [...customFeeds, {
                        uri: feed.uri,
                        name: feed.displayName,
                    }]
                })
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
        const res = await this.agent.api.app.bsky.graph.getList({list: uri});
        const items = res.data.items;
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
        try {
            const res = await this.agent.api.chat.bsky.convo.getLog({cursor: this.latestRev}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });

            if (this.latestRev !== res.data.cursor) {
                this.updateChatCount();
            }

            this.latestRev = res.data.cursor || '';
            return res.data.logs;
        } catch (e) {
            if (e.message === 'XRPCNotSupported') {
                setTimeout(() => {
                    this.updateChatCount();
                }, 1000);
            } else {
                console.error(e);
                return [];
            }
        }
    }

    async updateChatCount() {
        try {
            const res = await this.agent.chat.bsky.convo.listConvos({}, {
                headers: {
                    'atproto-proxy': CHAT_PROXY,
                }
            });
            const convos = res?.data?.convos || [];
            const count = convos.reduce((acc, val) => {
                return acc + val.unreadCount;
            }, 0)

            this.updateChatUnread(count);
            chatState.updateTotalChatCount();
        } catch (e) {
            if (e.message === 'XRPCNotSupported') {
                setTimeout(() => {
                    this.updateChatCount();
                }, 1000);
            }
        }
    }

    updateChatUnread(count: number) {
        this.unreadChat = count;
    }

    async getAvatar(did: string) {
        try {
            const res = await this.agent.api.app.bsky.actor.getProfile({actor: did});
            return res.data.avatar;
        } catch (e) {
            console.error(e);
            return undefined;
        }
    }

    async getFeedsFromRecords(records) {
        const uris = records.map(record => {
            return record.value.subject.uri;
        })

        const res = await this.agent.api.app.bsky.feed.getPosts({uris: uris});
        let feeds = [];
        res.data.posts.forEach(post => {
            feeds.push({
                post: post,
            })
        });
        return feeds;
    }
}
