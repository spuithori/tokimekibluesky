export const Agent = class {
    public agent: object;

    constructor(agent) {
        this.agent = agent;
    }

    did() {
        return this.agent.session.did;
    }

    async getTimeline(limit = 20, before = '') {
        const dataRaw = await this.agent.api.app.bsky.feed.getTimeline({ limit: limit, before: before });
        const data = dataRaw.data;

        return data;
    }

    async setVote(cid, uri) {
        const alreadyVoted = await this.myVoteCheck(uri)

        await this.agent.api.app.bsky.feed.setVote(
            { direction: alreadyVoted ? 'none' : 'up', subject: { cid: cid, uri: uri } }
        );
    }

    async setRepost(cid, uri) {
        await this.agent.api.app.bsky.feed.repost.create(
            { did: await this.did() },
            { subject: { cid: cid, uri: uri } , createdAt: new Date().toISOString() },
        );
    }

    async getVotes(uri) {
        const datum = await this.agent.api.app.bsky.feed.getVotes({uri: uri});
        // console.log(datum.data.votes)
        return datum.data.votes;
    }

    async myVoteCheck(uri) {
        const votes = await this.getVotes(uri);

        const found = votes.find(vote => vote.actor.did === this.did())
        return found;
    }

    async getFeed(uri, depth = 0) {
        const feed = await this.agent.api.app.bsky.feed.getPostThread({uri: uri, depth: depth})

        return feed.data.thread
    }
}
