<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { LayoutData } from '../$types';
    import {agent} from "$lib/stores";
    import UserItem from "../UserItem.svelte";
    import {onMount} from "svelte";
    import InfiniteLoading from 'svelte-infinite-loading';
    let followers = [];
    let cursor = '';

    export let data: LayoutData;

    async function handleLoadMore({ detail: { loaded, complete } }) {
        let raw = await $agent.agent.api.app.bsky.graph.getFollowers({actor: data.params.handle, limit: 20, cursor: cursor});
        cursor = raw.data.cursor;

        if (cursor) {
            for (const item of raw.data.followers) {
                followers.push(item);
            }
            followers = followers;

            loaded();
        } else {
            complete();
        }
    }
</script>

<svelte:head>
  <title>{data.params.handle} {$_('page_title_followers')} - TOKIMEKI Bluesky</title>
</svelte:head>

<div class="user-timeline">
  {#each followers as user (user)}
    <UserItem user={user}></UserItem>
  {/each}

  <InfiniteLoading on:infinite={handleLoadMore}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>

<style>

</style>