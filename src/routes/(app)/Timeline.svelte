<script lang="ts">
  import {agent} from '$lib/stores';
  import TimelineItem from "./TimelineItem.svelte";
  import InfiniteLoading from 'svelte-infinite-loading';
  import MediaTimelineItem from "./MediaTimelineItem.svelte";
  import TimelineItemWrap from "$lib/components/post/TimelineItemWrap.svelte";

  export let column;
  export let index;
  export let _agent = $agent;

  if (!column.data) {
      column.data = {
          feed: [],
          cursor: '',
      }
  }

  const handleLoadMore = async ({ detail: { loaded, complete } }) => {
      const res = await _agent.getTimeline({limit: 20, cursor: column.data.cursor, algorithm: column.algorithm});
      column.data.cursor = res.data.cursor;

      if (column.data.cursor) {
          column.data.feed = [...column.data.feed, ...res.data.feed];

          loaded();
      } else {
          complete();
      }
  }
</script>

<div class="timeline timeline--{column.style}">
  {#if (column.style === 'default')}
    {#each column.data.feed as data, index (data)}
      <!-- <TimelineItemWrap data={ data } index={index} column={column} {_agent}></TimelineItemWrap> -->
      <TimelineItem data={ data } index={index} column={column} {_agent}></TimelineItem>
    {/each}
  {:else}
    <div class="media-list">
      {#each column.data.feed as data, index (data)}
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
