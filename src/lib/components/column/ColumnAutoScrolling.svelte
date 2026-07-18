<script lang="ts">
  import type {Column} from "$lib/types/column";
  import {settings} from "$lib/stores";
  import {onDestroy} from "svelte";
  import {imageState} from "$lib/classes/imageState.svelte";

  interface Props {
    column: Column;
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

  let rafId = 0;
  let lastTime = 0;
  let carry = 0;

  let speedPxPerSec = $derived(getSpeed(column.settings?.autoScrollSpeed));
  let shouldScroll = $derived(
      !!column.settings?.autoScroll && !isTopScrolling && !isScrollPaused && !imageState.images.length
  );

  $effect(() => {
      if (shouldScroll) {
          start();
          return () => stop();
      }
  });

  onDestroy(() => {
      stop();
  });

  function getSpeed(autoScrollSpeed: string | undefined) {
      switch (autoScrollSpeed) {
          case 'normal':
              return 1000 / 16;
          case 'fast':
              return 1000 / 8;
          case 'faster':
              return 1000 / 4;
          default:
              return 1000 / 24;
      }
  }

  function start() {
      if (rafId) {
          return;
      }
      lastTime = performance.now();
      carry = 0;
      rafId = requestAnimationFrame(step);
  }

  function stop() {
      if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
      }
  }

  function step(time: number) {
      const el = $settings.design?.layout === 'decks' ? column.scrollElement : document.documentElement;
      const dt = Math.min(time - lastTime, 100);
      lastTime = time;
      carry += speedPxPerSec * dt / 1000;
      const px = Math.floor(carry);
      if (px > 0 && el instanceof HTMLElement) {
          el.scrollBy(0, -px);
          carry -= px;
      }
      rafId = requestAnimationFrame(step);
  }
</script>
