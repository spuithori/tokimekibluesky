<script>
  import { onMount } from 'svelte';
  import { agent } from '$lib/stores';
  import { timeline } from "$lib/stores";
  import Reply from "./Reply.svelte";
  import TimelineItem from "./TimelineItem.svelte";

  let isReplyOpen = false;
  let isOpen = false;

  async function vote(cid, uri) {
      await $agent.setVote(cid, uri);
      timeline.update(await $agent.getTimeline());
  }

  function replyOpen() {
      isReplyOpen = isReplyOpen !== true;
  }

  onMount(async () => {
      timeline.set(await $agent.getTimeline());
      console.log(await $timeline)
  });
</script>

<div class="timeline">
  {#each $timeline as data}
    <TimelineItem data={ data }></TimelineItem>
  {/each}
</div>

<style>
    .timeline {
        list-style: none;
        margin-top: 15px;
        padding-bottom: 200px;
    }
</style>