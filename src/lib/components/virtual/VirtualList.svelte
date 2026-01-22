<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { VisibleRange, ScrollToIndexOptions } from './types';
  interface Props<T> {
    items: T[];
    getKey: (item: T, index: number) => string;
    scrollContainer: HTMLElement | null | undefined;
    buffer?: number;
    estimatedItemHeight?: number;
    topMargin?: number;
    maintainScrollPosition?: boolean;
    isTopScrolling?: boolean;
    onRangeChange?: (range: VisibleRange) => void;
    children: Snippet<[T, number]>;
  }
  let {
    items,
    getKey,
    scrollContainer,
    buffer = 5,
    estimatedItemHeight = 150,
    topMargin = 0,
    maintainScrollPosition = true,
    isTopScrolling = false,
    onRangeChange,
    children
  }: Props<any> = $props();
  let heights = new Map<string, number>();
  let scrollOffset = $state(0);
  let viewportHeight = $state(0);
  let positionsCache: number[] = [];
  let totalHeightCache = 0;
  let renderVersion = $state(0);
  let isAdjustingScroll = false;
  let lastScrollOffset = 0;
  let scrollDirection: 'up' | 'down' | 'none' = 'none';
  let anchorIndex = -1;
  let anchorOffset = 0;
  let itemRefs = new Map<string, HTMLElement>();
  let resizeObserver: ResizeObserver | null = null;
  let containerResizeObserver: ResizeObserver | null = null;
  let scrollRafId: number | null = null;
  let pendingHeightUpdates = new Map<string, number>();
  let heightUpdateRafId: number | null = null;
  let averageMeasuredHeight = $derived.by(() => {
    void renderVersion;
    if (heights.size === 0) return estimatedItemHeight;
    let total = 0;
    for (const h of heights.values()) {
      total += h;
    }
    return total / heights.size;
  });
  let isVirtualizationEnabled = $derived(
    scrollContainer !== null &&
    scrollContainer !== undefined &&
    viewportHeight > 0
  );
  let isWindowScroll = $derived(
    scrollContainer === document.documentElement ||
    scrollContainer === document.body
  );
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
  function findStartIndex(scrollTop: number): number {
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
  let visibleRange = $derived.by((): VisibleRange => {
    void renderVersion;
    if (items.length === 0) {
      return { start: 0, end: 0 };
    }
    if (!isVirtualizationEnabled) {
      return { start: 0, end: items.length };
    }
    const adjustedScrollOffset = Math.max(0, scrollOffset - topMargin);
    const start = findStartIndex(adjustedScrollOffset);
    const end = findEndIndex(adjustedScrollOffset + viewportHeight);
    const upBuffer = scrollDirection === 'up' ? buffer + 2 : buffer;
    const downBuffer = scrollDirection === 'down' ? buffer + 2 : buffer;
    return {
      start: Math.max(0, start - upBuffer),
      end: Math.min(items.length, end + downBuffer)
    };
  });
  let visibleItems = $derived(items.slice(visibleRange.start, visibleRange.end));
  let topSpacerHeight = $derived.by(() => {
    void renderVersion;
    return isVirtualizationEnabled ? (positionsCache[visibleRange.start] ?? 0) : 0;
  });
  let bottomSpacerHeight = $derived.by(() => {
    void renderVersion;
    if (!isVirtualizationEnabled || items.length === 0) return 0;
    const endPosition = positionsCache[visibleRange.end] ?? totalHeightCache;
    return Math.max(0, totalHeightCache - endPosition);
  });
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
  function handleScroll(event: Event) {
    if (isAdjustingScroll) return;
    if (scrollRafId !== null) return;
    scrollRafId = requestAnimationFrame(() => {
      scrollRafId = null;
      const newScrollOffset = getScrollTop();
      const newViewportHeight = getViewportHeight();
      const scrollDelta = newScrollOffset - lastScrollOffset;
      if (Math.abs(scrollDelta) > 5) {
        scrollDirection = scrollDelta > 0 ? 'down' : 'up';
      }
      if (newViewportHeight !== viewportHeight) {
        viewportHeight = newViewportHeight;
      }
      lastScrollOffset = newScrollOffset;
      if (isTopScrolling) {
        if (newScrollOffset <= 50) {
          scrollOffset = newScrollOffset;
        }
        return;
      }
      const scrollDeltaFromLast = Math.abs(newScrollOffset - scrollOffset);
      if (scrollDeltaFromLast > 20) {
        scrollOffset = newScrollOffset;
      }
      if (maintainScrollPosition) {
        updateAnchor(newScrollOffset);
      }
    });
  }
  function updateAnchor(currentScrollTop: number): void {
    if (isAdjustingScroll || isTopScrolling || items.length === 0) return;
    const adjustedScrollTop = Math.max(0, currentScrollTop - topMargin);
    for (let i = 0; i < items.length; i++) {
      const pos = positionsCache[i] ?? 0;
      const height = getItemHeight(i);
      if (pos + height > adjustedScrollTop) {
        anchorIndex = i;
        anchorOffset = adjustedScrollTop - pos;
        return;
      }
    }
  }
  function flushHeightUpdates() {
    if (pendingHeightUpdates.size === 0) return;
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
    if (!hasChanges) return;
    recalculatePositions();
    if (scrollAdjustment !== 0 && currentScrollTop > 10 && !isTopScrolling && maintainScrollPosition) {
      isAdjustingScroll = true;
      setScrollTop(currentScrollTop + scrollAdjustment);
      requestAnimationFrame(() => {
        isAdjustingScroll = false;
        scrollOffset = getScrollTop();
      });
    }
    renderVersion++;
  }
  function scheduleHeightUpdate() {
    if (heightUpdateRafId !== null) return;
    heightUpdateRafId = requestAnimationFrame(() => {
      heightUpdateRafId = null;
      flushHeightUpdates();
    });
  }
  function setupResizeObserver() {
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
  function observeItemAction(element: HTMLElement, key: string) {
    if (resizeObserver) {
      element.dataset.virtualKey = key;
      resizeObserver.observe(element);
      itemRefs.set(key, element);
    }
    return {
      update(newKey: string) {
        if (element.dataset.virtualKey !== newKey) {
          const oldKey = element.dataset.virtualKey!;
          if (resizeObserver) {
            resizeObserver.unobserve(element);
          }
          itemRefs.delete(oldKey);
          element.dataset.virtualKey = newKey;
          if (resizeObserver) {
            resizeObserver.observe(element);
            itemRefs.set(newKey, element);
          }
        }
      },
      destroy() {
        const k = element.dataset.virtualKey;
        if (k) {
          if (resizeObserver) {
            resizeObserver.unobserve(element);
          }
          itemRefs.delete(k);
        }
      }
    };
  }
  let previousItemsLength = 0;
  let previousFirstKey: string | null = null;
  $effect(() => {
    const len = items.length;
    const firstKey = len > 0 ? getKey(items[0], 0) : null;
    recalculatePositions();
    if (len === 0) {
      previousFirstKey = null;
      previousItemsLength = 0;
      anchorIndex = -1;
      return;
    }
    if (!maintainScrollPosition || !scrollContainer) {
      previousFirstKey = firstKey;
      previousItemsLength = len;
      return;
    }
    const isPrepend = previousFirstKey !== null &&
                      firstKey !== previousFirstKey &&
                      len > previousItemsLength;
    if (isPrepend && anchorIndex >= 0 && !isTopScrolling) {
      const currentScrollTop = getScrollTop();
      if (currentScrollTop > 10) {
        const prependCount = len - previousItemsLength;
        const newAnchorIndex = anchorIndex + prependCount;
        if (newAnchorIndex < len) {
          const newAnchorPosition = positionsCache[newAnchorIndex] ?? 0;
          const newScrollTop = newAnchorPosition + anchorOffset + topMargin;
          isAdjustingScroll = true;
          setScrollTop(newScrollTop);
          tick().then(() => {
            requestAnimationFrame(() => {
              isAdjustingScroll = false;
              scrollOffset = getScrollTop();
              anchorIndex = newAnchorIndex;
            });
          });
        }
      }
    }
    previousFirstKey = firstKey;
    previousItemsLength = len;
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
      scrollOffset = window.scrollY;
      lastScrollOffset = window.scrollY;
      const handleResize = () => {
        const newHeight = window.innerHeight;
        if (newHeight !== viewportHeight && newHeight > 0) {
          viewportHeight = newHeight;
        }
      };
      window.addEventListener('resize', handleResize, { passive: true });
      return () => {
        window.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
      };
    } else {
      viewportHeight = scrollContainer.clientHeight;
      scrollOffset = scrollContainer.scrollTop;
      lastScrollOffset = scrollContainer.scrollTop;
      containerResizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newHeight = entry.contentRect.height;
          if (newHeight !== viewportHeight && newHeight > 0) {
            viewportHeight = newHeight;
          }
        }
      });
      containerResizeObserver.observe(scrollContainer);
      return () => {
        scrollContainer.removeEventListener('scroll', handleScroll);
        if (containerResizeObserver) {
          containerResizeObserver.disconnect();
          containerResizeObserver = null;
        }
      };
    }
  });
  onMount(() => {
    setupResizeObserver();
    recalculatePositions();
    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (scrollRafId !== null) {
        cancelAnimationFrame(scrollRafId);
      }
      if (heightUpdateRafId !== null) {
        cancelAnimationFrame(heightUpdateRafId);
      }
      pendingHeightUpdates.clear();
      heights.clear();
      itemRefs.clear();
    };
  });
  export function scrollToIndex(index: number, options: ScrollToIndexOptions = {}) {
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
    setScrollTop(Math.max(0, targetScrollTop));
    tick().then(() => {
      requestAnimationFrame(() => {
        isAdjustingScroll = false;
        scrollOffset = getScrollTop();
        updateAnchor(scrollOffset);
      });
    });
  }
  export function getScrollOffset(): number {
    return scrollOffset;
  }
  export function getItemElement(index: number): HTMLElement | null {
    if (index < 0 || index >= items.length) return null;
    const key = getKey(items[index], index);
    return itemRefs.get(key) ?? null;
  }
  export function prepareForIndex(index: number): void {
    if (index < 0 || index >= items.length || !scrollContainer) return;
    const targetPosition = positionsCache[index] ?? (index * averageMeasuredHeight);
    scrollOffset = targetPosition;
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
</script>
<div class="virtual-list">
  {#if isVirtualizationEnabled && topSpacerHeight > 0}
    <div
      class="virtual-spacer virtual-spacer--top"
      style:height="{topSpacerHeight}px"
      aria-hidden="true"
    ></div>
  {/if}
  {#each visibleItems as item, i (getKey(item, visibleRange.start + i))}
    {@const index = visibleRange.start + i}
    {@const key = getKey(item, index)}
    <div
      class="virtual-item"
      use:observeItemAction={key}
    >
      {@render children(item, index)}
    </div>
  {/each}
  {#if isVirtualizationEnabled && bottomSpacerHeight > 0}
    <div
      class="virtual-spacer"
      style:height="{bottomSpacerHeight}px"
      aria-hidden="true"
    ></div>
  {/if}
</div>
<style>
  .virtual-list {
    position: relative;
    contain: layout;
  }
  .virtual-spacer {
    pointer-events: none;
    flex-shrink: 0;
    contain: strict;
  }
  .virtual-item {
    contain: layout style;
  }
</style>
