<script lang="ts">
  import { agent, cursor } from '$lib/stores';
  import { timeline, currentAlgorithm, timelineStyle, settings } from "$lib/stores";
  import TimelineItem from "./TimelineItem.svelte";
  import InfiniteLoading from 'svelte-infinite-loading';
  import {afterUpdate} from 'svelte';
  import MediaTimelineItem from "./MediaTimelineItem.svelte";

  export let isRefreshing;
  let il;

  const handleLoadMore = async ({ detail: { loaded, complete } }) => {
      if (!isRefreshing) {
          const res = await $agent.getTimeline({limit: 20, cursor: $cursor, algorithm: $currentAlgorithm});
          cursor.set(res.data.cursor);

          console.log($cursor)

          if ($cursor) {
              timeline.update(function (tl) {
                  return [...tl, ...res.data.feed];
              });
              console.log($timeline);

              loaded();
          } else {
              complete();
          }
      }
  }

  afterUpdate(async() => {
      // il.$$.update();
  })
</script>

<div class="timeline timeline--main" class:hide-repost={$settings?.timeline.hideRepost} class:hide-reply={$settings?.timeline.hideReply}>
  {#if ($timelineStyle === 'default')}
    {#each $timeline as data, index (data)}
      <TimelineItem data={ data } index={index}></TimelineItem>
    {/each}
  {:else}
    <div class="media-list">
      {#each $timeline as data, index (data)}
        {#if (data.post.embed?.images)}
          <MediaTimelineItem data={data}></MediaTimelineItem>
        {/if}
      {/each}
    </div>
  {/if}

  <InfiniteLoading on:infinite={handleLoadMore} bind:this={il}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>

<style>

</style>