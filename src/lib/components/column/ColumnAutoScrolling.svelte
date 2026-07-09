<script lang="ts">
  import {settings} from "$lib/stores";
  import {onDestroy} from "svelte";
  import {imageState} from "$lib/classes/imageState.svelte";
  import { riceState } from '$lib/rice/riceState.svelte';
  import { resolveColumnScrollHost } from '$lib/scroll/scrollHost';

  interface Props {
    column: any;
    index: any;
    unique: any;
    isTopScrolling?: boolean;
    isScrollPaused?: boolean;
  }

  let {
    column,
    index,
    unique,
    isTopScrolling = false,
    isScrollPaused = false
  }: Props = $props();

  let scrollId;
  let scrollSpeed = 24;

  $effect(() => {
      scrolling(column.settings?.autoScroll);
  })

  $effect(() => {
      scrollSpeedChange(column.settings?.autoScrollSpeed);
  })

  $effect(() => {
      if (isTopScrolling) {
          clearInterval(scrollId);
      }
  })

  $effect(() => {
      if (isScrollPaused) {
          clearInterval(scrollId);
      } else {
          scrolling(column.settings?.autoScroll);
      }
  })

  $effect(() => {
      if (imageState.images.length) {
          clearInterval(scrollId);
      } else {
          scrolling(column.settings?.autoScroll);
      }
  })

  onDestroy(() => {
      clearInterval(scrollId);
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
          const host = resolveColumnScrollHost(column, { layoutStyle: riceState.layoutStyle, isJunk: false });

          scrollId = setInterval(() => {
              host.scrollBy(0, -1);
          }, scrollSpeed);
      } else {
          clearInterval(scrollId);
      }
  }
</script>

