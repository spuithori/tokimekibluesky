<script lang="ts">
  import TimelineItem from './TimelineItem.svelte';
  import {getBookmarkFeed, getBookmarkName} from "$lib/bookmark";
  import Infinite from "$lib/components/utils/Infinite.svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import {settingsState} from "$lib/classes/settingsState.svelte";

  let { index, _agent, isJunk, unique, isSplit = false, column: columnProp = undefined } = $props();

  const columnState = getColumnState(isJunk);
  const column = columnProp ?? columnState.getColumn(index);
  let feeds;

  if (typeof column.data.cursor !== 'number') {
      column.data.cursor = 0;
  }

  if(!column.data.feed) {
      column.data.feed = [];
  }

  if (!column.algorithm.name) {
      getBookmarkName(column.algorithm.list)
          .then(value => {
              column.algorithm.name = value;
          })
  }

  const handleLoadMore = async (loaded, complete) => {
      feeds = await getBookmarkFeed(column.algorithm.list, column.data.cursor);

      if (feeds?.length) {
          const uris = feeds.map(feed => feed.uri);
          const res = await _agent.getTimeline({algorithm: column.algorithm, uris: uris});

          const posts = res.data.posts.map(post => {
              const id = feeds.find(feed => feed.cid === post.cid)?.id || undefined;
              return { post: post, bookmarkId: id };
          })
          column.data.feed = [...column.data.feed, ...posts];

          column.data.cursor = column.data.cursor + 1;
          initialLoadFinished = true;
          loaded();
      } else {
          complete();
      }
  }
</script>

<div class="timeline timeline--{column.style}">
  <div class:media-list={column.style === 'media'} class:video-list={column.style === 'video'}>
    {#each column.data.feed as data, index (data)}
      <TimelineItem data={ data } index={index} column={column} {_agent}></TimelineItem>
    {/each}
  </div>

  {#key unique}
    {#if settingsState.pdsRequestReady}
      <Infinite oninfinite={handleLoadMore}></Infinite>
    {/if}
  {/key}
</div>
