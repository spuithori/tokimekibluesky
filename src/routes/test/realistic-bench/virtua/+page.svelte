<script lang="ts">
  import { WindowVirtualizer } from 'virtua/svelte';
  import { generateMockFeed } from '$lib/test/mockFeedGenerator';
  import type { MockFeedViewPost } from '$lib/test/mockFeedGenerator';
  import FeedItem from '../FeedItem.svelte';
  import { onMount, tick } from 'svelte';

  let items = $state.raw<MockFeedViewPost[]>([]);
  let virtualizerRef: ReturnType<typeof WindowVirtualizer> | undefined = $state();

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
        virtualizerRef?.scrollToIndex(index);
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
        return 'virtua';
      },
    };

    return () => {
      delete (window as any).__realisticBench;
    };
  });
</script>

<div class="timeline" data-testid="timeline-content">
  <WindowVirtualizer
    data={items}
    getKey={(item) => item.post.uri}
    bind:this={virtualizerRef}
  >
    {#snippet children(item: MockFeedViewPost, index: number)}
      <FeedItem {item} {index} />
    {/snippet}
  </WindowVirtualizer>
</div>
