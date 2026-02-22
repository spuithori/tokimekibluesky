<script lang="ts">
  import VirtualList from '$lib/components/virtual/VirtualList.svelte';
  import type { ScrollState } from '$lib/components/virtual/types';
  import { onMount } from 'svelte';
  import { generateItems, TOP_MARGIN, type TestItem } from '../benchmark-shared';

  let items = $state.raw<TestItem[]>([]);
  let virtualList: ReturnType<typeof VirtualList> | undefined = $state();
  let nextId = $state(0);
  let savedScrollState: ScrollState | null = null;

  const scrollContainer = typeof document !== 'undefined' ? document.documentElement : null;

  function getKey(item: TestItem): string {
    return item.id;
  }

  onMount(() => {
    items = generateItems(200, 0);
    nextId = 200;

    (window as any).__benchmarkTest = {
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

      reset(count: number) {
        items = generateItems(count, 0);
        nextId = count;
        window.scrollTo(0, 0);
      },

      getItemCount(): number {
        return items.length;
      },

      scrollToIndex(index: number) {
        virtualList?.scrollToIndex(index, { align: 'start' });
      },

      getScrollTop(): number {
        return window.scrollY;
      },

      getItemVisualY(testId: string): number | null {
        const el = document.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
        if (!el) return null;
        return el.getBoundingClientRect().top;
      },

      getVisibleItemIds(): string[] {
        const results: string[] = [];
        const allItems = document.querySelectorAll('.benchmark-item');
        for (const el of allItems) {
          const rect = el.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < window.innerHeight) {
            results.push(el.getAttribute('data-testid') ?? '');
          }
        }
        return results;
      },

      getRenderedItemCount(): number {
        return document.querySelectorAll('.benchmark-item').length;
      },

      getLibraryName(): string {
        return 'VirtualList (ours)';
      },

      isScrollStable(): boolean {
        return true;
      },

      saveState() {
        savedScrollState = virtualList?.getScrollState() ?? null;
      },

      restoreState() {
        if (savedScrollState) {
          virtualList?.restoreScrollState(savedScrollState);
        }
      },

      changeItemHeightDOM(testId: string, newHeight: number) {
        const el = document.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
        if (el) el.style.minHeight = newHeight + 'px';
      },

      getDiagnostics() {
        return virtualList?.getTreeDiagnostics() ?? null;
      },

      getHeightCacheSize() {
        return virtualList?.getHeightEntries().length ?? 0;
      },
    };

    return () => {
      delete (window as any).__benchmarkTest;
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
    {#snippet children(item: TestItem, index: number)}
      <div
        class="benchmark-item"
        data-testid={item.id}
        data-index={index}
        style:min-height="{item.height}px"
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
  .benchmark-item {
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
