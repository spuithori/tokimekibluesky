import type {AppBskyFeedGetTimeline, AtpAgent} from '@atproto/api';
import toast from "svelte-french-toast";
import {AppBskyEmbedImages} from "@atproto/api";

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

    async getTimeline(limit: number = 25, cursor: string = ''): Promise<AppBskyFeedGetTimeline.Response["data"] | undefined> {
        try {
            const res = await this.agent.api.app.bsky.feed.getTimeline({ limit: limit, cursor: cursor });
            return res.data;
        } catch (e) {
            toast.error('Error');
            console.error(e);
            return undefined;
        }
    }

    async getMediaTimeline(limit: number = 25, cursor: string = ''): Promise<AppBskyFeedGetTimeline.Response["data"] | undefined> {
        const data = await this.getTimeline(limit, cursor);

        const filtered = data.feed.filter(item => {
            return item.post.embed && AppBskyEmbedImages.isView(item.post.embed);
        });

        data.feed = filtered;
        return data;
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
            await this.agent.api.app.bsky.feed.repost.create(
                { repo: this.did() },
                { subject: { cid: cid, uri: uri } , createdAt: new Date().toISOString() },
            );
        } else {
            const rkey = repostUri.split('/').slice(-1)[0];

            await this.agent.api.app.bsky.feed.repost.delete(
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
