import type { Agent } from '$lib/agent';

export const LIKE_COLLECTION = 'tech.tokimeki.plugin.like';

export async function hasLiked(_agent: Agent, id: string): Promise<boolean> {
    try {
        await _agent.xrpc.get('com.atproto.repo.getRecord', { repo: _agent.did(), collection: LIKE_COLLECTION, rkey: id });
        return true;
    } catch {
        return false;
    }
}

export async function likePlugin(_agent: Agent, plugin: { id: string; uri: string; cid: string }): Promise<void> {
    await _agent.xrpc.post('com.atproto.repo.putRecord', {
        repo: _agent.did(),
        collection: LIKE_COLLECTION,
        rkey: plugin.id,
        validate: false,
        record: {
            $type: LIKE_COLLECTION,
            subject: { uri: plugin.uri, cid: plugin.cid },
            createdAt: new Date().toISOString(),
        },
    });
}

export async function unlikePlugin(_agent: Agent, id: string): Promise<void> {
    await _agent.xrpc.post('com.atproto.repo.deleteRecord', {
        repo: _agent.did(),
        collection: LIKE_COLLECTION,
        rkey: id,
    });
}
