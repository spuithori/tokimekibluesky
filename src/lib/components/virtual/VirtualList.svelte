<script lang="ts">
  import { tick } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { VisibleRange, ScrollToIndexOptions, ScrollState } from './types';

  const HEIGHT_CHANGE_THRESHOLD = 2;
  const DEFAULT_ITEM_HEIGHT = 100;
  let fallbackItemHeight = DEFAULT_ITEM_HEIGHT;

  interface Props<T> {
    items: T[];
    getKey: (item: T, index: number) => string;
    scrollContainer: HTMLElement | null | undefined;
    buffer?: number;
    topMargin?: number;
    initialScrollState?: ScrollState | null;
    onRangeChange?: (range: VisibleRange) => void;
    onScroll?: () => void;
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
    onScroll,
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
  let pendingMinStart = Infinity;
  let heightUpdateScheduled = false;
  let isNavigating = false;
  let hasRestoredScroll = false;
  let minTotalHeight = 0;
  let scrollRafId: number | null = null;
  let correctionRafId: number | null = null;
  let heightUpdateRafId: number | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let prevItemCount = 0;
  let prevFirstKey = '';
  let prevLastKey = '';

  let lastValidScrollContainer: HTMLElement | null = null;
  let lastKnownScrollTop = 0;
  let lastKnownVisibleStart = 0;
  let lastUserScrollTime = 0;
  let quickPrependHandled = false;
  let pendingPrependAnchor: {
    scrollTop: number;
    anchorKey: string;
    anchorVisualY: number;
    containerTop: number;
    shiftCount: number;
    oldVisibleEnd: number;
  } | null = null;

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
    const endPosition = visibleRange.end < positions.length
      ? positions[visibleRange.end]
      : (positions.length > 0
          ? (positions[positions.length - 1] ?? 0) + getItemHeight(positions.length - 1)
          : 0);
    return Math.max(0, totalHeight - endPosition);
  });

  function pruneStaleHeights(): void {
    if (heights.size <= items.length * 2) return;
    const activeKeys = new Set<string>();
    for (let i = 0; i < items.length; i++) {
      activeKeys.add(getKey(items[i], i));
    }
    for (const key of heights.keys()) {
      if (!activeKeys.has(key)) {
        const h = heights.get(key)!;
        totalMeasuredHeight -= h;
        measuredCount--;
        heights.delete(key);
      }
    }
  }

  function getAverageHeight(): number {
    return measuredCount > 0 ? totalMeasuredHeight / measuredCount : fallbackItemHeight;
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
    if (minTotalHeight > 0 && cumulative >= minTotalHeight) {
      minTotalHeight = 0;
    }
    totalHeight = Math.max(cumulative, minTotalHeight);
  }

  function recalculatePositionsFrom(startIndex: number): void {
    const len = items.length;
    if (len === 0 || startIndex >= len) return;

    const fallbackHeight = getAverageHeight();
    const newPositions = positions.length === len ? [...positions] : new Array(len);

    if (positions.length !== len) {
      for (let i = 0; i < startIndex && i < positions.length; i++) {
        newPositions[i] = positions[i];
      }
    }

    let cumulative = startIndex > 0
      ? (positions[startIndex - 1] ?? 0) + getItemHeight(startIndex - 1)
      : 0;

    for (let i = startIndex; i < len; i++) {
      newPositions[i] = cumulative;
      const key = getKey(items[i], i);
      cumulative += heights.get(key) ?? fallbackHeight;
    }

    positions = newPositions;
    if (minTotalHeight > 0 && cumulative >= minTotalHeight) minTotalHeight = 0;
    totalHeight = Math.max(cumulative, minTotalHeight);
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
    totalHeight = Math.max(cumulative, minTotalHeight);
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
    if (isNavigating) return;
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
      onScroll?.();
      if (scrollContainer) {
        lastValidScrollContainer = scrollContainer;
        lastKnownScrollTop = getScrollTop();
        lastKnownVisibleStart = visibleStart;
      }
    });
  }

  function scheduleCorrectionRaf(callback: () => void): void {
    if (correctionRafId !== null) cancelAnimationFrame(correctionRafId);
    correctionRafId = requestAnimationFrame(() => {
      correctionRafId = null;
      callback();
    });
  }

  function flushHeightUpdates(): void {
    if (isNavigating) {
      heightUpdateScheduled = false;
      if (pendingHeightUpdates.size > 0) {
        scheduleHeightUpdate();
      }
      return;
    }

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

    const startFrom = pendingMinStart;
    pendingHeightUpdates.clear();
    pendingMinStart = Infinity;
    heightUpdateScheduled = false;

    if (hasChanges) {
      recalculatePositionsFrom(Math.min(startFrom, Math.max(0, visibleStart - buffer)));
      updateVisibleRange();
    }
  }

  function scheduleHeightUpdate(): void {
    if (heightUpdateScheduled) return;
    heightUpdateScheduled = true;
    heightUpdateRafId = requestAnimationFrame(() => {
      heightUpdateRafId = null;
      flushHeightUpdates();
    });
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
        const rangeStart = Math.max(0, visibleStart - buffer);
        if (rangeStart < pendingMinStart) pendingMinStart = rangeStart;
        scheduleHeightUpdate();
      }
    });
  }

  function handleUserScroll() {
    lastUserScrollTime = Date.now();
  }

  function scrollContainerAttach(element: HTMLElement) {
    resizeObserver = createResizeObserver();

    lastValidScrollContainer = scrollContainer;
    lastKnownScrollTop = getScrollTop();

    const scrollTarget = isWindowScroll ? window : scrollContainer!;
    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });
    scrollTarget.addEventListener('wheel', handleUserScroll, { passive: true });
    scrollTarget.addEventListener('touchmove', handleUserScroll, { passive: true });

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
      if (!initialScrollState || hasRestoredScroll) {
        queueMicrotask(() => updateVisibleRange());
      }

      return () => {
        if (scrollRafId !== null) cancelAnimationFrame(scrollRafId);
        if (correctionRafId !== null) cancelAnimationFrame(correctionRafId);
        if (heightUpdateRafId !== null) cancelAnimationFrame(heightUpdateRafId);
        resizeObserver?.disconnect();
        scrollTarget.removeEventListener('scroll', handleScroll);
        scrollTarget.removeEventListener('wheel', handleUserScroll);
        scrollTarget.removeEventListener('touchmove', handleUserScroll);
        window.removeEventListener('resize', handleResize);
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
      if (!initialScrollState || hasRestoredScroll) {
        queueMicrotask(() => updateVisibleRange());
      }

      return () => {
        if (scrollRafId !== null) cancelAnimationFrame(scrollRafId);
        if (correctionRafId !== null) cancelAnimationFrame(correctionRafId);
        if (heightUpdateRafId !== null) cancelAnimationFrame(heightUpdateRafId);
        resizeObserver?.disconnect();
        containerObserver.disconnect();
        scrollTarget.removeEventListener('scroll', handleScroll);
        scrollTarget.removeEventListener('wheel', handleUserScroll);
        scrollTarget.removeEventListener('touchmove', handleUserScroll);
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

  function captureAnchorItem(
    shiftCount: number
  ): { key: string; visualY: number } | null {
    if (!scrollContainer) return null;
    const containerRect = scrollContainer.getBoundingClientRect();

    for (let oldIdx = visibleStart; oldIdx < visibleEnd; oldIdx++) {
      const newIdx = oldIdx + shiftCount;
      if (newIdx >= items.length) break;
      const key = getKey(items[newIdx], newIdx);
      const el = itemRefs.get(key);
      if (!el) continue;
      const vy = el.getBoundingClientRect().top - containerRect.top;
      if (vy >= topMargin - 2) {
        return { key, visualY: vy };
      }
    }

    const newIdx = visibleStart + shiftCount;
    if (newIdx < items.length) {
      const key = getKey(items[newIdx], newIdx);
      const el = itemRefs.get(key);
      const vy = el
        ? el.getBoundingClientRect().top - containerRect.top
        : 0;
      return { key, visualY: vy };
    }

    return null;
  }

  $effect.pre(() => {
    const len = items.length;
    void items;

    if (len === 0 || prevItemCount === 0 || !scrollContainer) return;

    const firstKey = getKey(items[0], 0);
    if (firstKey === prevFirstKey || !prevFirstKey) return;

    let shiftCount = 0;
    const limit = Math.min(len, 50);
    for (let i = 1; i < limit; i++) {
      if (getKey(items[i], i) === prevFirstKey) {
        shiftCount = i;
        break;
      }
    }

    if (shiftCount > 0) {
      const isScrolling = Date.now() - lastUserScrollTime < 150;

      if (isScrolling) {
        const anchor = captureAnchorItem(shiftCount);
        const anchorKey = anchor?.key ?? '';
        const anchorVisualY = anchor?.visualY ?? 0;

        scrollContainer.style.overflowAnchor = 'none';
        recalculatePositions();
        const scrollDelta = positions[shiftCount] ?? (shiftCount * getAverageHeight());
        setScrollTop(getScrollTop() + scrollDelta);
        visibleStart = Math.max(0, visibleStart + shiftCount);
        visibleEnd = Math.min(items.length, visibleEnd + shiftCount);
        quickPrependHandled = true;

        if (anchorKey) {
          const correctQuickPrepend = (remaining: number) => {
            scheduleCorrectionRaf(() => {
              if (!scrollContainer || remaining <= 0) {
                if (scrollContainer) scrollContainer.style.overflowAnchor = '';
                return;
              }
              const el = itemRefs.get(anchorKey);
              if (el) {
                const rect = scrollContainer.getBoundingClientRect();
                const currentY = el.getBoundingClientRect().top - rect.top;
                const drift = currentY - anchorVisualY;
                if (Math.abs(drift) > 0.5) {
                  setScrollTop(getScrollTop() + drift);
                  correctQuickPrepend(remaining - 1);
                  return;
                }
              }
              scrollContainer.style.overflowAnchor = '';
            });
          };
          correctQuickPrepend(3);
        } else {
          scheduleCorrectionRaf(() => {
            if (scrollContainer) scrollContainer.style.overflowAnchor = '';
          });
        }
      } else {
        const currentScrollTop = getScrollTop();
        const anchor = captureAnchorItem(shiftCount);
        const anchorKey = anchor?.key ?? '';
        const anchorVisualY = anchor?.visualY ?? 0;

        if (anchorKey) {
          scrollContainer.style.overflowAnchor = 'none';
          isNavigating = true;

          pendingPrependAnchor = {
            scrollTop: currentScrollTop,
            anchorKey,
            anchorVisualY,
            containerTop: scrollContainer.getBoundingClientRect().top,
            shiftCount,
            oldVisibleEnd: visibleEnd,
          };
        }
      }
    }
  });

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
      heights.clear();
      totalMeasuredHeight = 0;
      measuredCount = 0;
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

    if (quickPrependHandled) {
      quickPrependHandled = false;
      renderVersion++;
      return;
    }

    if (oldCount === 0) {
      heights.clear();
      totalMeasuredHeight = 0;
      measuredCount = 0;
      recalculatePositions();
      if (!initialScrollState || hasRestoredScroll) {
        queueMicrotask(() => {
          renderVersion++;
          updateVisibleRange();
        });
      }
      return;
    }

    if (firstKey === oldFirstKey) {
      if (len > oldCount && oldLastKey && getKey(items[oldCount - 1], oldCount - 1) === oldLastKey) {
        appendPositions(oldCount);
        renderVersion++;
        queueMicrotask(() => pruneStaleHeights());
      } else {
        recalculatePositions();
        queueMicrotask(() => {
          renderVersion++;
          updateVisibleRange();
        });
      }
      return;
    }

    if (oldFirstKey && firstKey !== oldFirstKey) {
      let shiftCount = 0;
      const limit = Math.min(len, 50);
      for (let i = 1; i < limit; i++) {
        if (getKey(items[i], i) === oldFirstKey) {
          shiftCount = i;
          break;
        }
      }

      if (shiftCount > 0 && scrollContainer && pendingPrependAnchor) {
        const pp = pendingPrependAnchor;
        pendingPrependAnchor = null;

        recalculatePositions();

        visibleStart = 0;
        visibleEnd = Math.min(items.length, pp.oldVisibleEnd + shiftCount + buffer);
        renderVersion++;

        tick().then(() => {
          for (let i = 0; i < shiftCount; i++) {
            const key = getKey(items[i], i);
            const el = itemRefs.get(key);
            if (el) setHeight(key, el.getBoundingClientRect().height);
          }
          recalculatePositions();

          const newAnchorEl = itemRefs.get(pp.anchorKey);
          if (newAnchorEl && scrollContainer) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const newAnchorVisualY = newAnchorEl.getBoundingClientRect().top - containerRect.top;
            const target = Math.max(0, pp.scrollTop + newAnchorVisualY - pp.anchorVisualY);
            setScrollTop(target);
          }

          tick().then(() => correctPrependScroll(pp.anchorKey, pp.anchorVisualY, 0));
          queueMicrotask(() => pruneStaleHeights());
        });
      } else if (shiftCount > 0) {
        recalculatePositions();
        visibleStart = Math.max(0, visibleStart + shiftCount);
        visibleEnd = Math.min(items.length, visibleEnd + shiftCount);
        renderVersion++;
      } else {
        heights.clear();
        totalMeasuredHeight = 0;
        measuredCount = 0;
        recalculatePositions();
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
    if (scrollContainer && initialScrollState && !hasRestoredScroll && items.length > 0 && viewportHeight > 0) {
      const savedScrollTop = initialScrollState.scrollTop;
      const hasHeights = (initialScrollState.heights?.length ?? 0) > 0;

      if (!hasHeights && savedScrollTop != null && savedScrollTop > 0 && initialScrollState.index > 0) {
        minTotalHeight = savedScrollTop + viewportHeight;
        fallbackItemHeight = Math.max(
          DEFAULT_ITEM_HEIGHT,
          (savedScrollTop + viewportHeight) / (initialScrollState.index + 1)
        );
      }

      if (initialScrollState.heights?.length > 0) {
        for (const [key, value] of initialScrollState.heights) {
          setHeight(key, value);
        }
      }
      recalculatePositions();

      const targetIdx = findTargetIndex(initialScrollState);
      if (targetIdx >= 0 && targetIdx < items.length) {
        hasRestoredScroll = true;

        const position = positions[targetIdx] ?? 0;
        const estimatedScrollTop = position + (initialScrollState.offset ?? 0);
        const targetScrollTop = !hasHeights && savedScrollTop != null ? savedScrollTop : estimatedScrollTop;

        isNavigating = true;
        visibleStart = Math.max(0, targetIdx - buffer);
        visibleEnd = Math.min(items.length, targetIdx + buffer + 10);
        renderVersion++;

        if (!hasHeights && savedScrollTop != null) {
          const targetVisualY = initialScrollState!.visualY ?? (topMargin - (initialScrollState!.offset ?? 0));
          tick().then(() => {
            setScrollTop(Math.max(0, targetScrollTop));
            scheduleCorrectionRaf(() => correctLightweightScroll(targetIdx, targetVisualY));
          });
        } else {
          tick().then(() => {
            setScrollTop(Math.max(0, targetScrollTop));
            scheduleCorrectionRaf(() => correctScrollPosition(targetIdx, 'start', initialScrollState!.offset ?? 0, 0));
          });
        }
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

  function measureAndRecalculate(): void {
    measureRenderedItems();
    recalculatePositions();
  }

  function finishNavigation(): void {
    isNavigating = false;
    updateVisibleRange();
    if (scrollContainer) {
      lastValidScrollContainer = scrollContainer;
      lastKnownScrollTop = getScrollTop();
      lastKnownVisibleStart = visibleStart;
    }
    onScroll?.();
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

  function correctPrependScroll(anchorKey: string, targetVisualY: number, pass: number): void {
    if (!scrollContainer || pass >= 3) {
      if (scrollContainer) scrollContainer.style.overflowAnchor = '';
      finishNavigation();
      return;
    }

    measureAndRecalculate();

    tick().then(() => {
      if (!scrollContainer) {
        isNavigating = false;
        return;
      }

      const anchorEl = itemRefs.get(anchorKey);
      if (anchorEl) {
        const containerRect = scrollContainer.getBoundingClientRect();
        const currentVisualY = anchorEl.getBoundingClientRect().top - containerRect.top;
        const drift = currentVisualY - targetVisualY;
        if (Math.abs(drift) > 0.5) {
          setScrollTop(getScrollTop() + drift);
          correctPrependScroll(anchorKey, targetVisualY, pass + 1);
          return;
        }
      }

      scrollContainer.style.overflowAnchor = '';
      finishNavigation();

      const finalCorrect = (remaining: number) => {
        scheduleCorrectionRaf(() => {
          if (!scrollContainer || remaining <= 0) return;
          const el = itemRefs.get(anchorKey);
          if (el) {
            const containerRect = scrollContainer.getBoundingClientRect();
            const visualY = el.getBoundingClientRect().top - containerRect.top;
            const drift = visualY - targetVisualY;
            if (Math.abs(drift) > 0.1) {
              setScrollTop(getScrollTop() + drift);
              finalCorrect(remaining - 1);
              return;
            }
          }
        });
      };
      finalCorrect(3);
    });
  }

  function correctLightweightScroll(index: number, targetVisualY: number): void {
    const key = getKey(items[index], index);

    measureAndRecalculate();

    const el = itemRefs.get(key);
    if (el && scrollContainer) {
      const containerTop = scrollContainer.getBoundingClientRect().top;
      const drift = el.getBoundingClientRect().top - containerTop - targetVisualY;
      if (Math.abs(drift) > 1) {
        setScrollTop(Math.max(0, getScrollTop() + drift));
      }

      scheduleCorrectionRaf(() => {
        measureAndRecalculate();
        const el2 = itemRefs.get(key);
        if (el2 && scrollContainer) {
          const drift2 = el2.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top - targetVisualY;
          if (Math.abs(drift2) > 1) {
            setScrollTop(Math.max(0, getScrollTop() + drift2));
          }
        }
        finishNavigation();
      });
    } else {
      const fallbackOffset = targetVisualY - topMargin;
      const corrected = Math.max(0, computeScrollTop(index, 'start', -fallbackOffset));
      setScrollTop(corrected);
      scheduleCorrectionRaf(() => {
        measureAndRecalculate();
        const el2 = itemRefs.get(key);
        if (el2 && scrollContainer) {
          const drift2 = el2.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top - targetVisualY;
          if (Math.abs(drift2) > 1) {
            setScrollTop(Math.max(0, getScrollTop() + drift2));
          }
        }
        finishNavigation();
      });
    }
  }

  function correctScrollPosition(index: number, align: string, offset: number, pass: number): void {
    if (pass >= 3) {
      finishNavigation();
      return;
    }

    measureAndRecalculate();

    const corrected = Math.max(0, computeScrollTop(index, align, offset));
    const current = getScrollTop();

    if (Math.abs(current - corrected) > 2) {
      setScrollTop(corrected);
      scheduleCorrectionRaf(() => correctScrollPosition(index, align, offset, pass + 1));
    } else {
      finishNavigation();
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
      scheduleCorrectionRaf(() => correctScrollPosition(index, align, offset, 0));
    });
  }

  export function getScrollInfo(): { scrollTop: number; viewportHeight: number; totalHeight: number } {
    return { scrollTop: getScrollTop(), viewportHeight, totalHeight };
  }

  export function getScrollStateLightweight(): ScrollState | null {
    if (items.length === 0) return null;

    const container = scrollContainer ?? lastValidScrollContainer;
    const rawScrollTop = scrollContainer ? getScrollTop() : lastKnownScrollTop;
    const currentScrollTop = (rawScrollTop === 0 && lastKnownScrollTop > 0) ? lastKnownScrollTop : rawScrollTop;
    const index = (currentScrollTop !== rawScrollTop) ? lastKnownVisibleStart
      : (scrollContainer ? findIndexAtPosition(currentScrollTop) : lastKnownVisibleStart);
    const key = getKey(items[index], index);
    const offset = currentScrollTop - (positions[index] ?? 0);

    let visualY: number | undefined;
    if (container) {
      const el = itemRefs.get(key);
      if (el) {
        const containerRect = container.getBoundingClientRect();
        visualY = el.getBoundingClientRect().top - containerRect.top;
      }
    }

    return { index, key, offset, heights: [], scrollTop: currentScrollTop, visualY };
  }

  export function getScrollState(): ScrollState | null {
    if (items.length === 0) return null;

    const container = scrollContainer ?? lastValidScrollContainer;
    const currentScrollTop = scrollContainer ? getScrollTop() : lastKnownScrollTop;
    const index = scrollContainer ? findIndexAtPosition(currentScrollTop) : lastKnownVisibleStart;
    const key = getKey(items[index], index);
    const offset = currentScrollTop - (positions[index] ?? 0);

    const heightsArray: [string, number][] = Array.from(heights.entries());

    let visualY: number | undefined;
    if (container) {
      const el = itemRefs.get(key);
      if (el) {
        const containerRect = container.getBoundingClientRect();
        const itemRect = el.getBoundingClientRect();
        visualY = itemRect.top - containerRect.top;
      }
    }

    return { index, key, offset, heights: heightsArray, scrollTop: currentScrollTop, visualY };
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
        scheduleCorrectionRaf(() => correctScrollPosition(targetIdx, 'start', state.offset ?? 0, 0));
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
