import type {AppBskyFeedGetTimeline, AtpAgent} from '@atproto/api';
import {AppBskyEmbedImages} from "@atproto/api";
import toast from "svelte-french-toast";
import {time} from "svelte-i18n";
import type { currentAlgorithm } from "../app.d.ts";

type timelineOpt = {
    limit: number,
    cursor: string,
    algorithm?: currentAlgorithm,
    type: 'default' | 'media',
    uris?: [],
    actors?: [],
}

export class Agent {
    public agent: AtpAgent;

    constructor(agent: AtpAgent) {
        this.agent = agent;
    }

    did(): string | undefined {
        if (this.agent.session) {
            return this.agent.session.did;
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
            toast.error('Error');
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
                return await this.getAuthorsFeed(timelineOpt.actors);
            case 'bookmark':
                return await this.agent.api.app.bsky.feed.getPosts({uris: timelineOpt.uris || []});
            default:
                return await this.agent.api.app.bsky.feed.getTimeline({ limit: timelineOpt.limit, cursor: timelineOpt.cursor });
        }
    }

    async getAuthorsFeed(actors) {
        let promises = [];
        actors.forEach(member => {
            if (member.cursor !== undefined) {
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
}
