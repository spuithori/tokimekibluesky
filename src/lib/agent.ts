import type {AppBskyFeedGetTimeline, BskyAgent} from '@atproto/api';
import {AppBskyEmbedImages} from "@atproto/api";
import type { currentAlgorithm } from "../app.d.ts";
import {parseISO} from "date-fns";

type timelineOpt = {
    limit: number,
    cursor: string,
    algorithm?: currentAlgorithm,
    type: 'default' | 'media',
    uris?: [],
    actors?: [],
    count?: number,
}

export class Agent {
    public agent: BskyAgent;

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

    async getTimeline(timelineOpt: timelineOpt = {limit: 20, cursor: '', type: 'default'}): Promise<AppBskyFeedGetTimeline.Response["data"] | undefined> {
        try {
            let res;
            res = await this.getTimelineByAlgo(timelineOpt);

            if (timelineOpt.type === 'media') {
                res.data.feed = res.data.feed.filter(item => {
                    return item.post.embed && AppBskyEmbedImages.isView(item.post.embed);
                });
            }

            return res;
        } catch (e) {
            // toast.error('Error');
            console.error(e);
            return undefined;
        }
    }

    async getTimelineByAlgo(timelineOpt: timelineOpt) {
        switch (timelineOpt.algorithm.type) {
            case 'custom':
                return await this.agent.api.app.bsky.feed.getFeed({
                    limit: timelineOpt.limit, cursor: timelineOpt.cursor, feed: timelineOpt.algorithm.algorithm});
            case 'list':
                return await this.getAuthorsFeed(timelineOpt.actors, timelineOpt.count);
            case 'officialList':
                return await this.agent.api.app.bsky.feed.getListFeed({
                    limit: timelineOpt.limit, cursor: timelineOpt.cursor, list: timelineOpt.algorithm.algorithm})
            case 'bookmark':
                return await this.agent.api.app.bsky.feed.getPosts({uris: timelineOpt.uris || []});
            case 'like':
                return await this.agent.api.app.bsky.feed.getActorLikes({limit: timelineOpt.limit, cursor: timelineOpt.cursor, actor: this.did() as string});
            case 'search':
                const res =  await this.agent.api.app.bsky.feed.searchPosts({q: timelineOpt.algorithm.algorithm, limit: timelineOpt.limit, cursor: timelineOpt.cursor});
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
            case 'myPost':
                return await this.agent.api.app.bsky.feed.getAuthorFeed({limit: timelineOpt.limit, cursor: timelineOpt.cursor, actor: this.did() as string});
            case 'myMedia':
                return await this.agent.api.app.bsky.feed.getAuthorFeed({limit: timelineOpt.limit, cursor: timelineOpt.cursor, actor: this.did() as string, filter: 'posts_with_media'});
            default:
                return await this.agent.api.app.bsky.feed.getTimeline({ limit: timelineOpt.limit, cursor: timelineOpt.cursor });
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

    async setVote(cid: string, uri: string, likeUri = '') {
        if (!likeUri) {
            return await this.agent.api.app.bsky.feed.like.create(
                {repo: this.did()},
                {subject: {cid: cid, uri: uri}, createdAt: new Date().toISOString()},
            );
        } else {
            const rkey = likeUri.split('/').slice(-1)[0];

            return await this.agent.api.app.bsky.feed.like.delete(
                {repo: this.did(), rkey: rkey},
                {subject: {cid: cid, uri: uri}, createdAt: new Date().toISOString()},
            );
        }
    }

    async setRepost(cid: string, uri: string, repostUri: string = '') {
        if (!repostUri) {
            return await this.agent.api.app.bsky.feed.repost.create(
                { repo: this.did() },
                { subject: { cid: cid, uri: uri } , createdAt: new Date().toISOString() },
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

    async myVoteCheck(uri: string): Promise<boolean> {
        const res = await this.getVotes(uri);
        return res.some(vote => vote.actor.did === this.did());
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
}
