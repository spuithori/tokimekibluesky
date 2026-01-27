<script lang="ts">
  import VirtualList from '$lib/components/virtual/VirtualList.svelte';
  import type { ScrollState } from '$lib/components/virtual/types';
  import { onMount } from 'svelte';

  interface TestItem {
    id: string;
    height: number;
    label: string;
    color: string;
    bodyLines: number;
  }

  let items = $state<TestItem[]>([]);
  let scrollContainer = $state<HTMLElement | null>(null);
  let virtualList: ReturnType<typeof VirtualList> | undefined = $state();
  let nextId = $state(0);
  let savedState: ScrollState | null = null;

  function seededRandom(seed: number): number {
    const x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x);
  }

  function getItemHeight(id: number): number {
    const r = seededRandom(id);
    if (r < 0.3) return 72 + Math.floor(seededRandom(id + 1000) * 40);
    if (r < 0.6) return 120 + Math.floor(seededRandom(id + 2000) * 60);
    if (r < 0.85) return 200 + Math.floor(seededRandom(id + 3000) * 80);
    return 280 + Math.floor(seededRandom(id + 4000) * 40);
  }

  function getItemColor(id: number): string {
    const hue = Math.floor(seededRandom(id + 5000) * 360);
    const sat = 40 + Math.floor(seededRandom(id + 6000) * 30);
    const light = 82 + Math.floor(seededRandom(id + 7000) * 12);
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }

  function getBodyLines(id: number): number {
    return 1 + Math.floor(seededRandom(id + 8000) * 4);
  }

  function makeItem(id: number): TestItem {
    return {
      id: `item-${id}`,
      height: getItemHeight(id),
      color: getItemColor(id),
      label: `Item ${id}`,
      bodyLines: getBodyLines(id),
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

    (window as any).__virtualScrollTest = {
      prepend(count: number) {
        const newItems = generateItems(count, nextId);
        nextId += count;
        items = [...newItems.reverse(), ...items];
      },

      append(count: number) {
        const newItems = generateItems(count, nextId);
        nextId += count;
        items = [...items, ...newItems];
      },

      changeItemHeight(id: string, newHeight: number) {
        items = items.map(item =>
          item.id === id ? { ...item, height: newHeight } : item
        );
      },

      changeHeightsAbove(belowIndex: number, delta: number) {
        items = items.map((item, i) =>
          i < belowIndex ? { ...item, height: item.height + delta } : item
        );
      },

      scrollToIndex(index: number, align: 'start' | 'center' | 'end' = 'start') {
        virtualList?.scrollToIndex(index, { align });
      },

      saveScrollState() {
        savedState = virtualList?.getScrollState() ?? null;
        return savedState;
      },

      restoreScrollState() {
        if (savedState) {
          virtualList?.restoreScrollState(savedState);
        }
      },

      getScrollTop() {
        return scrollContainer?.scrollTop ?? 0;
      },

      getItemCount() {
        return items.length;
      },

      reset() {
        items = generateItems(200, 0);
        nextId = 200;
        savedState = null;
        if (scrollContainer) {
          scrollContainer.scrollTop = 0;
        }
      },
    };

    return () => {
      delete (window as any).__virtualScrollTest;
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
        style:height="{item.height}px"
        style:background-color={item.color}
      >
        <div class="item-content">
          <div class="item-header">
            <span class="item-label">{item.label}</span>
            <span class="item-id">{item.id}</span>
            <span class="item-meta">{item.height}px</span>
          </div>
          {#each Array(item.bodyLines) as _, line}
            <div class="item-body-line">
              Body line {line + 1} of {item.id} — lorem ipsum dolor sit amet
            </div>
          {/each}
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
    align-items: baseline;
    margin-bottom: 4px;
  }

  .item-label {
    font-weight: bold;
    font-size: 15px;
  }

  .item-id {
    color: #444;
    font-size: 12px;
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
</style>
