<script lang="ts">
    import { agent } from '$lib/stores';
    import BookmarkTimeline from './BookmarkTimeline.svelte';
    import ListTimeline from './ListTimeline.svelte';
    import Timeline from './Timeline.svelte';

    export let column;
    export let index;
    export let _agent = $agent;
    export let hideReply;
    export let hideRepost;
</script>

<div class="timeline-selector-wrap">
  {#if (column.algorithm.type === 'list')}
    <ListTimeline column={column} index={index} {_agent}></ListTimeline>
  {:else if (column.algorithm.type === 'bookmark')}
    <BookmarkTimeline column={column} index={index} {_agent}></BookmarkTimeline>
  {:else}
    <Timeline column={column} index={index} {_agent} {hideReply} {hideRepost}></Timeline>
  {/if}
</div>
