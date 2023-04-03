export const Agent = class {
    public agent: object;

    constructor(agent) {
        this.agent = agent;
    }

    did() {
        return this.agent.session.did;
    }

    async getTimeline(limit = 20, cursor = '') {
        const dataRaw = await this.agent.api.app.bsky.feed.getTimeline({ limit: limit, cursor: cursor });
        const data = dataRaw.data;

        return data;
    }

    async setVote(cid, uri, likeUri = '') {
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

    async setRepost(cid, uri) {
        await this.agent.api.app.bsky.feed.repost.create(
            { repo: this.did() },
            { subject: { cid: cid, uri: uri } , createdAt: new Date().toISOString() },
        );
    }

    async getVotes(uri) {
        const datum = await this.agent.api.app.bsky.feed.getLikes({uri: uri});
        return datum.data.likes;
    }

    async myVoteCheck(uri) {
        const votes = await this.getVotes(uri);
        const found = votes.find(vote => vote.actor.did === this.did())
        return found;
    }

    async getFeed(uri, depth = 0) {
        const feed = await this.agent.api.app.bsky.feed.getPostThread({uri: uri, depth: depth})

        return feed.data.thread;
    }

    async getNotificationCount() {
        const count = await this.agent.api.app.bsky.notification.getUnreadCount()

        return count.data.count;
    }
}
