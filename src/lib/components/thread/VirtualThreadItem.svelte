<script lang="ts">
    import TimelineItem from "../../../routes/(app)/TimelineItem.svelte";
    import {createEventDispatcher} from "svelte";
    import Likes from "$lib/components/thread/Likes.svelte";
    import Quotes from "$lib/components/thread/Quotes.svelte";
    const dispatch = createEventDispatcher();

    let { column, index, _agent } = $props();
</script>

<TimelineItem
    data={ column.data.feed[index] }
    index={index}
    column={column}
    {_agent}
    isSingle={true}
    isThread={true}
>
  <div class="timeline-analytics-list">
    {#if (column.data.feed[index]?.post?.quoteCount > 0)}
      <Quotes uri={column.data.feed[index].post.uri}>
        {column.data.feed[index].post.quoteCount}
      </Quotes>
    {/if}

    {#if (column.data.feed[index]?.post?.likeCount > 0)}
      <Likes uri={column.data.feed[index].post.uri}></Likes>
    {/if}
  </div>
</TimelineItem>

<style lang="postcss">
    .timeline-analytics-list {
        display: flex;
        flex-wrap: wrap;
        gap: 4px 12px;
    }
</style>
