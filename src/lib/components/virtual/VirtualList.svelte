<script lang="ts">
  import { tick } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { VisibleRange, ScrollToIndexOptions, ScrollState } from './types';

  const HEIGHT_CHANGE_THRESHOLD = 2;
  const DEFAULT_ITEM_HEIGHT = 100;

  interface Props<T> {
    items: T[];
    getKey: (item: T, index: number) => string;
    scrollContainer: HTMLElement | null | undefined;
    buffer?: number;
    topMargin?: number;
    initialScrollState?: ScrollState | null;
    onRangeChange?: (range: VisibleRange) => void;
    children: Snippet<[T, number]>;
  }

  let {
    items,
    getKey,
    scrollContainer,
    buffer = 8,
    topMargin = 0,
    initialScrollState = null,
    onRangeChange,
    children
  }: Props<any> = $props();

  let visibleStart = $state(0);
  let visibleEnd = $state(0);
  let viewportHeight = $state(0);
  let renderVersion = $state(0);
  let positions = $state<number[]>([]);
  let totalHeight = $state(0);

  let heights = new Map<string, number>();
  let totalMeasuredHeight = 0;
  let measuredCount = 0;

  let itemRefs = new Map<string, HTMLElement>();
  let pendingHeightUpdates = new Map<string, number>();
  let heightUpdateScheduled = false;
  let isNavigating = false;
  let hasRestoredScroll = false;
  let scrollRafId: number | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let prevItemCount = 0;
  let prevFirstKey = '';
  let prevLastKey = '';

  let isWindowScroll = $derived(
    typeof document !== 'undefined' &&
    (scrollContainer === document.documentElement || scrollContainer === document.body)
  );

  let isVirtualizationEnabled = $derived(
    scrollContainer != null && viewportHeight > 0 && items.length > 0
  );

  let visibleRange = $derived.by((): VisibleRange => {
    void renderVersion;
    if (items.length === 0) return { start: 0, end: 0 };
    if (!isVirtualizationEnabled) return { start: 0, end: Math.min(items.length, 20) };
    return {
      start: Math.max(0, visibleStart - buffer),
      end: Math.min(items.length, visibleEnd + buffer)
    };
  });

  let visibleItems = $derived(items.slice(visibleRange.start, visibleRange.end));

  let topSpacerHeight = $derived.by(() => {
    if (!isVirtualizationEnabled) return 0;
    return positions[visibleRange.start] ?? 0;
  });

  let bottomSpacerHeight = $derived.by(() => {
    if (!isVirtualizationEnabled || items.length === 0) return 0;
    const endPosition = positions[visibleRange.end] ?? totalHeight;
    return Math.max(0, totalHeight - endPosition);
  });

  function getAverageHeight(): number {
    return measuredCount > 0 ? totalMeasuredHeight / measuredCount : DEFAULT_ITEM_HEIGHT;
  }

  function setHeight(key: string, height: number): void {
    const existing = heights.get(key);
    if (existing !== undefined) {
      totalMeasuredHeight -= existing;
    } else {
      measuredCount++;
    }

    heights.set(key, height);
    totalMeasuredHeight += height;
  }

  function getItemHeight(index: number): number {
    if (index < 0 || index >= items.length) return getAverageHeight();
    const key = getKey(items[index], index);
    return heights.get(key) ?? getAverageHeight();
  }

  function recalculatePositions(): void {
    const len = items.length;
    if (len === 0) {
      positions = [];
      totalHeight = 0;
      return;
    }

    const newPositions = new Array(len);
    let cumulative = 0;
    const fallbackHeight = getAverageHeight();

    for (let i = 0; i < len; i++) {
      newPositions[i] = cumulative;
      const key = getKey(items[i], i);
      cumulative += heights.get(key) ?? fallbackHeight;
    }

    positions = newPositions;
    totalHeight = cumulative;
  }

  function appendPositions(startIndex: number): void {
    const len = items.length;
    if (len === 0 || startIndex >= len) return;

    const fallbackHeight = getAverageHeight();
    const newPositions = [...positions];

    let cumulative = startIndex > 0
      ? (positions[startIndex - 1] ?? 0) + getItemHeight(startIndex - 1)
      : 0;

    for (let i = startIndex; i < len; i++) {
      newPositions[i] = cumulative;
      const key = getKey(items[i], i);
      cumulative += heights.get(key) ?? fallbackHeight;
    }

    positions = newPositions;
    totalHeight = cumulative;
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
    if (positions.length === 0) return 0;
    let left = 0;
    let right = positions.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right + 1) / 2);
      if (positions[mid] <= scrollTop) {
        left = mid;
      } else {
        right = mid - 1;
      }
    }
    return left;
  }

  function findEndIndex(scrollBottom: number): number {
    if (positions.length === 0) return 0;
    let left = 0;
    let right = positions.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right + 1) / 2);
      if (positions[mid] <= scrollBottom) {
        left = mid;
      } else {
        right = mid - 1;
      }
    }
    return Math.min(items.length, left + 1);
  }

  function updateVisibleRange(): void {
    if (!scrollContainer || items.length === 0) return;

    const scrollTop = getScrollTop();
    const height = getViewportHeight();
    if (height !== viewportHeight) viewportHeight = height;

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
    if (isNavigating || scrollRafId !== null) return;
    scrollRafId = requestAnimationFrame(() => {
      scrollRafId = null;
      updateVisibleRange();
    });
  }

  function flushHeightUpdates(): void {
    if (pendingHeightUpdates.size === 0) {
      heightUpdateScheduled = false;
      return;
    }

    let hasChanges = false;

    for (const [key, newHeight] of pendingHeightUpdates) {
      const oldHeight = heights.get(key);
      if (oldHeight !== undefined && Math.abs(oldHeight - newHeight) < 1) continue;
      setHeight(key, newHeight);
      hasChanges = true;
    }

    pendingHeightUpdates.clear();
    heightUpdateScheduled = false;

    if (hasChanges) {
      recalculatePositions();
      updateVisibleRange();
    }
  }

  function scheduleHeightUpdate(): void {
    if (heightUpdateScheduled) return;
    heightUpdateScheduled = true;
    requestAnimationFrame(flushHeightUpdates);
  }

  function createResizeObserver(): ResizeObserver {
    return new ResizeObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        const key = el.dataset.virtualKey;
        if (!key) continue;

        const newHeight = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
        if (newHeight <= 0) continue;

        const oldHeight = heights.get(key);
        if (oldHeight !== undefined && Math.abs(oldHeight - newHeight) < HEIGHT_CHANGE_THRESHOLD) {
          continue;
        }
        pendingHeightUpdates.set(key, newHeight);
      }

      if (pendingHeightUpdates.size > 0) {
        scheduleHeightUpdate();
      }
    });
  }

  function scrollContainerAttach(element: HTMLElement) {
    resizeObserver = createResizeObserver();

    const scrollTarget = isWindowScroll ? window : scrollContainer!;
    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });

    if (isWindowScroll) {
      viewportHeight = window.innerHeight;
      const handleResize = () => {
        const newHeight = window.innerHeight;
        if (newHeight !== viewportHeight && newHeight > 0) {
          viewportHeight = newHeight;
          updateVisibleRange();
        }
      };
      window.addEventListener('resize', handleResize, { passive: true });
      queueMicrotask(() => updateVisibleRange());

      return () => {
        if (scrollRafId !== null) cancelAnimationFrame(scrollRafId);
        resizeObserver?.disconnect();
        scrollTarget.removeEventListener('scroll', handleScroll);
        window.removeEventListener('resize', handleResize);
        itemRefs.clear();
      };
    } else {
      viewportHeight = scrollContainer!.clientHeight;
      const containerObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newHeight = entry.contentRect.height;
          if (newHeight !== viewportHeight && newHeight > 0) {
            viewportHeight = newHeight;
            updateVisibleRange();
          }
        }
      });
      containerObserver.observe(scrollContainer!);
      queueMicrotask(() => updateVisibleRange());

      return () => {
        if (scrollRafId !== null) cancelAnimationFrame(scrollRafId);
        resizeObserver?.disconnect();
        containerObserver.disconnect();
        scrollTarget.removeEventListener('scroll', handleScroll);
        itemRefs.clear();
      };
    }
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

  $effect(() => {
    const len = items.length;
    void items;

    if (len === 0) {
      positions = [];
      totalHeight = 0;
      visibleStart = 0;
      visibleEnd = 0;
      prevItemCount = 0;
      prevFirstKey = '';
      prevLastKey = '';
      queueMicrotask(() => renderVersion++);
      return;
    }

    const firstKey = getKey(items[0], 0);
    const lastKey = getKey(items[len - 1], len - 1);
    const oldCount = prevItemCount;
    const oldFirstKey = prevFirstKey;
    const oldLastKey = prevLastKey;

    prevItemCount = len;
    prevFirstKey = firstKey;
    prevLastKey = lastKey;

    if (oldCount === 0) {
      recalculatePositions();
      queueMicrotask(() => {
        renderVersion++;
        updateVisibleRange();
      });
      return;
    }

    if (len > oldCount && firstKey === oldFirstKey) {
      if (oldLastKey && getKey(items[oldCount - 1], oldCount - 1) === oldLastKey) {
        appendPositions(oldCount);
        renderVersion++;
      } else {
        recalculatePositions();
        queueMicrotask(() => {
          renderVersion++;
          updateVisibleRange();
        });
      }
      return;
    }

    if (len > oldCount && oldFirstKey && firstKey !== oldFirstKey) {
      let shiftCount = 0;
      const limit = Math.min(len, len - oldCount + 10);
      for (let i = 1; i < limit; i++) {
        if (getKey(items[i], i) === oldFirstKey) {
          shiftCount = i;
          break;
        }
      }

      const needsManualAdjust = scrollContainer && getScrollTop() === 0;

      recalculatePositions();

      if (shiftCount > 0) {
        if (needsManualAdjust) {
          visibleStart = 0;
          visibleEnd = Math.min(items.length, shiftCount + buffer + 10);
          renderVersion++;
          isNavigating = true;

          tick().then(() => {
            let measuredHeight = 0;
            for (let i = 0; i < shiftCount; i++) {
              const key = getKey(items[i], i);
              const el = itemRefs.get(key);
              if (el) {
                const h = el.getBoundingClientRect().height;
                setHeight(key, h);
                measuredHeight += h;
              } else {
                measuredHeight += getItemHeight(i);
              }
            }
            recalculatePositions();
            setScrollTop(measuredHeight);
            requestAnimationFrame(() => {
              isNavigating = false;
              updateVisibleRange();
            });
          });
        } else {
          visibleStart = Math.max(0, visibleStart + shiftCount);
          visibleEnd = Math.min(items.length, visibleEnd + shiftCount);
          renderVersion++;
        }
      } else {
        queueMicrotask(() => {
          renderVersion++;
          updateVisibleRange();
        });
      }
      return;
    }

    recalculatePositions();
    queueMicrotask(() => {
      renderVersion++;
      updateVisibleRange();
    });
  });

  $effect(() => {
    onRangeChange?.(visibleRange);
  });

  $effect(() => {
    if (scrollContainer && initialScrollState && !hasRestoredScroll && items.length > 0) {
      hasRestoredScroll = true;
      if (initialScrollState.heights?.length > 0) {
        for (const [key, value] of initialScrollState.heights) {
          setHeight(key, value);
        }
      }
      recalculatePositions();

      const targetIdx = findTargetIndex(initialScrollState);
      if (targetIdx >= 0 && targetIdx < items.length) {
        const position = positions[targetIdx] ?? 0;
        const targetScrollTop = position + (initialScrollState.offset ?? 0);
        isNavigating = true;
        visibleStart = Math.max(0, targetIdx - buffer);
        visibleEnd = Math.min(items.length, targetIdx + buffer + 10);
        renderVersion++;

        tick().then(() => {
          setScrollTop(Math.max(0, targetScrollTop));
          requestAnimationFrame(() => correctScrollPosition(targetIdx, 'start', initialScrollState!.offset ?? 0, 0));
        });
      }
    }
  });

  function measureRenderedItems(): void {
    for (const [key, el] of itemRefs) {
      const h = el.getBoundingClientRect().height;
      if (h <= 0) continue;
      const existing = heights.get(key);
      if (existing === undefined || Math.abs(existing - h) >= 1) {
        setHeight(key, h);
      }
    }
  }

  function computeScrollTop(index: number, align: string, offset: number): number {
    const pos = positions[index] ?? 0;
    const itemH = getItemHeight(index);
    const usable = viewportHeight - topMargin;
    switch (align) {
      case 'center': return pos - usable / 2 + itemH / 2 + offset;
      case 'end': return pos - usable + itemH + offset;
      default: return pos + offset;
    }
  }

  function correctScrollPosition(index: number, align: string, offset: number, pass: number): void {
    if (pass >= 3) {
      isNavigating = false;
      updateVisibleRange();
      return;
    }

    measureRenderedItems();
    recalculatePositions();

    const corrected = Math.max(0, computeScrollTop(index, align, offset));
    const current = getScrollTop();

    if (Math.abs(current - corrected) > 2) {
      setScrollTop(corrected);
      requestAnimationFrame(() => correctScrollPosition(index, align, offset, pass + 1));
    } else {
      isNavigating = false;
      updateVisibleRange();
    }
  }

  export function scrollToIndex(index: number, options: ScrollToIndexOptions = {}): void {
    if (!scrollContainer || index < 0 || index >= items.length) return;
    recalculatePositions();

    const { align = 'start', offset = 0 } = options;
    const targetScrollTop = computeScrollTop(index, align, offset);

    isNavigating = true;
    visibleStart = Math.max(0, index - buffer);
    visibleEnd = Math.min(items.length, index + buffer + 10);
    renderVersion++;

    tick().then(() => {
      setScrollTop(Math.max(0, targetScrollTop));
      requestAnimationFrame(() => correctScrollPosition(index, align, offset, 0));
    });
  }

  export function getScrollState(): ScrollState | null {
    if (items.length === 0) return null;
    const currentScrollTop = getScrollTop();
    const index = findIndexAtPosition(currentScrollTop);
    const key = getKey(items[index], index);
    const offset = currentScrollTop - (positions[index] ?? 0);

    const heightsArray: [string, number][] = Array.from(heights.entries());

    return { index, key, offset, heights: heightsArray };
  }

  function findTargetIndex(state: ScrollState): number {
    let targetIdx = state.index;
    if (state.key && items.length > 0) {
      const currentKey = targetIdx >= 0 && targetIdx < items.length
        ? getKey(items[targetIdx], targetIdx)
        : '';
      if (currentKey !== state.key) {
        for (let i = 0; i < items.length; i++) {
          if (getKey(items[i], i) === state.key) {
            targetIdx = i;
            break;
          }
        }
      }
    }
    return targetIdx;
  }

  export function restoreScrollState(state: ScrollState): void {
    if (!state || !scrollContainer) return;
    hasRestoredScroll = true;

    heights.clear();
    totalMeasuredHeight = 0;
    measuredCount = 0;

    if (state.heights?.length > 0) {
      for (const [key, value] of state.heights) {
        setHeight(key, value);
      }
    }
    recalculatePositions();

    const targetIdx = findTargetIndex(state);
    if (targetIdx >= 0 && targetIdx < items.length) {
      const position = positions[targetIdx] ?? 0;
      const targetScrollTop = position + (state.offset ?? 0);
      isNavigating = true;
      visibleStart = Math.max(0, targetIdx - buffer);
      visibleEnd = Math.min(items.length, targetIdx + buffer + 10);
      renderVersion++;

      tick().then(() => {
        setScrollTop(Math.max(0, targetScrollTop));
        requestAnimationFrame(() => correctScrollPosition(targetIdx, 'start', state.offset ?? 0, 0));
      });
    }
  }

  export function getPositionForIndex(index: number): number {
    if (index < 0 || index >= items.length) return 0;
    return positions[index] ?? 0;
  }

  export function prepareForIndex(index: number): void {
    if (index < 0 || index >= items.length || !scrollContainer) return;
    visibleStart = Math.max(0, index - buffer);
    visibleEnd = Math.min(items.length, index + buffer + 10);
    viewportHeight = getViewportHeight();
    renderVersion++;
  }

  export function getItemElement(index: number): HTMLElement | null {
    if (index < 0 || index >= items.length) return null;
    const key = getKey(items[index], index);
    return itemRefs.get(key) ?? null;
  }
</script>

{#if scrollContainer}
  <div class="virtual-list" {@attach scrollContainerAttach}>
    {#if isVirtualizationEnabled}
      <div class="virtual-spacer" style:height="{topSpacerHeight}px" aria-hidden="true"></div>
    {/if}

    {#each visibleItems as item, i (getKey(item, visibleRange.start + i))}
      {@const index = visibleRange.start + i}
      {@const key = getKey(item, index)}
      <div class="virtual-item" {@attach itemAttach(key)}>
        {@render children(item, index)}
      </div>
    {/each}

    {#if isVirtualizationEnabled}
      <div class="virtual-spacer" style:height="{bottomSpacerHeight}px" aria-hidden="true"></div>
    {/if}
  </div>
{:else}
  <div class="virtual-list virtual-list--no-virtualization">
    {#each items.slice(0, 20) as item, index (getKey(item, index))}
      <div class="virtual-item" {@attach itemAttach(getKey(item, index))}>
        {@render children(item, index)}
      </div>
    {/each}
  </div>
{/if}

<style>
  .virtual-list {
    position: relative;
  }

  .virtual-spacer {
    pointer-events: none;
    overflow-anchor: none;
  }
</style>
