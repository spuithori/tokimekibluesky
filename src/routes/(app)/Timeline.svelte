<script lang="ts">
  import { agent, cursor } from '$lib/stores';
  import { timeline, hideRepost, hideReply, currentAlgorithm, timelineStyle } from "$lib/stores";
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
      il.$$.update();
  })
</script>

<div class="timeline timeline--main" class:hide-repost={$hideRepost === 'true'} class:hide-reply={$hideReply === 'true'}>
  {#if ($timelineStyle === 'default')}
    {#each $timeline as data (data)}
      <TimelineItem data={ data }></TimelineItem>
    {/each}
  {:else}
    <div class="media-list">
      {#each $timeline as data (data)}
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