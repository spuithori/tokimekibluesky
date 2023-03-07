<script>
  import { onMount } from 'svelte';
  import { agent } from '$lib/stores';
  import { timeline } from "$lib/stores";
  import TimelineItem from "./TimelineItem.svelte";

  onMount(async () => {
      timeline.set(await $agent.getTimeline());
      console.log(await $timeline)
  });
</script>

<div class="timeline">
  {#each $timeline as data (data)}
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