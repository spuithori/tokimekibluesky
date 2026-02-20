<script lang="ts">
  import { createWindowVirtualizer } from '@tanstack/svelte-virtual';
  import { generateMockFeed } from '$lib/test/mockFeedGenerator';
  import type { MockFeedViewPost } from '$lib/test/mockFeedGenerator';
  import FeedItem from '../FeedItem.svelte';
  import { onMount, tick } from 'svelte';

  const TOP_MARGIN = 52;

  let items = $state.raw<MockFeedViewPost[]>([]);

  const virtualizer = createWindowVirtualizer({
    get count() { return items.length; },
    estimateSize: () => 180,
    overscan: 5,
    scrollMargin: TOP_MARGIN,
    getItemKey: (index: number) => {
      if (index < items.length) return items[index].post.uri;
      return index;
    },
  });

  onMount(() => {
    (window as any).__realisticBench = {
      loadFeed(count: number, seed = 42) {
        items = generateMockFeed({ count, seed });
      },

      clearFeed() {
        items = [];
      },

      getFeedCount() {
        return items.length;
      },

      getRenderedItemCount() {
        return document.querySelectorAll('[data-testid="timeline-item"]').length;
      },

      scrollToIndex(index: number) {
        $virtualizer.scrollToIndex(index, { align: 'start' });
      },

      getScrollTop() {
        return window.scrollY;
      },

      async waitForRender() {
        await tick();
        await new Promise(r => requestAnimationFrame(r));
        await new Promise(r => requestAnimationFrame(r));
      },

      getLibraryName() {
        return '@tanstack/svelte-virtual';
      },
    };

    return () => {
      delete (window as any).__realisticBench;
    };
  });
</script>

<div class="timeline" data-testid="timeline-content">
  <div style="position: relative; width: 100%; height: {$virtualizer.getTotalSize()}px;">
    {#each $virtualizer.getVirtualItems() as virtualItem (virtualItem.key)}
      {@const item = items[virtualItem.index]}
      {#if item}
        <div
          style="position: absolute; top: 0; left: 0; width: 100%; transform: translateY({virtualItem.start - $virtualizer.options.scrollMargin}px);"
        >
          <FeedItem {item} index={virtualItem.index} />
        </div>
      {/if}
    {/each}
  </div>
</div>
