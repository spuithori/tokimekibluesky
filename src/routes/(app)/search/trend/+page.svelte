<script>
    import { agent } from '$lib/stores';
    import InfiniteLoading from "svelte-infinite-loading";
    import FeedsItem from "$lib/components/feeds/FeedsItem.svelte";
    import {tick} from "svelte";
    let cursor = '';
    let feeds = $state([]);
    let savedFeeds = [];
    let _agent = $agent;
    let tempTimeout = $state(false);

    async function handleLoadMore({ detail: { loaded, complete } }) {
        try {
            let raw = await _agent.agent.api.app.bsky.unspecced.getTrendingTopics({ limit: 20 }, {
                headers: {
                    'accept-language': 'ja',
                }
            });
            // feeds = [...feeds, ...raw.data.feeds];

            console.log(raw);
            complete();
        } catch (e) {
            console.error(e);
            complete();
        }
    }

    tick().then(() => {
        tempTimeout = true;
    })
</script>

<div class="divider"></div>

<div class="user-timeline">
  {#each feeds as feed (feed)}
    <FeedsItem feed={feed} subscribed={isSaved(feed)} on:close></FeedsItem>
  {/each}

  {#if tempTimeout}
    <InfiniteLoading on:infinite={handleLoadMore}>
      {#snippet noMore()}
        <p class="infinite-nomore">もうないよ</p>
      {/snippet}
    </InfiniteLoading>
  {/if}
</div>

<style lang="postcss">
    .divider {
        padding-top: 16px;
    }
</style>