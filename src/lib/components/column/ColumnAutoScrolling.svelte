<script lang="ts">
  import { run } from 'svelte/legacy';

  import {agent, isImageOpen, settings} from "$lib/stores";
  import {onDestroy, onMount} from "svelte";

  interface Props {
    column: any;
    index: any;
    _agent?: any;
    unique: any;
    isTopScrolling?: boolean;
    isScrollPaused?: boolean;
  }

  let {
    column,
    index,
    _agent = $agent,
    unique,
    isTopScrolling = false,
    isScrollPaused = false
  }: Props = $props();

  let scrollId = $state();
  let scrollSpeed = 24;





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
  run(() => {
    scrolling(column.settings?.autoScroll);
  });
  run(() => {
    scrollSpeedChange(column.settings?.autoScrollSpeed);
  });
  run(() => {
    if (isTopScrolling) {
        clearInterval(scrollId);
    }
  });
  run(() => {
    if (isScrollPaused) {
        clearInterval(scrollId);
    } else {
        scrolling(column.settings?.autoScroll);
    }
  });
  run(() => {
    if ($isImageOpen) {
        clearInterval(scrollId);
    } else {
        scrolling(column.settings?.autoScroll);
    }
  });
</script>

