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
  let refreshToTop = $state(false);

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

      prependOne() {
        const item = makeItem(nextId);
        nextId += 1;
        items = [item, ...items];
      },

      prependOneMutate() {
        const item = makeItem(nextId);
        nextId += 1;
        items.unshift(item);
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

      getDiagnostics() {
        return {
          itemCount: items.length,
          topSpacerHeight: document.querySelector('.virtual-spacer')
            ? (document.querySelector('.virtual-spacer') as HTMLElement).offsetHeight
            : -1,
          renderedItemCount: document.querySelectorAll('.virtual-item').length,
          firstRenderedId: document.querySelector('.virtual-item [data-testid]')
            ?.getAttribute('data-testid') ?? null,
          containerScrollTop: scrollContainer?.scrollTop ?? -1,
        };
      },

      setRefreshToTop(value: boolean) {
        refreshToTop = value;
      },

      clear() {
        items = [];
      },

      setItems(count: number) {
        items = generateItems(count, 0);
        nextId = count;
      },

      replaceAll(count: number) {
        const base = nextId + 10000;
        items = generateItems(count, base);
        nextId = base + count;
      },

      removeRange(startIndex: number, count: number) {
        items = [...items.slice(0, startIndex), ...items.slice(startIndex + count)];
      },

      removeById(id: string) {
        items = items.filter(item => item.id !== id);
      },

      insertAt(index: number, count: number) {
        const newItems = generateItems(count, nextId);
        nextId += count;
        items = [...items.slice(0, index), ...newItems, ...items.slice(index)];
      },

      prependAndAppend(prependCount: number, appendCount: number) {
        const pre = generateItems(prependCount, nextId);
        nextId += prependCount;
        const app = generateItems(appendCount, nextId);
        nextId += appendCount;
        items = [...pre.reverse(), ...items, ...app];
      },

      changeHeightsBelow(aboveIndex: number, delta: number) {
        items = items.map((item, i) =>
          i > aboveIndex ? { ...item, height: Math.max(1, item.height + delta) } : item
        );
      },

      changeMultipleHeights(indices: number[], delta: number) {
        const indexSet = new Set(indices);
        items = items.map((item, i) =>
          indexSet.has(i) ? { ...item, height: Math.max(1, item.height + delta) } : item
        );
      },

      resizeContainer(width: number, height: number) {
        if (scrollContainer) {
          scrollContainer.style.width = `${width}px`;
          scrollContainer.style.height = `${height}px`;
        }
      },

      getVisibleItemIds() {
        if (!scrollContainer) return [];
        const containerRect = scrollContainer.getBoundingClientRect();
        const ids: string[] = [];
        const els = scrollContainer.querySelectorAll('[data-testid^="item-"]');
        for (const el of els) {
          const rect = el.getBoundingClientRect();
          if (rect.bottom > containerRect.top && rect.top < containerRect.bottom) {
            ids.push(el.getAttribute('data-testid')!);
          }
        }
        return ids;
      },

      getItemPosition(testId: string) {
        if (!scrollContainer) return null;
        const containerRect = scrollContainer.getBoundingClientRect();
        const el = scrollContainer.querySelector(`[data-testid="${testId}"]`);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { relativeY: rect.top - containerRect.top, height: rect.height };
      },

      getRenderedItemCount() {
        return document.querySelectorAll('[data-testid^="item-"]').length;
      },

      getBottomSpacerHeight() {
        const spacers = document.querySelectorAll('.virtual-spacer');
        if (spacers.length >= 2) {
          return (spacers[spacers.length - 1] as HTMLElement).offsetHeight;
        }
        return -1;
      },

      getTreeHeight(index: number): number {
        if (!virtualList || index < 0) return -1;
        const posStart = virtualList.getPositionForIndex(index);
        const posEnd = virtualList.getPositionForIndex(index + 1);
        return posEnd - posStart;
      },

      changeItemHeightDOM(id: string, extraHeight: number): void {
        const el = scrollContainer?.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
        if (el) {
          el.style.setProperty('height', 'auto', 'important');
          el.style.minHeight = '0';
          const spacer = document.createElement('div');
          spacer.style.height = `${extraHeight}px`;
          spacer.className = 'dom-injected-spacer';
          el.appendChild(spacer);
        }
      },

      reset() {
        items = generateItems(200, 0);
        nextId = 200;
        savedState = null;
        refreshToTop = false;
        if (scrollContainer) {
          scrollContainer.style.width = '400px';
          scrollContainer.style.height = '600px';
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
    {refreshToTop}
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
