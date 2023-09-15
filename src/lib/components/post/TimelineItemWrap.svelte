<script lang="ts">
  import TimelineItem from "../../../routes/(app)/TimelineItem.svelte";
  import {agent} from "$lib/stores";
  import {onMount} from "svelte";

  export let data;
  export let column;
  export let index;
  export let _agent = $agent;

  let isMount = false;
  let isVisible = true;
  let height;
  let el;

  onMount(async () => {
      isMount = true;

      const options = {
          root: column.scrollElement,
          rootMargin: '500px',
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
