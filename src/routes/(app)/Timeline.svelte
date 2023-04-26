<script lang="ts">
  import { agent, cursor } from '$lib/stores';
  import { timeline, hideRepost, hideReply, currentAlgorithm } from "$lib/stores";
  import TimelineItem from "./TimelineItem.svelte";
  import InfiniteLoading from 'svelte-infinite-loading';
  import { afterUpdate } from 'svelte';

  export let isRefreshing;
  let il;

  const handleLoadMore = async ({ detail: { loaded, complete } }) => {
      if (!isRefreshing) {
          const data = await $agent.getTimeline({limit: 25, cursor: $cursor, algorithm: $currentAlgorithm});
          cursor.set(data.cursor);

          if ($cursor) {
              timeline.update(function (tl) {
                  return [...tl, ...data.feed];
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
  <div>
    {#each $timeline as data (data)}
      <TimelineItem data={ data }></TimelineItem>
    {/each}
  </div>

  <InfiniteLoading on:infinite={handleLoadMore} bind:this={il}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>

<style>

</style>