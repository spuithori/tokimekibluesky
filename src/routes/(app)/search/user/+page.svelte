<script>
    import { page } from '$app/stores';
    import SearchForm from '../../SearchForm.svelte';
    import { agent } from '$lib/stores';
    import {_} from "svelte-i18n";
    let feeds = [];
    let cursor = '';
    import { fly } from 'svelte/transition';
    import InfiniteLoading from "svelte-infinite-loading";
    import UserItem from "../../profile/[handle]/UserItem.svelte";
    let users = [];

    let il;

    $: getSearchFeeds($page.url.searchParams.get('q'));

    async function getSearchFeeds(query) {
        if (query) {
            console.log('refresh')
            users = [];
            cursor = undefined;
            il.$$.update();
        }
    }

    async function handleLoadMore({ detail: { loaded, complete } }) {
        let raw = await $agent.agent.api.app.bsky.actor.searchActors({term: $page.url.searchParams.get('q') || '', limit: 20, cursor: cursor});
        cursor = raw.data.cursor;

        if (cursor) {
            users = [...users, ...raw.data.actors];

            loaded();
        } else {
            complete();
        }
    }
</script>

<div class="user-timeline">
  <SearchForm></SearchForm>

  {#each users as user (user)}
    <UserItem user={user}></UserItem>
  {/each}

  <InfiniteLoading on:infinite={handleLoadMore} bind:this={il}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>

<style>

</style>