<script lang="ts">
  import {agent, isImageOpen, settings} from "$lib/stores";
  import {onDestroy, onMount} from "svelte";

  export let column;
  export let index;
  export let _agent = $agent;
  export let unique;
  export let isTopScrolling = false;
  export let isScrollPaused = false;

  let scrollId;
  let scrollSpeed = 24;

  $: scrolling(column.settings?.autoScroll);
  $: scrollSpeedChange(column.settings?.autoScrollSpeed);

  $: if (isTopScrolling) {
      clearInterval(scrollId);
  }

  $: if (isScrollPaused) {
      clearInterval(scrollId);
  } else {
      scrolling(column.settings?.autoScroll);
  }

  $: if ($isImageOpen) {
      clearInterval(scrollId);
  } else {
      scrolling(column.settings?.autoScroll);
  }

  onDestroy(() => {
      clearInterval(scrollId);
  });

  onMount(() => {
      if (column.settings?.autoScroll) {
          scrolling(column.settings.autoScroll);
      }
  });

  function scrollSpeedChange(autoScrollSpeed) {
      switch (autoScrollSpeed) {
          case 'slow':
              scrollSpeed = 24;
              break;
          case 'normal':
              scrollSpeed = 16;
              break;
          case 'fast':
              scrollSpeed = 8;
              break;
          case 'faster':
              scrollSpeed = 4;
              break;
      }

      scrolling(column.settings?.autoScroll);
  }

  function scrolling(isScroll) {
      if (scrollId) {
          clearInterval(scrollId);
      }

      if (!isScroll) {
          return false;
      }

      if (isScroll) {
          const el = $settings.design?.layout === 'decks' ? column.scrollElement : document.querySelector(':root');

          scrollId = setInterval(() => {
              el.scrollBy(0, -1);
          }, scrollSpeed);
      } else {
          clearInterval(scrollId);
      }
  }
</script>

