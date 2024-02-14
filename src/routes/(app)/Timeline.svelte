<script lang="ts">
  import {agent, realtime} from '$lib/stores';
  import TimelineItem from "./TimelineItem.svelte";
  import InfiniteLoading from 'svelte-infinite-loading';
  import MediaTimelineItem from "./MediaTimelineItem.svelte";
  import {getPostRealtime} from "$lib/realtime";
  import {getDbFollows} from "$lib/getActorsList";
  import {assignCursorFromLatest} from "$lib/components/column/releaseTimeline";
  import {playSound} from "$lib/sounds";
  import {track} from "@vercel/analytics";
  import MoreDivider from "$lib/components/post/MoreDivider.svelte";

  export let column;
  export let index;
  export let _agent = $agent;

  let isActorsListFinished = false;
  let actors = [];
  let realtimeCounter = 0;
  let isDividerLoading = false;
  let dividerFillerHeight = 0;

  if (column.settings?.autoRefresh === -1) {
      getActors();
  }

  $: insertRealtimeData($realtime);

  function insertRealtimeData(realtime) {
      if (!isActorsListFinished) {
          return false;
      }

      getPostRealtime(realtime, actors, _agent)
          .then(value => {
              if (!value) {
                  return false;
              }

              column.data.feed = [value, ...column.data.feed];
              realtimeCounter = realtimeCounter + 1;

              if (realtimeCounter === 20) {
                  realtimeCounter = 0;
                  assignCursorFromLatest(_agent, column);
              }

            if (column.settings?.playSound) {
              playSound(value?.post.indexedAt, column.lastRefresh, column.settings.playSound)
            }
          });
  }

  async function getActors() {
      if (column.algorithm.type === 'default') {
          actors = await getDbFollows(_agent);
      }

      if (column.algorithm.type === 'officialList') {
          actors = await _agent.getListActors(column.algorithm.algorithm);

      }
      isActorsListFinished = true;
  }

  function handleDividerClick(index, cursor, e) {
      column.data.cursor = cursor;
      column.data.feed[index].isDivider = false;
      isDividerLoading = true;
      dividerFillerHeight = e.detail.pos;
      column.data.feed.splice(index + 1);
      column.data.feed = column.data.feed;
  }

  const handleLoadMore = async ({ detail: { loaded, complete } }) => {
      try {
          const res = await _agent.getTimeline({limit: 20, cursor: column.data.cursor, algorithm: column.algorithm});
          column.data.cursor = res.data.cursor;
          const feed = res.data.feed.map(item => {
              item.memoryCursor = res.data.cursor;
              return item;
          });
          column.data.feed = [...column.data.feed, ...feed];
          isDividerLoading = false;

          if (column.data.cursor && res.data.feed.length) {
              loaded();
          } else {
              complete();
          }
      } catch (e) {
          console.error(e);
          complete();
      }
  }
</script>

<div class="timeline timeline--{column.style}">
  {#if (column.style === 'default')}
    {#each column.data.feed as data, index (data)}
      <TimelineItem data={ data } index={index} column={column} {_agent}></TimelineItem>

      {#if data.isDivider}
        <MoreDivider on:click={(e) => {handleDividerClick(index, data.memoryCursor, e)}}></MoreDivider>
      {/if}
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

  {#if (isDividerLoading)}
    <div class="more-divider-filler" style="--more-divider-filler-height: {dividerFillerHeight}px"></div>
  {/if}
</div>
