<script>
    import { page } from '$app/stores';
    import SearchForm from '../../SearchForm.svelte';
    import { agent } from '$lib/stores';
    let cursor = '';
    import InfiniteLoading from "svelte-infinite-loading";
    import FeedsItem from "$lib/components/feeds/FeedsItem.svelte";
    import {onMount} from "svelte";
    let feeds = [];
    let savedFeeds = [];

    let il;
    let _agent = $agent;

    $: getSearchFeeds($page.url.searchParams.get('q'));

    async function getSavedFeeds () {
        const preferenceRes = await _agent.agent.api.app.bsky.actor.getPreferences()
        const preference = preferenceRes.data.preferences.filter(preference => preference.$type === 'app.bsky.actor.defs#savedFeedsPref')
        savedFeeds = preference[0]?.saved || [];
    }

    function isSaved(feed) {
        const uri = feed.uri;
        return savedFeeds.includes(uri);
    }

    async function getSearchFeeds(query) {
        if (query) {
            console.log('refresh')
            feeds = [];
            cursor = undefined;
            il.$$.update();
        }
    }
    async function handleLoadMore({ detail: { loaded, complete } }) {
        let raw = await _agent.agent.api.app.bsky.unspecced.getPopularFeedGenerators({query: $page.url.searchParams.get('q') || '' , limit: 20, cursor: cursor});
        cursor = raw.data.cursor;

        if (cursor) {
            feeds = [...feeds, ...raw.data.feeds];

            loaded();
        } else {
            complete();
        }
    }

    onMount(async () => {
        await getSavedFeeds();
    })
</script>

<div class="user-timeline">
  <SearchForm></SearchForm>

  {#each feeds as feed (feed)}
    <FeedsItem feed={feed} subscribed={isSaved(feed)} on:close></FeedsItem>
  {/each}

  <InfiniteLoading on:infinite={handleLoadMore} bind:this={il}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>

<style>

</style>