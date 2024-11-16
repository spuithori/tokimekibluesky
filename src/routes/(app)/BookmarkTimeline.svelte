<script lang="ts">
  import { agent } from '$lib/stores';
  import TimelineItem from './TimelineItem.svelte';
  import InfiniteLoading from 'svelte-infinite-loading';
  import MediaTimelineItem from './MediaTimelineItem.svelte';
  import {getBookmarkFeed, getBookmarkName} from "$lib/bookmark";

  let { _agent = $agent, column = $bindable(), index, unique } = $props();
    let initialLoadFinished = false;
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

    const handleLoadMore = async ({ detail: { loaded, complete } }) => {
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
  {#if (column.style === 'default')}
    {#each column.data.feed as data, index (data)}
      <TimelineItem data={ data } index={index} column={column} {_agent}></TimelineItem>
    {/each}
  {:else}
    <div class="media-list">
      {#each column.data.feed as data (data)}
        {#if (data.post.embed?.images)}
          <MediaTimelineItem data={data} {_agent}></MediaTimelineItem>
        {/if}
      {/each}
    </div>
  {/if}

  {#key unique}
    <InfiniteLoading on:infinite={handleLoadMore}>
      {#snippet noMore()}
        <p  class="infinite-nomore">もうないよ</p>
      {/snippet}
    </InfiniteLoading>
  {/key}
</div>
