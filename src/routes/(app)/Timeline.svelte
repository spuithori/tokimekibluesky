<script lang="ts">
  import { agent, settings, timelines, cursors } from '$lib/stores';
  import TimelineItem from "./TimelineItem.svelte";
  import InfiniteLoading from 'svelte-infinite-loading';
  import MediaTimelineItem from "./MediaTimelineItem.svelte";

  export let column;
  export let index;
  export let _agent = $agent;

  if(!$timelines[index]) {
      $timelines[index] = [];
  }

  const handleLoadMore = async ({ detail: { loaded, complete } }) => {
      const res = await _agent.getTimeline({limit: 20, cursor: $cursors[index], algorithm: column.algorithm});

      $cursors[index] = res.data.cursor;

      if ($cursors[index]) {
          $timelines[index] = [...$timelines[index], ...res.data.feed];
          //console.log($timelines);

          loaded();
      } else {
          complete();
      }
  }
</script>

<div class="timeline timeline--main">
  {#if (column.style === 'default')}
    {#each $timelines[index] as data, index (data)}
      <TimelineItem data={ data } index={index} column={column} {_agent}></TimelineItem>
    {/each}
  {:else}
    <div class="media-list">
      {#each $timelines[index] as data, index (data)}
        {#if (data.post.embed?.images)}
          <MediaTimelineItem data={data} {_agent}></MediaTimelineItem>
        {/if}
      {/each}
    </div>
  {/if}

  <InfiniteLoading on:infinite={handleLoadMore}>
    <p slot="noMore" class="infinite-nomore">もうないよ</p>
  </InfiniteLoading>
</div>

<style>

</style>