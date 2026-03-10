<script lang="ts">
  import VirtualList from '$lib/components/virtual/VirtualList.svelte';
  import { generateMockFeed } from '$lib/test/mockFeedGenerator';
  import type { MockFeedViewPost } from '$lib/test/mockFeedGenerator';
  import FeedItem from '../FeedItem.svelte';
  import { onMount, tick } from 'svelte';

  const TOP_MARGIN = 52;

  let items = $state.raw<MockFeedViewPost[]>([]);
  let virtualList: ReturnType<typeof VirtualList> | undefined = $state();

  const scrollContainer = typeof document !== 'undefined' ? document.documentElement : null;

  function getKey(item: MockFeedViewPost): string {
    return item.post.uri;
  }

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
        virtualList?.scrollToIndex(index, { align: 'start' });
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
        return 'VirtualList (ours)';
      },
    };

    return () => {
      delete (window as any).__realisticBench;
    };
  });
</script>

<div class="timeline" data-testid="timeline-content">
  <VirtualList
    {items}
    {getKey}
    {scrollContainer}
    topMargin={TOP_MARGIN}
    bufferPx={150}
    bind:this={virtualList}
  >
    {#snippet children(item: MockFeedViewPost, index: number)}
      <FeedItem {item} {index} />
    {/snippet}
  </VirtualList>
</div>
