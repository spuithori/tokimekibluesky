<script lang="ts">
  import {agent} from "$lib/stores";
  import {onMount} from "svelte";
  import InfiniteLoading from "svelte-infinite-loading";
  import TimelineItem from "../../../../TimelineItem.svelte";
  import FeedsItem from "$lib/components/feeds/FeedsItem.svelte";

  export let id;
  export let handle;
  export let title = '';

  let timeline = [];
  let cursor = undefined;
  let feed;
  let savedFeeds = [];

  const handleLoadMore = async ({ detail: { loaded, complete } }) => {
      try {
          const uri = 'at://' + handle + '/app.bsky.feed.generator/' + id;
          const res = await $agent.getTimeline({limit: 20, cursor: cursor, algorithm: {
                  type: 'custom',
                  algorithm: uri,
              }});
          cursor = res.data.cursor;
          timeline = [...timeline, ...res.data.feed]

          if (cursor && res.data.feed.length) {
              loaded();
          } else {
              complete();
          }
      } catch (e) {
          console.error(e);
          complete();
      }
  }

  async function getSavedFeeds () {
      const preferenceRes = await $agent.agent.api.app.bsky.actor.getPreferences()
      const preference = preferenceRes.data.preferences.filter(preference => preference.$type === 'app.bsky.actor.defs#savedFeedsPref')
      savedFeeds = preference[0]?.saved || [];
  }

  function isSaved(feed) {
      const uri = feed.uri;
      return savedFeeds.includes(uri);
  }

  onMount(async () => {
      await getSavedFeeds();
      const res = await $agent.agent.api.app.bsky.feed.getFeedGenerator({feed: 'at://' + handle + '/app.bsky.feed.generator/' + id});

      if (res.data.isOnline) {
          feed = res.data.view;
          title = feed.displayName;
      }
  })
</script>

<div class="page-feeds-item">
  {#if (feed)}
    <FeedsItem feed={feed} subscribed={isSaved(feed)} layout={'page'} on:close></FeedsItem>
  {/if}
</div>

<div class="timeline timeline--main">
  {#each timeline as data, index (data)}
    <TimelineItem data={ data } index={index}></TimelineItem>
  {/each}

  <InfiniteLoading on:infinite={handleLoadMore}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>

<style lang="postcss">
    .page-feeds-item {
        padding: 16px 16px 0;
    }
</style>