<script>
  import { onMount } from 'svelte';
  import { agent } from '$lib/stores';
  import { timeline } from "$lib/stores";
  import TimelineItem from "./TimelineItem.svelte";
  import InfiniteScroll from 'svelte-infinite-scroll';

  let cursor = '';

  onMount(async () => {
      const data = await $agent.getTimeline()
      cursor = data.cursor
      timeline.set(data.feed);
      console.log(data.feed)
  });

  const handleLoadMore = async () => {
      const data = await $agent.getTimeline(20, cursor)
      timeline.update(function (tl) {
          let newTl = tl
          for (const item of data.feed) {
              tl.push(item);
          }

          return newTl;
      });
      cursor = data.cursor
  }
</script>

<div class="timeline">
  <div>
    {#each $timeline as data (data)}
      <TimelineItem data={ data }></TimelineItem>
    {/each}
  </div>
  <InfiniteScroll window threshold="300" on:loadMore={handleLoadMore} ></InfiniteScroll>
</div>

<style>
    .timeline {
        list-style: none;
        margin-top: 15px;
        padding-bottom: 200px;
    }
</style>