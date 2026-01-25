<script lang="ts">
  import { tick } from 'svelte';
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

  let heights = new Map<string, number>();
  let positionsCache: number[] = [];
  let totalHeightCache = 0;
  let itemRefs = new Map<string, HTMLElement>();

  let visibleStart = 0;
  let visibleEnd = 0;
  let viewportHeight = $state(0);
  let renderVersion = $state(0);

  let isAdjustingScroll = false;
  let pendingHeightUpdates = new Map<string, number>();
  let heightUpdateScheduled = false;
  let hasRestoredScroll = false;

  let previousItemsLength = 0;
  let previousFirstKey: string | null = null;

  let capturedAnchorKey: string | null = null;
  let capturedAnchorTop: number | null = null;
  let capturedScrollTop: number = 0;

  let resizeObserver: ResizeObserver | null = null;

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
    for (let i = 0; i < len; i++) {
      newPositions[i] = cumulative;
      const key = getKey(items[i], i);
      cumulative += heights.get(key) ?? estimatedItemHeight;
    }
    positionsCache = newPositions;
    totalHeightCache = cumulative;
  }

  function getItemHeight(index: number): number {
    if (index < 0 || index >= items.length) return estimatedItemHeight;
    const key = getKey(items[index], index);
    return heights.get(key) ?? estimatedItemHeight;
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
    let left = 0;
    let right = positionsCache.length - 1;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      if (positionsCache[mid] < scrollTop) {
        left = mid + 1;
      } else {
        right = mid;
      }
    }
    return Math.max(0, left - 1);
  }

  function findEndIndex(scrollBottom: number): number {
    if (positionsCache.length === 0) return 0;
    let left = 0;
    let right = positionsCache.length - 1;
    while (left < right) {
      const mid = Math.floor((left + right) / 2);
      const itemBottom = positionsCache[mid] + getItemHeight(mid);
      if (itemBottom <= scrollBottom) {
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
    const usableHeight = height - topMargin;
    const newStart = findIndexAtPosition(scrollTop);
    const newEnd = findEndIndex(scrollTop + usableHeight);
    if (newStart !== visibleStart || newEnd !== visibleEnd) {
      visibleStart = newStart;
      visibleEnd = newEnd;
      renderVersion++;
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
    let viewportStartIndex = 0;
    let cumulative = 0;
    for (let i = 0; i < items.length; i++) {
      const key = getKey(items[i], i);
      const height = heights.get(key);
      if (height === undefined) continue;
      if (cumulative + height > currentScrollTop) {
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
      const oldHeight = heights.get(key);
      if (oldHeight !== undefined && Math.abs(oldHeight - newHeight) < 1) continue;
      const itemIndex = keyToIndex.get(key) ?? -1;
      if (maintainScrollPosition && oldHeight !== undefined && itemIndex !== -1 && itemIndex < viewportStartIndex) {
        scrollAdjustment += newHeight - oldHeight;
      }
      heights.set(key, newHeight);
      hasChanges = true;
    }
    pendingHeightUpdates.clear();
    heightUpdateScheduled = false;
    if (!hasChanges) return;
    recalculatePositions();
    if (scrollAdjustment !== 0 && !isTopScrolling && maintainScrollPosition) {
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

  function itemAttach(key: string) {
    return (element: HTMLElement) => {
      element.dataset.virtualKey = key;
      resizeObserver?.observe(element);
      itemRefs.set(key, element);

      return () => {
        resizeObserver?.unobserve(element);
        itemRefs.delete(key);
      };
    };
  }

  function scrollContainerAttach(element: HTMLElement) {
    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const key = el.dataset.virtualKey;
        if (!key) continue;
        const newHeight = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        if (newHeight > 0) {
          pendingHeightUpdates.set(key, newHeight);
        }
      }
      scheduleHeightUpdate();
    });

    const scrollTarget = isWindowScroll ? window : scrollContainer!;
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
        resizeObserver?.disconnect();
        scrollTarget.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
        itemRefs.clear();
        heights.clear();
      };
    } else {
      viewportHeight = scrollContainer!.clientHeight;
      const containerResizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newHeight = entry.contentRect.height;
          if (newHeight !== viewportHeight && newHeight > 0) {
            viewportHeight = newHeight;
          }
        }
      });
      containerResizeObserver.observe(scrollContainer!);
      queueMicrotask(() => updateVisibleRange());

      return () => {
        resizeObserver?.disconnect();
        containerResizeObserver.disconnect();
        scrollTarget.removeEventListener('scroll', handleScroll);
        itemRefs.clear();
        heights.clear();
      };
    }
  }

  function topSentinelAttach(element: HTMLElement) {
    const root = isWindowScroll ? null : scrollContainer;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && visibleStart > 0) {
          updateVisibleRange();
        }
      },
      { root, rootMargin: `${viewportHeight}px 0px`, threshold: 0 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }

  function bottomSentinelAttach(element: HTMLElement) {
    const root = isWindowScroll ? null : scrollContainer;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && visibleEnd < items.length) {
          updateVisibleRange();
        }
      },
      { root, rootMargin: `${viewportHeight}px 0px`, threshold: 0 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }

  $effect.pre(() => {
    void items.length;

    if (!maintainScrollPosition || isTopScrolling || !scrollContainer || itemRefs.size === 0) {
      capturedAnchorKey = null;
      capturedAnchorTop = null;
      return;
    }

    const visibleTop = isWindowScroll ? topMargin : (scrollContainer?.getBoundingClientRect().top ?? 0) + topMargin;
    const visibleBottom = visibleTop + viewportHeight - topMargin;

    let bestKey: string | null = null;
    let bestTop: number | null = null;
    let bestScore = Infinity;

    for (const [key, element] of itemRefs) {
      const rect = element.getBoundingClientRect();
      if (rect.height === 0) continue;
      if (rect.bottom < visibleTop - 100 || rect.top > visibleBottom + 100) continue;

      const distanceFromTop = Math.abs(rect.top - visibleTop);
      if (distanceFromTop < bestScore) {
        bestScore = distanceFromTop;
        bestKey = key;
        bestTop = rect.top;
      }
    }

    capturedAnchorKey = bestKey;
    capturedAnchorTop = bestTop;
    capturedScrollTop = getScrollTop();
  });

  $effect(() => {
    const len = items.length;
    const firstKey = len > 0 ? getKey(items[0], 0) : null;

    if (len === 0) {
      recalculatePositions();
      previousFirstKey = null;
      previousItemsLength = 0;
      visibleStart = 0;
      visibleEnd = 0;
      capturedAnchorKey = null;
      capturedAnchorTop = null;
      queueMicrotask(() => renderVersion++);
      return;
    }

    const shouldMaintainPosition = maintainScrollPosition && !isTopScrolling && scrollContainer;

    if (shouldMaintainPosition && capturedAnchorKey !== null && capturedAnchorTop !== null) {
      const anchorKey = capturedAnchorKey;
      const anchorTop = capturedAnchorTop;
      const scrollTopBefore = capturedScrollTop;

      capturedAnchorKey = null;
      capturedAnchorTop = null;

      recalculatePositions();
      previousFirstKey = firstKey;
      previousItemsLength = len;

      tick().then(() => {
        const element = itemRefs.get(anchorKey);
        if (element) {
          const newTop = element.getBoundingClientRect().top;
          const diff = newTop - anchorTop;

          if (Math.abs(diff) > 0.5) {
            isAdjustingScroll = true;
            setScrollTop(scrollTopBefore + diff);
            queueMicrotask(() => {
              isAdjustingScroll = false;
              updateVisibleRange();
            });
          } else {
            updateVisibleRange();
          }
        } else {
          updateVisibleRange();
        }
      });
      return;
    }

    capturedAnchorKey = null;
    capturedAnchorTop = null;

    recalculatePositions();
    previousFirstKey = firstKey;
    previousItemsLength = len;
    queueMicrotask(() => updateVisibleRange());
  });

  $effect(() => {
    onRangeChange?.(visibleRange);
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
        const targetScrollTop = position + (initialScrollState.offset ?? 0);
        const targetIndex = initialScrollState.index;
        isAdjustingScroll = true;
        setScrollTop(Math.max(0, targetScrollTop));
        visibleStart = Math.max(0, targetIndex - buffer);
        visibleEnd = Math.min(items.length, targetIndex + buffer + 10);
        queueMicrotask(() => {
          renderVersion++;
          tick().then(() => {
            requestAnimationFrame(() => {
              isAdjustingScroll = false;
              updateVisibleRange();
            });
          });
        });
      }
    }
  });

  export function scrollToIndex(index: number, options: ScrollToIndexOptions = {}): void {
    if (!scrollContainer || index < 0 || index >= items.length) return;
    const { align = 'start', offset = 0 } = options;
    const itemPosition = positionsCache[index] ?? 0;
    const itemHeight = getItemHeight(index);
    const usableHeight = viewportHeight - topMargin;
    let targetScrollTop: number;
    switch (align) {
      case 'center':
        targetScrollTop = itemPosition - (usableHeight / 2) + (itemHeight / 2) + offset;
        break;
      case 'end':
        targetScrollTop = itemPosition - usableHeight + itemHeight + offset;
        break;
      case 'start':
      default:
        targetScrollTop = itemPosition + offset;
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
    return positionsCache[index] ?? (index * estimatedItemHeight);
  }

  export function getTotalHeight(): number {
    return totalHeightCache;
  }

  export function getScrollState(): ScrollState | null {
    if (items.length === 0) return null;
    const currentScrollTop = getScrollTop();
    let index = 0;
    let offset = currentScrollTop;
    for (let i = 0; i < items.length; i++) {
      const pos = positionsCache[i] ?? 0;
      const height = getItemHeight(i);
      if (pos + height > currentScrollTop) {
        index = i;
        offset = currentScrollTop - pos;
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
      const targetScrollTop = position + (state.offset ?? 0);
      isAdjustingScroll = true;
      visibleStart = Math.max(0, state.index - buffer);
      visibleEnd = Math.min(items.length, state.index + buffer + 10);
      renderVersion++;
      setScrollTop(Math.max(0, targetScrollTop));
      tick().then(() => {
        requestAnimationFrame(() => {
          isAdjustingScroll = false;
          updateVisibleRange();
        });
      });
    }
  }
</script>

{#if scrollContainer}
  <div class="virtual-list" {@attach scrollContainerAttach}>
    {#if isVirtualizationEnabled}
      <div
        class="virtual-sentinel"
        style:height="{topSpacerHeight}px"
        aria-hidden="true"
        {@attach topSentinelAttach}
      ></div>
    {/if}

    {#each visibleItems as item, i (getKey(item, visibleRange.start + i))}
      {@const index = visibleRange.start + i}
      {@const key = getKey(item, index)}
      <div class="virtual-item" {@attach itemAttach(key)}>
        {@render children(item, index)}
      </div>
    {/each}

    {#if isVirtualizationEnabled}
      <div
        class="virtual-sentinel"
        style:height="{bottomSpacerHeight}px"
        aria-hidden="true"
        {@attach bottomSentinelAttach}
      ></div>
    {/if}
  </div>
{:else}
  <div class="virtual-list virtual-list--no-virtualization">
    {#each items as item, index (getKey(item, index))}
      {@const key = getKey(item, index)}
      <div class="virtual-item">
        {@render children(item, index)}
      </div>
    {/each}
  </div>
{/if}

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
