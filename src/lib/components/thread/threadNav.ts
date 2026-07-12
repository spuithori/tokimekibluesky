import { goto } from '$app/navigation';
import { getColumnState } from '$lib/classes/columnState.svelte';
import { junkAgentDid } from '$lib/stores';
import { defaultDeckSettings } from '$lib/components/deck/defaultDeckSettings';

export function createThreadOpener() {
    const junkColumnState = getColumnState(true);

    return function openThread(feedViewItem: any, _agent: any): void {
        const post = feedViewItem?.post;
        if (!post?.uri || !post?.author?.did) {
            return;
        }

        const rkey = post.uri.split('/').slice(-1)[0];
        const uri = '/profile/' + post.author.did + '/post/' + rkey;

        if (uri === location.pathname) {
            return;
        }

        if (!junkColumnState.hasColumn('thread_' + rkey)) {
            junkColumnState.add({
                id: 'thread_' + rkey,
                algorithm: {
                    algorithm: 'at://' + post.author.did + '/app.bsky.feed.post/' + rkey,
                    type: 'thread',
                    name: 'Thread',
                },
                style: 'default',
                settings: defaultDeckSettings,
                did: _agent.did(),
                handle: _agent.handle(),
                data: {
                    feed: [feedViewItem],
                    cursor: '',
                }
            });
        }

        junkAgentDid.set(_agent.did());
        goto(uri);
    };
}
