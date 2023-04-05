<script lang="ts">
  import { onMount } from 'svelte';
  import { agent, cursor } from '$lib/stores';
  import { timeline } from "$lib/stores";
  import TimelineItem from "./TimelineItem.svelte";
  import InfiniteScroll from 'svelte-infinite-scroll';

  onMount(async () => {
      const data = await $agent.getTimeline()
      timeline.set(data.feed);
      cursor.set(data.cursor);

      console.log(data.feed);
  });

  const handleLoadMore = async () => {
      const data = await $agent.getTimeline(20, $cursor)
      timeline.update(function (tl) {
          return [...tl, ...data.feed];
      });
      cursor.set(data.cursor);
  }
</script>

<div class="timeline">
  <div>
    {#each $timeline as data (data)}
      <TimelineItem data={ data }></TimelineItem>
    {/each}
  </div>
  <InfiniteScroll window threshold={300} on:loadMore={handleLoadMore} ></InfiniteScroll>
</div>

<style>

</style>