<script lang="ts">
  import VirtualList from '$lib/components/virtual/VirtualList.svelte';
  import type { ScrollState } from '$lib/components/virtual/types';
  import { onMount, tick } from 'svelte';

  interface TestItem {
    id: string;
    height: number;
    label: string;
    color: string;
    bodyLines: number;
    isDivider?: boolean;
    isHidden?: boolean;
  }

  let items = $state<TestItem[]>([]);
  let virtualList: ReturnType<typeof VirtualList> | undefined = $state();
  let nextId = $state(0);
  let savedState: ScrollState | null = null;
  let savedScrollTop = 0;
  let showVirtualList = $state(true);
  let initialScrollState = $state<ScrollState | null>(null);
  let cachedScrollState: ScrollState | null = null;
  let loadMoreCleanup: (() => void) | null = null;
  let heightOverrideRange: [number, number] | null = null;

  const TOP_MARGIN = 108;

  const scrollContainer = typeof document !== 'undefined' ? document.documentElement : null;
  const isWindowScroll = true;

  function seededRandom(seed: number): number {
    const x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x);
  }

  function getItemHeight(id: number): number {
    if (heightOverrideRange) {
      const [min, max] = heightOverrideRange;
      return min + Math.floor(seededRandom(id) * (max - min));
    }
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

    (window as any).__windowScrollTest = {
      prepend(count: number) {
        const newItems = generateItems(count, nextId);
        nextId += count;
        items = [...newItems.reverse(), ...items];
      },

      refresh(count: number) {
        const newItems = generateItems(count, nextId);
        nextId += count;
        const reversed = newItems.reverse();
        reversed[reversed.length - 1].isDivider = true;
        items = [...reversed, ...items];
      },

      append(count: number) {
        const newItems = generateItems(count, nextId);
        nextId += count;
        items = [...items, ...newItems];
      },

      prependWithHidden(count: number, hiddenIndices: number[]) {
        const newItems = generateItems(count, nextId);
        nextId += count;
        const reversed = newItems.reverse();
        for (const idx of hiddenIndices) {
          if (idx >= 0 && idx < reversed.length) {
            reversed[idx].isHidden = true;
          }
        }
        items = [...reversed, ...items];
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
        return window.scrollY;
      },

      getItemCount() {
        return items.length;
      },

      getDividerCount() {
        return items.filter(i => i.isDivider).length;
      },

      navigateAway() {
        savedState = virtualList?.getScrollState() ?? null;
        savedScrollTop = window.scrollY;
        showVirtualList = false;
        window.scrollTo(0, 0);
        return savedState;
      },

      navigateBack() {
        initialScrollState = savedState;
        showVirtualList = true;
      },

      navigateBackScrollTopOnly() {
        initialScrollState = null;
        showVirtualList = true;
        tick().then(() => {
          window.scrollTo(0, savedScrollTop);
        });
      },

      navigateBackLightweight() {
        if (savedState) {
          initialScrollState = {
            index: savedState.index,
            key: savedState.key,
            offset: savedState.offset,
            heights: [],
            scrollTop: savedState.scrollTop,
            visualY: savedState.visualY,
          };
        }
        showVirtualList = true;
      },

      getSavedScrollTop() {
        return savedScrollTop;
      },

      isVirtualListMounted() {
        return showVirtualList;
      },

      cacheScrollState() {
        if (virtualList) {
          const state = virtualList.getScrollState();
          if (state) {
            cachedScrollState = {
              index: state.index,
              key: state.key,
              offset: state.offset,
              scrollTop: state.scrollTop,
              visualY: state.visualY,
              heights: [],
            };
          }
        }
        return cachedScrollState;
      },

      navigateAwayRealApp() {
        savedScrollTop = window.scrollY;
        showVirtualList = false;
        window.scrollTo(0, 0);
        return cachedScrollState;
      },

      navigateBackFromCache() {
        if (cachedScrollState) {
          initialScrollState = cachedScrollState;
        }
        showVirtualList = true;
      },

      getScrollInfo() {
        return virtualList?.getScrollInfo() ?? null;
      },

      getScrollStateLightweight() {
        return virtualList?.getScrollStateLightweight() ?? null;
      },

      getVisibleItemIds() {
        const results: string[] = [];
        const allItems = document.querySelectorAll('[data-testid^="item-"]');
        for (const el of allItems) {
          const rect = el.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < window.innerHeight) {
            results.push(el.getAttribute('data-testid') ?? '');
          }
        }
        return results;
      },

      getItemPosition(id: string) {
        const el = document.querySelector(`[data-testid="${id}"]`) as HTMLElement;
        if (!el) return null;
        return {
          relativeY: el.getBoundingClientRect().top,
        };
      },

      enableLoadMore(opts: { delay?: number; batchSize?: number } = {}) {
        const delay = opts.delay ?? 100;
        const batchSize = opts.batchSize ?? 30;
        const threshold = 500;

        if (loadMoreCleanup) {
          loadMoreCleanup();
          loadMoreCleanup = null;
        }

        let loading = false;
        const check = () => {
          if (loading || !virtualList) return;
          const info = virtualList.getScrollInfo();
          if (info.distanceFromBottom < threshold) {
            loading = true;
            setTimeout(() => {
              const newItems = generateItems(batchSize, nextId);
              nextId += batchSize;
              items = [...items, ...newItems];
              loading = false;
            }, delay);
          }
        };

        window.addEventListener('scroll', check, { passive: true });
        loadMoreCleanup = () => {
          window.removeEventListener('scroll', check);
        };
      },

      resetWithOptions(opts: { count?: number; heightRange?: [number, number] } = {}) {
        if (loadMoreCleanup) {
          loadMoreCleanup();
          loadMoreCleanup = null;
        }
        heightOverrideRange = opts.heightRange ?? null;
        const count = opts.count ?? 200;
        items = generateItems(count, 0);
        nextId = count;
        savedState = null;
        savedScrollTop = 0;
        showVirtualList = true;
        initialScrollState = null;
        cachedScrollState = null;
        window.scrollTo(0, 0);
      },

      reset() {
        if (loadMoreCleanup) {
          loadMoreCleanup();
          loadMoreCleanup = null;
        }
        heightOverrideRange = null;
        items = generateItems(200, 0);
        nextId = 200;
        savedState = null;
        savedScrollTop = 0;
        showVirtualList = true;
        initialScrollState = null;
        cachedScrollState = null;
        window.scrollTo(0, 0);
      },
    };

    return () => {
      delete (window as any).__windowScrollTest;
    };
  });
</script>

<div class="timeline" data-testid="timeline-content">
  {#if showVirtualList}
  <VirtualList
    {items}
    {getKey}
    {scrollContainer}
    topMargin={TOP_MARGIN}
    {initialScrollState}
    bind:this={virtualList}
  >
    {#snippet children(item: TestItem, index: number)}
      {#if !item.isHidden}
      <div
        class="test-item"
        data-testid={item.id}
        data-index={index}
        style:min-height="{item.height}px"
        style:background-color={item.color}
      >
        <div class="item-content">
          <div class="item-header">
            <span class="item-label">{item.label}</span>
            <span class="item-id">{item.id}</span>
            <span class="item-meta">{item.height}px{item.isDivider ? ' [DIV]' : ''}{item.isHidden ? ' [HID]' : ''}</span>
          </div>
          {#each Array(item.bodyLines) as _, line}
            <div class="item-body-line">
              Body line {line + 1} of {item.id} — lorem ipsum dolor sit amet
            </div>
          {/each}
        </div>
      </div>
      {/if}

      {#if item.isDivider}
        <div class="more-divider" data-testid="divider-{item.id}">
          <span class="more-divider-label">── More ──</span>
        </div>
      {/if}
    {/snippet}
  </VirtualList>
  {:else}
    <div class="navigate-away-placeholder" data-testid="navigated-away">
      <p>Navigated away (VirtualList unmounted)</p>
    </div>
  {/if}
</div>

<style>
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

  .navigate-away-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 400px;
    font-family: monospace;
    color: #888;
  }

  .more-divider {
    width: 100%;
    height: 48px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid #ccc;
    background-color: #f0f0f0;
    font-family: monospace;
    font-size: 13px;
    color: #888;
  }
</style>
