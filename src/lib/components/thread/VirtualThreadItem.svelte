<script lang="ts">
    import TimelineItem from "../../../routes/(app)/TimelineItem.svelte";
    import Likes from "$lib/components/thread/Likes.svelte";
    import Quotes from "$lib/components/thread/Quotes.svelte";
    import Reposts from "$lib/components/thread/Reposts.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";

    let { column, index, _agent, isJunk = false } = $props();
    const columnState = getColumnState(isJunk);
    let feedItem = $derived(columnState.getFeed(column.id)[index]);
</script>

{#key feedItem}
  <TimelineItem
          data={feedItem}
          {index}
          {column}
          {_agent}
          feed={columnState.getFeed(column.id)}
          isSingle={true}
          isThread={true}
  >
    <div class="timeline-analytics-list">
      {#if (feedItem?.post?.quoteCount > 0)}
        <Quotes uri={feedItem.post.uri} {_agent}>
          {feedItem.post.quoteCount}
        </Quotes>
      {/if}

      {#if (feedItem?.post?.repostCount > 0)}
        <Reposts uri={feedItem.post.uri} {_agent}></Reposts>
      {/if}

      {#if (feedItem?.post?.likeCount > 0)}
        <Likes uri={feedItem.post.uri} {_agent}></Likes>
      {/if}
    </div>
  </TimelineItem>
{/key}

<style lang="postcss">
    .timeline-analytics-list {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 12px;
    }
</style>
