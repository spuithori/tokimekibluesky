<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { VisibleRange, ScrollToIndexOptions, ScrollState } from './types';

  interface Props<T> {
    items: T[];
    getKey: (item: T, index: number) => string;
    scrollContainer: HTMLElement | null | undefined;
    buffer?: number;
    estimatedItemHeight?: number;
    topMargin?: number;
    maintainScrollPosition?: boolean;
    isTopScrolling?: boolean;
    initialScrollState?: ScrollState | null;
    onRangeChange?: (range: VisibleRange) => void;
    children: Snippet<[T, number]>;
  }

  let {
    items,
    getKey,
    scrollContainer,
    buffer = 8,
    estimatedItemHeight = 150,
    topMargin = 0,
    maintainScrollPosition = true,
    isTopScrolling = false,
    initialScrollState = null,
    onRangeChange,
    children
  }: Props<any> = $props();

  let listEl: HTMLElement | undefined = $state();
  let topSentinelEl: HTMLElement | undefined = $state();
  let bottomSentinelEl: HTMLElement | undefined = $state();

  let hasRestoredScroll = false;
  let heights = new Map<string, number>();
  let positionsCache: number[] = [];
  let totalHeightCache = 0;

  let visibleStart = 0;
  let visibleEnd = 0;
  let viewportHeight = $state(0);
  let renderVersion = $state(0);

  let resizeObserver: ResizeObserver | null = null;
  let topSentinelObserver: IntersectionObserver | null = null;
  let bottomSentinelObserver: IntersectionObserver | null = null;
  let containerResizeObserver: ResizeObserver | null = null;
  let itemRefs = new Map<string, HTMLElement>();

  let anchorIndex = -1;
  let anchorOffset = 0;
  let isAdjustingScroll = false;
  let pendingHeightUpdates = new Map<string, number>();
  let heightUpdateScheduled = false;

  let averageMeasuredHeight = $derived.by(() => {
    if (heights.size === 0) return estimatedItemHeight;
    let total = 0;
    for (const h of heights.values()) {
      total += h;
    }
    return total / heights.size;
  });

  let isWindowScroll = $derived(
    scrollContainer === document.documentElement ||
    scrollContainer === document.body
  );

  let isVirtualizationEnabled = $derived(
    scrollContainer !== null &&
    scrollContainer !== undefined &&
    viewportHeight > 0 &&
    items.length > 0
  );

  let visibleRange = $derived.by((): VisibleRange => {
    void renderVersion;
    if (items.length === 0) return { start: 0, end: 0 };
    if (!isVirtualizationEnabled) return { start: 0, end: items.length };
    return {
      start: Math.max(0, visibleStart - buffer),
      end: Math.min(items.length, visibleEnd + buffer)
    };
  });

  let visibleItems = $derived(items.slice(visibleRange.start, visibleRange.end));

  let topSpacerHeight = $derived.by(() => {
    if (!isVirtualizationEnabled) return 0;
    return positionsCache[visibleRange.start] ?? 0;
  });

  let bottomSpacerHeight = $derived.by(() => {
    if (!isVirtualizationEnabled || items.length === 0) return 0;
    const endPosition = positionsCache[visibleRange.end] ?? totalHeightCache;
    return Math.max(0, totalHeightCache - endPosition);
  });

  function recalculatePositions(): void {
    const len = items.length;
    if (len === 0) {
      positionsCache = [];
      totalHeightCache = 0;
      return;
    }
    const newPositions = new Array(len);
    let cumulative = 0;
    const defaultHeight = averageMeasuredHeight;
    for (let i = 0; i < len; i++) {
      newPositions[i] = cumulative;
      const key = getKey(items[i], i);
      cumulative += heights.get(key) ?? defaultHeight;
    }
    positionsCache = newPositions;
    totalHeightCache = cumulative;
  }

  function getItemHeight(index: number): number {
    if (index < 0 || index >= items.length) return averageMeasuredHeight;
    const key = getKey(items[index], index);
    return heights.get(key) ?? averageMeasuredHeight;
  }

  function getScrollTop(): number {
    if (isWindowScroll) return window.scrollY;
    return scrollContainer?.scrollTop ?? 0;
  }

  function setScrollTop(value: number): void {
    if (isWindowScroll) {
      window.scrollTo(0, value);
    } else if (scrollContainer) {
      scrollContainer.scrollTop = value;
    }
  }

  function getViewportHeight(): number {
    if (isWindowScroll) return window.innerHeight;
    return scrollContainer?.clientHeight ?? 0;
  }

  function findIndexAtPosition(scrollTop: number): number {
    if (positionsCache.length === 0) return 0;
    const adjustedTop = Math.max(0, scrollTop - topMargin);
    let left = 0;
    let right = positionsCache.length - 1;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (positionsCache[mid] < adjustedTop) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    return Math.max(0, left - 1);
  }

  function findEndIndex(scrollBottom: number): number {
    if (positionsCache.length === 0) return 0;
    const adjustedBottom = Math.max(0, scrollBottom - topMargin);
    let left = 0;
    let right = positionsCache.length - 1;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const itemBottom = positionsCache[mid] + getItemHeight(mid);
      if (itemBottom <= adjustedBottom) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    return Math.min(items.length, left + 1);
  }

  function updateVisibleRange(): void {
    if (!scrollContainer || items.length === 0) return;
    const scrollTop = getScrollTop();
    const height = getViewportHeight();
    if (height !== viewportHeight) {
      viewportHeight = height;
    }
    const newStart = findIndexAtPosition(scrollTop);
    const newEnd = findEndIndex(scrollTop + height);
    if (newStart !== visibleStart || newEnd !== visibleEnd) {
      visibleStart = newStart;
      visibleEnd = newEnd;
      renderVersion++;
    }
    if (maintainScrollPosition && !isAdjustingScroll && !isTopScrolling) {
      const adjustedScrollTop = Math.max(0, scrollTop - topMargin);
      for (let i = 0; i < items.length; i++) {
        const pos = positionsCache[i] ?? 0;
        const height = getItemHeight(i);
        if (pos + height > adjustedScrollTop) {
          anchorIndex = i;
          anchorOffset = adjustedScrollTop - pos;
          break;
        }
      }
    }
  }

  function handleScroll(): void {
    if (isAdjustingScroll) return;
    updateVisibleRange();
  }

  function flushHeightUpdates(): void {
    if (pendingHeightUpdates.size === 0) {
      heightUpdateScheduled = false;
      return;
    }
    const currentScrollTop = getScrollTop();
    const adjustedScrollTop = Math.max(0, currentScrollTop - topMargin);
    let viewportStartIndex = 0;
    let cumulative = 0;
    for (let i = 0; i < items.length; i++) {
      const key = getKey(items[i], i);
      const height = heights.get(key) ?? averageMeasuredHeight;
      if (cumulative + height > adjustedScrollTop) {
        viewportStartIndex = i;
        break;
      }
      cumulative += height;
    }
    let scrollAdjustment = 0;
    let hasChanges = false;
    const keyToIndex = new Map<string, number>();
    for (let i = 0; i < items.length; i++) {
      keyToIndex.set(getKey(items[i], i), i);
    }
    for (const [key, newHeight] of pendingHeightUpdates) {
      const oldHeight = heights.get(key) ?? averageMeasuredHeight;
      if (Math.abs(oldHeight - newHeight) < 1) continue;
      const itemIndex = keyToIndex.get(key) ?? -1;
      if (maintainScrollPosition && itemIndex !== -1 && itemIndex < viewportStartIndex) {
        scrollAdjustment += newHeight - oldHeight;
      }
      heights.set(key, newHeight);
      hasChanges = true;
    }
    pendingHeightUpdates.clear();
    heightUpdateScheduled = false;
    if (!hasChanges) return;
    recalculatePositions();
    if (scrollAdjustment !== 0 && currentScrollTop > 10 && !isTopScrolling && maintainScrollPosition) {
      isAdjustingScroll = true;
      setScrollTop(currentScrollTop + scrollAdjustment);
      requestAnimationFrame(() => {
        isAdjustingScroll = false;
        updateVisibleRange();
      });
    }
  }

  function scheduleHeightUpdate(): void {
    if (heightUpdateScheduled) return;
    heightUpdateScheduled = true;
    requestAnimationFrame(flushHeightUpdates);
  }

  function setupResizeObserver(): void {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        const key = element.dataset.virtualKey;
        if (!key) continue;
        const newHeight = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        if (newHeight > 0) {
          pendingHeightUpdates.set(key, newHeight);
        }
      }
      scheduleHeightUpdate();
    });
  }

  function setupSentinelObservers(): void {
    const root = isWindowScroll ? null : scrollContainer;
    const rootMargin = `${viewportHeight}px 0px`;
    topSentinelObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && visibleStart > 0) {
          updateVisibleRange();
        }
      },
      { root, rootMargin, threshold: 0 }
    );
    bottomSentinelObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && entry.isIntersecting && visibleEnd < items.length) {
          updateVisibleRange();
        }
      },
      { root, rootMargin, threshold: 0 }
    );
  }

  function observeItem(element: HTMLElement, key: string) {
    element.dataset.virtualKey = key;
    resizeObserver?.observe(element);
    itemRefs.set(key, element);
  }

  function unobserveItem(element: HTMLElement) {
    const key = element.dataset.virtualKey;
    if (key) {
      resizeObserver?.unobserve(element);
      itemRefs.delete(key);
    }
  }

  function itemAction(element: HTMLElement, key: string) {
    observeItem(element, key);
    return {
      update(newKey: string) {
        if (element.dataset.virtualKey !== newKey) {
          unobserveItem(element);
          observeItem(element, newKey);
        }
      },
      destroy() {
        unobserveItem(element);
      }
    };
  }

  let previousItemsLength = 0;
  let previousFirstKey: string | null = null;

  $effect(() => {
    const len = items.length;
    const firstKey = len > 0 ? getKey(items[0], 0) : null;

    const isPrepend = previousFirstKey !== null &&
                      firstKey !== previousFirstKey &&
                      len > previousItemsLength;

    if (len === 0) {
      recalculatePositions();
      previousFirstKey = null;
      previousItemsLength = 0;
      visibleStart = 0;
      visibleEnd = 0;
      queueMicrotask(() => renderVersion++);
      return;
    }

    if (isPrepend && maintainScrollPosition && !isTopScrolling && scrollContainer) {
      const scrollTop = getScrollTop();
      if (scrollTop > 10) {
        let anchorKey: string | null = null;
        let anchorTop: number | null = null;

        for (const [key, element] of itemRefs) {
          const rect = element.getBoundingClientRect();
          if (rect.top >= -100 && rect.top < viewportHeight) {
            anchorKey = key;
            anchorTop = rect.top;
            break;
          }
        }

        if (anchorKey !== null && anchorTop !== null) {
          const capturedKey = anchorKey;
          const capturedTop = anchorTop;

          recalculatePositions();
          previousFirstKey = firstKey;
          previousItemsLength = len;

          tick().then(() => {
            const element = itemRefs.get(capturedKey);
            if (!element) return;

            const newTop = element.getBoundingClientRect().top;
            const diff = newTop - capturedTop;

            if (Math.abs(diff) > 1) {
              isAdjustingScroll = true;
              setScrollTop(getScrollTop() + diff);
              requestAnimationFrame(() => {
                isAdjustingScroll = false;
                updateVisibleRange();
              });
            } else {
              updateVisibleRange();
            }
          });
          return;
        }
      }
    }

    recalculatePositions();
    previousFirstKey = firstKey;
    previousItemsLength = len;
    queueMicrotask(() => updateVisibleRange());
  });

  $effect(() => {
    onRangeChange?.(visibleRange);
  });

  $effect(() => {
    if (!scrollContainer) return;
    const scrollTarget = isWindowScroll ? window : scrollContainer;
    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });
    if (isWindowScroll) {
      viewportHeight = window.innerHeight;
      const handleResize = () => {
        const newHeight = window.innerHeight;
        if (newHeight !== viewportHeight && newHeight > 0) {
          viewportHeight = newHeight;
        }
      };
      window.addEventListener('resize', handleResize, { passive: true });
      queueMicrotask(() => updateVisibleRange());
      return () => {
        scrollTarget.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    } else {
      viewportHeight = scrollContainer.clientHeight;
      containerResizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newHeight = entry.contentRect.height;
          if (newHeight !== viewportHeight && newHeight > 0) {
            viewportHeight = newHeight;
          }
        }
      });
      containerResizeObserver.observe(scrollContainer);
      queueMicrotask(() => updateVisibleRange());
      return () => {
        scrollTarget.removeEventListener('scroll', handleScroll);
        containerResizeObserver?.disconnect();
        containerResizeObserver = null;
      };
    }
  });

  $effect(() => {
    if (topSentinelEl && topSentinelObserver) {
      topSentinelObserver.observe(topSentinelEl);
    }
    if (bottomSentinelEl && bottomSentinelObserver) {
      bottomSentinelObserver.observe(bottomSentinelEl);
    }
    return () => {
      topSentinelObserver?.disconnect();
      bottomSentinelObserver?.disconnect();
    };
  });

  $effect(() => {
    if (scrollContainer && initialScrollState && !hasRestoredScroll && items.length > 0) {
      hasRestoredScroll = true;
      if (initialScrollState.heights && initialScrollState.heights.length > 0) {
        for (const [key, value] of initialScrollState.heights) {
          heights.set(key, value);
        }
      }
      recalculatePositions();
      if (initialScrollState.index >= 0 && initialScrollState.index < items.length) {
        const position = positionsCache[initialScrollState.index] ?? 0;
        const targetScrollTop = position + (initialScrollState.offset ?? 0) + topMargin;
        const targetIndex = initialScrollState.index;
        const targetOffset = initialScrollState.offset ?? 0;
        isAdjustingScroll = true;
        setScrollTop(Math.max(0, targetScrollTop));
        visibleStart = Math.max(0, targetIndex - buffer);
        visibleEnd = Math.min(items.length, targetIndex + buffer + 10);
        queueMicrotask(() => {
          renderVersion++;
          tick().then(() => {
            requestAnimationFrame(() => {
              isAdjustingScroll = false;
              anchorIndex = targetIndex;
              anchorOffset = targetOffset;
              updateVisibleRange();
            });
          });
        });
      }
    }
  });

  onMount(() => {
    setupResizeObserver();
    setupSentinelObservers();
    recalculatePositions();
    return () => {
      resizeObserver?.disconnect();
      topSentinelObserver?.disconnect();
      bottomSentinelObserver?.disconnect();
      containerResizeObserver?.disconnect();
      pendingHeightUpdates.clear();
      heights.clear();
      itemRefs.clear();
    };
  });

  export function scrollToIndex(index: number, options: ScrollToIndexOptions = {}): void {
    if (!scrollContainer || index < 0 || index >= items.length) return;
    const { align = 'start', offset = 0 } = options;
    const itemPosition = positionsCache[index] ?? 0;
    const itemHeight = getItemHeight(index);
    let targetScrollTop: number;
    switch (align) {
      case 'center':
        targetScrollTop = itemPosition - (viewportHeight / 2) + (itemHeight / 2) + topMargin + offset;
        break;
      case 'end':
        targetScrollTop = itemPosition - viewportHeight + itemHeight + topMargin + offset;
        break;
      case 'start':
      default:
        targetScrollTop = itemPosition + topMargin + offset;
        break;
    }
    isAdjustingScroll = true;
    visibleStart = Math.max(0, index - buffer);
    visibleEnd = Math.min(items.length, index + buffer + 10);
    renderVersion++;
    setScrollTop(Math.max(0, targetScrollTop));
    tick().then(() => {
      requestAnimationFrame(() => {
        isAdjustingScroll = false;
        updateVisibleRange();
      });
    });
  }

  export function getScrollOffset(): number {
    return getScrollTop();
  }

  export function getItemElement(index: number): HTMLElement | null {
    if (index < 0 || index >= items.length) return null;
    const key = getKey(items[index], index);
    return itemRefs.get(key) ?? null;
  }

  export function prepareForIndex(index: number): void {
    if (index < 0 || index >= items.length || !scrollContainer) return;
    visibleStart = Math.max(0, index - buffer);
    visibleEnd = Math.min(items.length, index + buffer + 10);
    viewportHeight = getViewportHeight();
    renderVersion++;
  }

  export function getPositionForIndex(index: number): number {
    if (index < 0 || index >= items.length) return 0;
    return positionsCache[index] ?? (index * averageMeasuredHeight);
  }

  export function getTotalHeight(): number {
    return totalHeightCache;
  }

  export function getScrollState(): ScrollState | null {
    if (items.length === 0) return null;
    const currentScrollTop = getScrollTop();
    const adjustedScrollTop = Math.max(0, currentScrollTop - topMargin);
    let index = 0;
    let offset = adjustedScrollTop;
    for (let i = 0; i < items.length; i++) {
      const pos = positionsCache[i] ?? 0;
      const height = getItemHeight(i);
      if (pos + height > adjustedScrollTop) {
        index = i;
        offset = adjustedScrollTop - pos;
        break;
      }
    }
    const heightsArray: [string, number][] = [];
    const rangeStart = Math.max(0, index - 30);
    const rangeEnd = Math.min(items.length, index + 50);
    for (let i = rangeStart; i < rangeEnd; i++) {
      const key = getKey(items[i], i);
      const h = heights.get(key);
      if (h !== undefined) {
        heightsArray.push([key, h]);
      }
    }
    return { index, offset, heights: heightsArray };
  }

  export function restoreScrollState(state: ScrollState): void {
    if (!state || !scrollContainer) return;
    hasRestoredScroll = true;
    if (state.heights && state.heights.length > 0) {
      for (const [key, value] of state.heights) {
        heights.set(key, value);
      }
    }
    recalculatePositions();
    if (state.index >= 0 && state.index < items.length) {
      const position = positionsCache[state.index] ?? 0;
      const targetScrollTop = position + (state.offset ?? 0) + topMargin;
      isAdjustingScroll = true;
      visibleStart = Math.max(0, state.index - buffer);
      visibleEnd = Math.min(items.length, state.index + buffer + 10);
      renderVersion++;
      setScrollTop(Math.max(0, targetScrollTop));
      tick().then(() => {
        requestAnimationFrame(() => {
          isAdjustingScroll = false;
          anchorIndex = state.index;
          anchorOffset = state.offset ?? 0;
          updateVisibleRange();
        });
      });
    }
  }
</script>

<div class="virtual-list" bind:this={listEl}>
  {#if isVirtualizationEnabled}
    <div
      bind:this={topSentinelEl}
      class="virtual-sentinel"
      style:height="{topSpacerHeight}px"
      aria-hidden="true"
    ></div>
  {/if}

  {#each visibleItems as item, i (getKey(item, visibleRange.start + i))}
    {@const index = visibleRange.start + i}
    {@const key = getKey(item, index)}
    <div class="virtual-item" use:itemAction={key}>
      {@render children(item, index)}
    </div>
  {/each}

  {#if isVirtualizationEnabled}
    <div
      bind:this={bottomSentinelEl}
      class="virtual-sentinel"
      style:height="{bottomSpacerHeight}px"
      aria-hidden="true"
    ></div>
  {/if}
</div>

<style>
  .virtual-list {
    position: relative;
    contain: layout style;
  }
  .virtual-sentinel {
    pointer-events: none;
    contain: strict;
    will-change: height;
  }
  .virtual-item {
    contain: layout style;
  }
</style>
