<script lang="ts">
    import type { LayoutData } from '../$types';
    import {agent} from "$lib/stores";
    import UserItem from "../UserItem.svelte";
    import InfiniteScroll from "svelte-infinite-scroll";
    import {onMount} from "svelte";
    let follows = [];
    let cursor = '';
    let finishLoading = false;

    export let data: LayoutData;

    async function handleLoadMore() {
        let raw = await $agent.agent.api.app.bsky.graph.getFollows({user: data.params.handle, limit: 20, before: cursor});
        cursor = raw.data.cursor
        console.log('aaa')

        if (!cursor) {
            finishLoading = true;
        }

        if (!finishLoading) {
            for (const item of raw.data.follows) {
                follows.push(item);
            }
            follows = follows;
        }
    }

    onMount(async () => {
        let raw = await $agent.agent.api.app.bsky.graph.getFollows({user: data.params.handle, limit: 20});
        cursor = raw.data.cursor;
        if (!cursor) {
            finishLoading = true;
        }
        follows = raw.data.follows;
    })
</script>

<svelte:head>
  <title>{data.params.handle} のフォロー - TokimekiBluesky</title>
</svelte:head>

<div class="user-timeline">
  {#each follows as user (user)}
    <UserItem user={user}></UserItem>
  {/each}
  <InfiniteScroll window threshold="750" on:loadMore={handleLoadMore} ></InfiniteScroll>
</div>

<style>

</style>