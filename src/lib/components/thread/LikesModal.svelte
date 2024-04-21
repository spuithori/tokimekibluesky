<script>
    import {_} from "svelte-i18n";
    import {createEventDispatcher} from 'svelte';
    import { agent } from "$lib/stores";
    const dispatch = createEventDispatcher();
    import InfiniteLoading from 'svelte-infinite-loading';
    import UserItem from "../../../routes/(app)/profile/[handle]/UserItem.svelte";
    import Modal from "$lib/components/ui/Modal.svelte";

    export let uri;
    let likes = [];
    let cursor;

    async function handleLoadMore({ detail: { loaded, complete } }) {
        try {
            const res = await $agent.agent.api.app.bsky.feed.getLikes({uri: uri, cursor: cursor});
            cursor = res.data.cursor;
            likes = [...likes, ...res.data.likes];

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

<Modal title="{$_('liked_users')}" on:close>
  <div class="likes">
    {#each likes as like }
      {#if (!like.actor.viewer?.muted)}
        <UserItem user={like.actor}></UserItem>
      {/if}
    {/each}
  </div>

  <InfiniteLoading on:infinite={handleLoadMore}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
    <p slot="noResults"></p>
  </InfiniteLoading>
</Modal>
