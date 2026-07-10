<script lang="ts">
    import { page } from '$app/stores';
    import { agent } from '$lib/stores';
    import { getContext, onMount } from "svelte";
    import FeedsItem from "$lib/components/feeds/FeedsItem.svelte";
    import SearchResultList from "$lib/components/search/SearchResultList.svelte";
    import { SAVED_FEEDS_CONTEXT, type SavedFeedsContext } from "../savedFeedsContext";
    import type { FeedGenerator } from "$lib/search/types";

    let q = $derived($page.url.searchParams.get('q') ?? '');

    const savedFeeds = getContext<SavedFeedsContext>(SAVED_FEEDS_CONTEXT);
    onMount(() => savedFeeds?.ensure());

    async function load(cursor: string | undefined, signal: AbortSignal) {
        const res = await $agent.xrpc.get<{ feeds: FeedGenerator[]; cursor?: string }>('app.bsky.unspecced.getPopularFeedGenerators', { query: q, limit: 20, cursor }, { signal });
        return { items: res.feeds ?? [], cursor: res.cursor };
    }
</script>

<div class="divider"></div>

<div class="user-timeline">
  <SearchResultList {load} key={(feed) => feed.uri}>
    {#snippet item(feed)}
      <FeedsItem {feed} subscribed={savedFeeds?.value.includes(feed.uri) ?? false}></FeedsItem>
    {/snippet}
  </SearchResultList>
</div>

<style lang="postcss">
  .divider {
      padding-top: 16px;
  }
</style>
