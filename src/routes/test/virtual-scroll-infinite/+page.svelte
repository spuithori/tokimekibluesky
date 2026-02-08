<script lang="ts">
  import VirtualList from '$lib/components/virtual/VirtualList.svelte';
  import Infinite from '$lib/components/utils/Infinite.svelte';
  import type { ScrollState } from '$lib/components/virtual/types';
  import { onMount, tick } from 'svelte';

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
  let showVirtualList = $state(true);
  let initialScrollState = $state<ScrollState | null>(null);
  let cachedScrollState: ScrollState | null = null;
  let savedScrollTop = 0;
  let infiniteEnabled = $state(true);
  let loadBatchSize = 20;
  let maxItems = 500;
  let loadDelay = 50;
  let autoLoadEnabled = $state(false);
  let autoLoadDelay = $state(100);
  let autoLoadInProgress = $state(false);
  let heightMin = 72;
  let heightMax = 320;

  const TOP_MARGIN = 52;

  function seededRandom(seed: number): number {
    const x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x);
  }

  function getItemHeight(id: number): number {
    const r = seededRandom(id);
    const range = heightMax - heightMin;
    if (range <= 0) return heightMin;
    if (r < 0.3) return heightMin + Math.floor(seededRandom(id + 1000) * range * 0.3);
    if (r < 0.6) return heightMin + Math.floor(range * 0.3) + Math.floor(seededRandom(id + 2000) * range * 0.3);
    if (r < 0.85) return heightMin + Math.floor(range * 0.6) + Math.floor(seededRandom(id + 3000) * range * 0.25);
    return heightMin + Math.floor(range * 0.85) + Math.floor(seededRandom(id + 4000) * range * 0.15);
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

  async function handleInfiniteLoad(loaded: () => void, complete: () => void) {
    if (!infiniteEnabled || nextId >= maxItems) {
      complete();
      return;
    }

    await new Promise(r => setTimeout(r, loadDelay));

    const batch = generateItems(loadBatchSize, nextId);
    nextId += loadBatchSize;
    items = [...items, ...batch];

    if (nextId >= maxItems) {
      complete();
    } else {
      loaded();
    }
  }

  function checkLoadMore() {
    if (!virtualList || !infiniteEnabled) return;
    const info = virtualList.getScrollInfo();
    const distanceFromBottom = info.totalHeight - info.scrollTop - info.viewportHeight;
    if (distanceFromBottom < 500 && nextId < maxItems) {
      if (autoLoadEnabled) {
        triggerAutoLoad();
      } else {
        const batch = generateItems(loadBatchSize, nextId);
        nextId += loadBatchSize;
        items = [...items, ...batch];
      }
    }
  }

  async function triggerAutoLoad() {
    if (autoLoadInProgress || nextId >= maxItems) return;
    autoLoadInProgress = true;
    try {
      await new Promise(r => setTimeout(r, autoLoadDelay));
      if (nextId < maxItems) {
        const batch = generateItems(loadBatchSize, nextId);
        nextId += loadBatchSize;
        items = [...items, ...batch];
      }
    } finally {
      autoLoadInProgress = false;
    }
  }

  function handleVirtualScroll() {
    checkLoadMore();
  }

  onMount(() => {
    scrollContainer = document.querySelector('.modal-page-content') as HTMLElement;
    items = generateItems(200, 0);
    nextId = 200;

    (window as any).__infiniteScrollTest = {
      getScrollTop() {
        return scrollContainer?.scrollTop ?? 0;
      },

      getItemCount() {
        return items.length;
      },

      scrollToIndex(index: number, align: 'start' | 'center' | 'end' = 'start') {
        virtualList?.scrollToIndex(index, { align });
      },

      append(count: number) {
        const newItems = generateItems(count, nextId);
        nextId += count;
        items = [...items, ...newItems];
      },

      prepend(count: number) {
        const startId = nextId;
        nextId += count;
        const newItems = generateItems(count, startId);
        items = [...newItems, ...items];
      },

      cacheScrollState() {
        if (virtualList) {
          const state = virtualList.getScrollStateLightweight();
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

      navigateAway() {
        savedScrollTop = scrollContainer?.scrollTop ?? 0;
        if (virtualList) {
          const state = virtualList.getScrollState();
          if (state) {
            cachedScrollState = {
              index: state.index,
              key: state.key,
              offset: state.offset,
              scrollTop: state.scrollTop,
              visualY: state.visualY,
              heights: [] as [string, number][],
            };
          }
        }
        showVirtualList = false;
        if (scrollContainer) {
          scrollContainer.scrollTop = 0;
        }
      },

      navigateBack() {
        if (cachedScrollState) {
          initialScrollState = cachedScrollState;
        }
        showVirtualList = true;
      },

      navigateBackFull() {
        if (virtualList && cachedScrollState) {
          const state = virtualList.getScrollState();
          if (state) {
            initialScrollState = state;
          }
        } else if (cachedScrollState) {
          initialScrollState = cachedScrollState;
        }
        showVirtualList = true;
      },

      setInfiniteEnabled(enabled: boolean) {
        infiniteEnabled = enabled;
      },

      enableAutoLoad(delay: number = 100) {
        autoLoadEnabled = true;
        autoLoadDelay = delay;
      },

      disableAutoLoad() {
        autoLoadEnabled = false;
      },

      scrollWhileAway(amount: number) {
        if (scrollContainer && !showVirtualList) {
          scrollContainer.scrollTop += amount;
        }
      },

      resetWithOptions(options: { count?: number; heightRange?: [number, number] } = {}) {
        const { count = 200, heightRange } = options;
        if (heightRange) {
          heightMin = heightRange[0];
          heightMax = heightRange[1];
        }
        items = generateItems(count, 0);
        nextId = count;
        showVirtualList = true;
        initialScrollState = null;
        cachedScrollState = null;
        savedScrollTop = 0;
        infiniteEnabled = true;
        loadBatchSize = 20;
        loadDelay = 50;
        autoLoadEnabled = false;
        autoLoadInProgress = false;
        if (scrollContainer) {
          scrollContainer.scrollTop = 0;
        }
      },

      setLoadDelay(ms: number) {
        loadDelay = ms;
      },

      setLoadBatchSize(size: number) {
        loadBatchSize = size;
      },

      getScrollInfo() {
        return virtualList?.getScrollInfo() ?? null;
      },

      isVirtualListMounted() {
        return showVirtualList;
      },

      getVisibleItemIds() {
        if (!scrollContainer) return [];
        const containerRect = scrollContainer.getBoundingClientRect();
        const topBound = containerRect.top + TOP_MARGIN;
        const bottomBound = containerRect.bottom;
        const ids: string[] = [];
        const els = scrollContainer.querySelectorAll('[data-testid^="item-"]');
        for (const el of els) {
          const rect = el.getBoundingClientRect();
          if (rect.bottom > topBound && rect.top < bottomBound) {
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
        return {
          relativeY: rect.top - containerRect.top,
          height: rect.height,
        };
      },

      getTreeDiagnostics() {
        return virtualList?.getTreeDiagnostics() ?? null;
      },

      getTopSpacerHeight() {
        const spacer = scrollContainer?.querySelector('.virtual-spacer') as HTMLElement;
        return spacer ? parseFloat(spacer.style.height) : 0;
      },

      getPositionForIndex(index: number) {
        return virtualList?.getPositionForIndex(index) ?? 0;
      },

      startFrameRecording() {
        const frames: Array<{
          scrollTop: number;
          topSpacer: number;
          firstVisibleId: string;
          firstVisibleY: number;
          timestamp: number;
        }> = [];
        let recording = true;
        const containerRect = scrollContainer!.getBoundingClientRect();
        const topBound = containerRect.top + TOP_MARGIN;

        function recordFrame() {
          if (!recording || !scrollContainer) return;
          const spacer = scrollContainer.querySelector('.virtual-spacer') as HTMLElement;
          const topSpacer = spacer ? parseFloat(spacer.style.height) : 0;
          const st = scrollContainer.scrollTop;

          let firstId = '';
          let firstY = 0;
          const els = scrollContainer.querySelectorAll('[data-testid^="item-"]');
          for (const el of els) {
            const rect = el.getBoundingClientRect();
            if (rect.bottom > topBound && rect.top < containerRect.bottom) {
              firstId = el.getAttribute('data-testid')!;
              firstY = rect.top - containerRect.top;
              break;
            }
          }

          frames.push({
            scrollTop: st,
            topSpacer: topSpacer,
            firstVisibleId: firstId,
            firstVisibleY: firstY,
            timestamp: performance.now(),
          });
          requestAnimationFrame(recordFrame);
        }
        requestAnimationFrame(recordFrame);

        return {
          stop() {
            recording = false;
            return frames;
          },
        };
      },

      reset() {
        heightMin = 72;
        heightMax = 320;
        items = generateItems(200, 0);
        nextId = 200;
        showVirtualList = true;
        initialScrollState = null;
        cachedScrollState = null;
        savedScrollTop = 0;
        infiniteEnabled = true;
        loadBatchSize = 20;
        loadDelay = 50;
        autoLoadEnabled = false;
        autoLoadInProgress = false;
        if (scrollContainer) {
          scrollContainer.scrollTop = 0;
        }
      },
    };

    return () => {
      delete (window as any).__infiniteScrollTest;
    };
  });
</script>

<div class="timeline">
  {#if showVirtualList}
    <VirtualList
      {items}
      {getKey}
      {scrollContainer}
      topMargin={TOP_MARGIN}
      {initialScrollState}
      onScroll={handleVirtualScroll}
      onRangeChange={checkLoadMore}
      bind:this={virtualList}
    >
      {#snippet children(item: TestItem, index: number)}
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
              <span class="item-meta">{item.height}px</span>
            </div>
            {#each Array(item.bodyLines) as _, line}
              <div class="item-body-line">
                Body line {line + 1} of {item.id}
              </div>
            {/each}
          </div>
        </div>
      {/snippet}
    </VirtualList>

    {#if infiniteEnabled}
      <Infinite oninfinite={handleInfiniteLoad}></Infinite>
    {/if}
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
</style>
