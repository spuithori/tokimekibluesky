<script>
    import { page } from '$app/stores';
    import { agent } from '$lib/stores';
    import FeedsItem from "$lib/components/feeds/FeedsItem.svelte";
    import {onMount, tick} from "svelte";
    import Infinite from "$lib/components/utils/Infinite.svelte";
    let cursor = '';
    let feeds = $state([]);
    let savedFeeds = [];
    let _agent = $agent;
    let tempTimeout = $state(false);

    $effect(() => {
        getSearchFeeds($page.url.searchParams.get('q'));
    })

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
            feeds = [];
            cursor = undefined;
        }
    }
    async function handleLoadMore(loaded, complete) {
        try {
            let raw = await _agent.agent.api.app.bsky.unspecced.getPopularFeedGenerators({query: $page.url.searchParams.get('q') || '' , limit: 20, cursor: cursor});
            cursor = raw.data.cursor;
            feeds = [...feeds, ...raw.data.feeds];

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

    tick().then(() => {
        tempTimeout = true;
    })

    onMount(async () => {
        await getSavedFeeds();
    })
</script>

<div class="divider"></div>

<div class="user-timeline">
  {#each feeds as feed (feed)}
    <FeedsItem feed={feed} subscribed={isSaved(feed)} on:close></FeedsItem>
  {/each}

  <Infinite oninfinite={handleLoadMore}></Infinite>
</div>

<style lang="postcss">
  .divider {
      padding-top: 16px;
  }
</style>