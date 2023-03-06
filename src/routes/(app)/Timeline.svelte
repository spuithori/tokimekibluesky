<script>
  import { onMount } from 'svelte';
  import { agent } from '$lib/stores';
  import { timeline } from "$lib/stores";
  import TimelineItem from "./TimelineItem.svelte";

  async function vote(cid, uri) {
      await $agent.setVote(cid, uri);
      timeline.update(await $agent.getTimeline());
  }

  onMount(async () => {
      timeline.set(await $agent.getTimeline());
      console.log(await $timeline)
  });
</script>

<div class="timeline">
  {#each $timeline as data, index}
    <TimelineItem data={ data } index={ index }></TimelineItem>
  {/each}
</div>

<style>
    .timeline {
        list-style: none;
        margin-top: 15px;
        padding-bottom: 200px;
    }
</style>