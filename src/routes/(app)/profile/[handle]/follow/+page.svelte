<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { LayoutData } from '../$types';
    import {agent} from '$lib/stores';
    import UserItem from '../UserItem.svelte';
    import {onMount} from 'svelte';
    import InfiniteLoading from 'svelte-infinite-loading';
    let follows = [];
    let cursor = '';

    export let data: LayoutData;

    async function handleLoadMore({ detail: { loaded, complete } }) {
        let raw = await $agent.agent.api.app.bsky.graph.getFollows({actor: data.params.handle, limit: 20, cursor: cursor});
        cursor = raw.data.cursor;

        if (cursor) {
            for (const item of raw.data.follows) {
                follows.push(item);
            }
            follows = follows;

            loaded();
        } else {
            complete();
        }
    }
</script>

<svelte:head>
  <title>{data.params.handle} {$_('page_title_follows')} - TOKIMEKI Bluesky</title>
</svelte:head>

<div class="user-timeline">
  {#each follows as user (user)}
    <UserItem user={user}></UserItem>
  {/each}

  <InfiniteLoading on:infinite={handleLoadMore}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>

<style>

</style>