import type { AppBskyFeedGetTimeline, AtpAgent } from '@atproto/api';

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

    async getTimeline(limit: number = 20, cursor: string = ''): Promise<AppBskyFeedGetTimeline.Response["data"]> {
        const dataRaw = await this.agent.api.app.bsky.feed.getTimeline({ limit: limit, cursor: cursor });
        const data = dataRaw.data;

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

    async setRepost(cid: string, uri: string) {
        await this.agent.api.app.bsky.feed.repost.create(
            { repo: this.did() },
            { subject: { cid: cid, uri: uri } , createdAt: new Date().toISOString() },
        );
    }

    async getVotes(uri: string) {
        const datum = await this.agent.api.app.bsky.feed.getLikes({uri: uri});
        return datum.data.likes;
    }

    async myVoteCheck(uri: string): Promise<boolean> {
        const votes = await this.getVotes(uri);
        const found = votes.some(vote => vote.actor.did === this.did())
        return found;
    }

    async getFeed(uri: string, depth: number = 0) {
        const feed = await this.agent.api.app.bsky.feed.getPostThread({uri: uri, depth: depth})

        return feed.data.thread;
    }

    async getNotificationCount() {
        const count = await this.agent.api.app.bsky.notification.getUnreadCount()

        return count.data.count;
    }
}
