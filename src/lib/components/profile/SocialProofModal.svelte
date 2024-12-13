<script>
    import {_} from "svelte-i18n";
    import InfiniteLoading from 'svelte-infinite-loading';
    import UserItem from "../../../routes/(app)/profile/[handle]/UserItem.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";

    let { actor, _agent } = $props();
    let followers = $state([]);
    let cursor;

    async function handleLoadMore({ detail: { loaded, complete } }) {
        try {
            const res = await _agent.agent.api.app.bsky.graph.getKnownFollowers({actor: actor, cursor: cursor});
            console.log(res)
            cursor = res.data.cursor;
            followers = [...followers, ...res.data.followers];

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

<Modal title={$_('social_proof_users')} on:close>
  <div class="likes">
    {#each followers as actor}
      {#if (!actor.viewer?.muted)}
        <UserItem user={actor}></UserItem>
      {/if}
    {/each}
  </div>

  <InfiniteLoading on:infinite={handleLoadMore}>
    {#snippet noMore()}
        <p  class="infinite-nomore">もうないよ</p>
      {/snippet}
    {#snippet noResults()}
        <p ></p>
      {/snippet}
  </InfiniteLoading>
</Modal>
