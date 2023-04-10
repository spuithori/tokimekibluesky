<script lang="ts">
  import { agent, cursor } from '$lib/stores';
  import { timeline } from "$lib/stores";
  import TimelineItem from "./TimelineItem.svelte";
  import InfiniteLoading from 'svelte-infinite-loading';

  const handleLoadMore = async ({ detail: { loaded, complete } }) => {
      const data = await $agent.getTimeline(20, $cursor);
      cursor.set(data.cursor);

      if ($cursor) {
          timeline.update(function (tl) {
              return [...tl, ...data.feed];
          });

          loaded();
      } else {
          complete();
      }
  }
</script>

<div class="timeline">
  <div>
    {#each $timeline as data (data)}
      <TimelineItem data={ data }></TimelineItem>
    {/each}
  </div>

  <InfiniteLoading on:infinite={handleLoadMore}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>

<style>

</style>