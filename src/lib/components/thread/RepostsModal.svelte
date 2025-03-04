<script>
    import {_} from "svelte-i18n";
    import { agent } from "$lib/stores";
    import InfiniteLoading from 'svelte-infinite-loading';
    import UserItem from "../../../routes/(app)/profile/[handle]/UserItem.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";

    let { uri, _agent = $agent, onclose } = $props();
    let reposts = $state([]);
    let cursor;

    async function handleLoadMore({ detail: { loaded, complete } }) {
        try {
            const res = await _agent.agent.api.app.bsky.feed.getRepostedBy({uri: uri, cursor: cursor});
            cursor = res.data.cursor;
            reposts = [...reposts, ...res.data.repostedBy];

            if (cursor) {
                loaded();
            } else {
                complete();
            }
        } catch (e) {
            console.error(e);
            complete();
        }
    }
</script>

<Modal title={$_('reposted_users')} size="small" {onclose}>
    <div class="likes">
        {#each reposts as repost }
            {#if (!repost.viewer?.muted)}
                <UserItem user={repost}></UserItem>
            {/if}
        {/each}
    </div>

    <InfiniteLoading on:infinite={handleLoadMore}>
        {#snippet noMore()}
            <p class="infinite-nomore"><span>{$_('no_more')}</span></p>
        {/snippet}
        {#snippet noResults()}
            <p class="infinite-nomore"><span>{$_('no_more')}</span></p>
        {/snippet}
    </InfiniteLoading>
</Modal>
