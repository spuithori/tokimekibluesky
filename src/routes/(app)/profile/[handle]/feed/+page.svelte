<script lang="ts">
    import { m } from "$lib/paraglide/messages.js";
    import type { LayoutData } from '../$types';
    import {agent} from "$lib/stores";
    import FeedsItem from "$lib/components/feeds/FeedsItem.svelte";
    import {onMount} from "svelte";
    import Infinite from "$lib/components/utils/Infinite.svelte";
    let feeds = $state([]);
    let cursor: string | undefined = '';
    let savedFeeds = [];

  interface Props {
    data: LayoutData;
  }

  let { data }: Props = $props();

    async function getSavedFeeds () {
        const preferenceRes = await $agent.agent.api.app.bsky.actor.getPreferences()
        const preference = preferenceRes.data.preferences.filter(preference => preference.$type === 'app.bsky.actor.defs#savedFeedsPref')
        savedFeeds = preference[0]?.saved || [];
    }

    function isSaved(feed) {
        const uri = feed.uri;
        return savedFeeds.includes(uri);
    }

    async function handleLoadMore(loaded, complete) {
        try {
            let raw = await $agent.agent.api.app.bsky.feed.getActorFeeds({actor: data.params.handle, limit: 20, cursor: cursor});
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

    onMount(async () => {
        await getSavedFeeds();
    })
</script>

<svelte:head>
  <title>{data.params.handle} {m.page_title_feeds()} - TOKIMEKI</title>
</svelte:head>

<div class="user-lists-list-wrap">
  <div class="user-lists-list">
    {#each feeds as feed (feed)}
      <FeedsItem {feed} subscribed={isSaved(feed)}></FeedsItem>
    {/each}
  </div>

  <Infinite oninfinite={handleLoadMore}></Infinite>
</div>

<style lang="postcss">
    .user-lists-list-wrap {
        padding: 16px;
    }
</style>