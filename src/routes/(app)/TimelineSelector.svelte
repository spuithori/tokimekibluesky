<script lang="ts">
  import { agent } from '$lib/stores';
  import BookmarkTimeline from './BookmarkTimeline.svelte';
  import ListTimeline from './ListTimeline.svelte';
  import Timeline from './Timeline.svelte';

  let {
    column = $bindable(),
    index,
    _agent = $agent,
    hideReply,
    hideRepost
  } = $props();
</script>

<div class="timeline-selector-wrap">
  {#if (column.algorithm.type === 'list')}
    <ListTimeline column={column} index={index} {_agent}></ListTimeline>
  {:else if (column.algorithm.type === 'bookmark')}
    <BookmarkTimeline column={column} index={index} {_agent}></BookmarkTimeline>
  {:else}
    <Timeline bind:column={column} index={index} {_agent} {hideReply} {hideRepost}></Timeline>
  {/if}
</div>
