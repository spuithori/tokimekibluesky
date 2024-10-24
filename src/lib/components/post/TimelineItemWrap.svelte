<script lang="ts">
  import TimelineItem from "../../../routes/(app)/TimelineItem.svelte";
  import {agent} from "$lib/stores";
  import {onMount} from "svelte";

  let {
    data,
    column,
    index,
    _agent = $agent
  } = $props();

  let isMount = false;
  let isVisible = $state(true);
  let height = $state();
  let el = $state();

  onMount(async () => {
      isMount = true;

      const options = {
          root: column.scrollElement,
          rootMargin: '1000px',
          threshold: 0,
      }
      const observer = new IntersectionObserver(intersect, options)
      observer.observe(el);
  })

  function intersect(entries) {
      entries.forEach(entry => {
          if (entry.isIntersecting) {
              isVisible = true;
          } else {
              isVisible = false;
          }
      })
  }
</script>

<div class="timeline-item-wrap" bind:clientHeight={height} style="height: {height}px" bind:this={el}>
  {#if isVisible}
    <TimelineItem data={ data } index={index} column={column} {_agent}></TimelineItem>
  {/if}
</div>
