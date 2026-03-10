<script lang="ts">
  import VirtualList from '$lib/components/virtual/VirtualList.svelte';
  import { onMount } from 'svelte';

  interface TestItem {
    id: string;
    height: number;
    label: string;
    color: string;
    bodyLines: number;
    hasImage: boolean;
    imageHeight: number;
  }

  let items = $state<TestItem[]>([]);
  let scrollContainer = $state<HTMLElement | null>(null);
  let virtualList: ReturnType<typeof VirtualList> | undefined = $state();
  let nextId = $state(0);

  function seededRandom(seed: number): number {
    const x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x);
  }

  function getItemColor(id: number): string {
    const hue = Math.floor(seededRandom(id + 5000) * 360);
    const sat = 40 + Math.floor(seededRandom(id + 6000) * 30);
    const light = 82 + Math.floor(seededRandom(id + 7000) * 12);
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }

  function getBodyLines(id: number): number {
    return 1 + Math.floor(seededRandom(id + 8000) * 3);
  }

  function makeItem(id: number): TestItem {
    const r = seededRandom(id);
    const hasImage = r < 0.5;
    const imageHeight = hasImage
      ? 100 + Math.floor(seededRandom(id + 3000) * 200)
      : 0;
    const baseHeight = 60 + Math.floor(seededRandom(id + 1000) * 40);
    const totalHeight = baseHeight + imageHeight;
    return {
      id: `item-${id}`,
      height: totalHeight,
      color: getItemColor(id),
      label: `Post ${id}`,
      bodyLines: getBodyLines(id),
      hasImage,
      imageHeight,
    };
  }

  function generateItems(count: number, startId: number): TestItem[] {
    const result: TestItem[] = [];
    for (let i = 0; i < count; i++) {
      result.push(makeItem(startId + i));
    }
    return result;
  }

  function getKey(item: TestItem): string {
    return item.id;
  }

  onMount(() => {
    items = generateItems(200, 0);
    nextId = 200;

    (window as any).__smoothScrollTest = {
      getScrollTop() {
        return scrollContainer?.scrollTop ?? 0;
      },

      getItemCount() {
        return items.length;
      },

      scrollToIndex(index: number, align: 'start' | 'center' | 'end' = 'start') {
        virtualList?.scrollToIndex(index, { align });
      },

      smoothScrollToTop() {
        if (!scrollContainer) return;
        scrollContainer.dataset.smoothScrolling = '';
        scrollContainer.scroll({
          top: 0,
          left: 0,
          behavior: 'smooth',
        });
      },

      cleanupSmoothScrolling() {
        if (scrollContainer) {
          delete scrollContainer.dataset.smoothScrolling;
        }
      },

      prepend(count: number) {
        const newItems = generateItems(count, nextId);
        nextId += count;
        items = [...newItems.reverse(), ...items];
      },

      getRenderedItemCount() {
        return document.querySelectorAll('[data-testid^="item-"]').length;
      },

      reset() {
        items = generateItems(200, 0);
        nextId = 200;
        if (scrollContainer) {
          delete scrollContainer.dataset.smoothScrolling;
          scrollContainer.scrollTop = 0;
        }
      },
    };

    return () => {
      delete (window as any).__smoothScrollTest;
    };
  });
</script>

<div
  class="scroll-container"
  bind:this={scrollContainer}
  data-testid="scroll-container"
>
  <VirtualList
    {items}
    {getKey}
    {scrollContainer}
    bind:this={virtualList}
  >
    {#snippet children(item: TestItem, index: number)}
      <div
        class="test-item"
        data-testid={item.id}
        data-index={index}
        style:background-color={item.color}
      >
        <div class="item-content">
          <div class="item-header">
            <div class="item-avatar"></div>
            <div class="item-header-text">
              <span class="item-label">{item.label}</span>
              <span class="item-id">{item.id}</span>
            </div>
            <span class="item-meta">{item.height}px</span>
          </div>
          {#each Array(item.bodyLines) as _, line}
            <div class="item-body-line">
              Body line {line + 1} of {item.id} — lorem ipsum dolor sit amet consectetur adipiscing elit
            </div>
          {/each}
          {#if item.hasImage}
            <div
              class="item-image"
              style:height="{item.imageHeight}px"
              data-image-id={item.id}
            >
              <span class="item-image-label">Image {item.imageHeight}px</span>
            </div>
          {/if}
        </div>
      </div>
    {/snippet}
  </VirtualList>
</div>

<style>
  .scroll-container {
    width: 400px;
    height: 600px;
    overflow-y: auto;
    border: 2px solid #333;
    margin: 20px auto;
    background: #fff;
  }

  .test-item {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    border-bottom: 1px solid #999;
    box-sizing: border-box;
    font-family: monospace;
    font-size: 13px;
    padding: 8px 12px;
  }

  .item-content {
    width: 100%;
  }

  .item-header {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 4px;
  }

  .item-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #ccc;
    flex-shrink: 0;
  }

  .item-header-text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .item-label {
    font-weight: bold;
    font-size: 14px;
  }

  .item-id {
    color: #444;
    font-size: 11px;
  }

  .item-meta {
    color: #888;
    font-size: 11px;
    margin-left: auto;
  }

  .item-body-line {
    color: #555;
    font-size: 12px;
    line-height: 1.4;
  }

  .item-image {
    margin-top: 8px;
    border-radius: 8px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
    font-weight: bold;
  }

  .item-image-label {
    opacity: 0.8;
  }
</style>
