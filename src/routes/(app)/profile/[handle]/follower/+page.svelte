<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { LayoutData } from '../$types';
    import {agent} from "$lib/stores";
    import UserItem from "../UserItem.svelte";
    import InfiniteScroll from "svelte-infinite-scroll";
    import {onMount} from "svelte";
    let followers = [];
    let cursor = '';
    let finishLoading = false;

    export let data: LayoutData;

    async function handleLoadMore() {
        let raw = await $agent.agent.api.app.bsky.graph.getFollowers({user: data.params.handle, limit: 20, before: cursor});
        cursor = raw.data.cursor;

        if (!cursor) {
            finishLoading = true;
        }

        if (!finishLoading) {
            for (const item of raw.data.followers) {
                followers.push(item);
            }
            followers = followers;
        }
    }

    onMount(async () => {
        let raw = await $agent.agent.api.app.bsky.graph.getFollowers({user: data.params.handle, limit: 20});
        cursor = raw.data.cursor;
        if (!cursor) {
            finishLoading = true;
        }
        followers = raw.data.followers;
    })
</script>

<svelte:head>
  <title>{data.params.handle} {$_('page_title_followers')} - TOKIMEKI Bluesky</title>
</svelte:head>

<div class="user-timeline">
  {#each followers as user (user)}
    <UserItem user={user}></UserItem>
  {/each}
  <InfiniteScroll window threshold="750" on:loadMore={handleLoadMore} ></InfiniteScroll>
</div>

<style>

</style>