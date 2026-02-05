<script lang="ts">
  import { tick } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { VisibleRange, ScrollToIndexOptions, ScrollState } from './types';
  import { FenwickTree } from './fenwick';
  import { HeightManager } from './height-manager';
  import { generateColumnId, registerColumn, unregisterColumn, observeElement, unobserveElement } from './shared-resize-observer';
  import { computeScrollTopPosition, findTargetIndex, getScrollTopFor, setScrollTopFor } from './scroll-helpers';
  import {
    PREPEND_SEARCH_LIMIT,
    SCROLL_VELOCITY_THRESHOLD_MS,
    CORRECTION_MAX_PASSES,
    DRIFT_THRESHOLD_COARSE,
    DRIFT_THRESHOLD_FINE,
    DRIFT_THRESHOLD_POSITION,
    DRIFT_THRESHOLD_SCROLL,
    FALLBACK_RENDER_COUNT,
    SCROLLTO_EXTRA_BUFFER,
    HEIGHT_CHANGE_THRESHOLD,
    HEIGHT_APPLY_THRESHOLD,
    ANCHOR_TOLERANCE,
    DEFAULT_ITEM_HEIGHT,
  } from './constants';

  let fallbackItemHeight = DEFAULT_ITEM_HEIGHT;

  interface Props<T> {
    items: T[];
    getKey: (item: T, index: number) => string;
    scrollContainer: HTMLElement | null | undefined;
    buffer?: number;
    topMargin?: number;
    initialScrollState?: ScrollState | null;
    refreshToTop?: boolean;
    isOffscreen?: boolean;
    estimateHeight?: (item: T) => number;
    recordHeight?: (item: T, height: number) => void;
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
    refreshToTop = false,
    isOffscreen = false,
    estimateHeight,
    recordHeight,
    onRangeChange,
    onScroll,
    children
  }: Props<any> = $props();

  let visibleStart = $state(initialScrollState ? Math.max(0, (initialScrollState.index ?? 0) - buffer) : 0);
  let visibleEnd = $state(initialScrollState ? Math.min(
    initialScrollState.index != null ? initialScrollState.index + buffer + SCROLLTO_EXTRA_BUFFER : 0,
    999999
  ) : 0);
  let viewportHeight = $state(0);
  let tree = new FenwickTree();
  let hm = new HeightManager();

  let itemRefs = new Map<string, HTMLElement>();
  let isNavigating = false;
  let hasRestoredScroll = $state(false);
  let minTotalHeight = initialScrollState?.scrollTop != null
    ? initialScrollState.scrollTop + 1000
    : 0;
  let _cachedScrollTop = -1;
  let correctionRafId: number | null = null;
  let heightUpdateRafId: number | null = null;
  const columnId = generateColumnId();
  let prevItemCount = 0;
  let prevFirstKey = '';
  let prevLastKey = '';
  let lastValidScrollContainer: HTMLElement | null = null;
  let lastKnownScrollTop = 0;
  let lastKnownVisibleStart = 0;
  let lastUserScrollTime = 0;
  let _lastScrollTop = 0;
  let _lastScrollTime = 0;
  let scrollVelocity = 0; // px/ms, positive = scrolling down
  let bufferBefore = buffer;
  let bufferAfter = buffer;

  const MIN_DIRECTIONAL_BUFFER = 3;

  function updateScrollVelocity(currentScrollTop: number): void {
    const now = performance.now();
    const dt = now - _lastScrollTime;
    if (dt > 0 && dt < 500) {
      const rawVelocity = (currentScrollTop - _lastScrollTop) / dt;
      scrollVelocity = scrollVelocity * 0.7 + rawVelocity * 0.3;
    }
    _lastScrollTop = currentScrollTop;
    _lastScrollTime = now;
  }

  function updateDirectionalBuffers(): boolean {
    const totalBuffer = buffer * 2;
    const absVelocity = Math.abs(scrollVelocity);

    let newBefore: number;
    let newAfter: number;

    if (absVelocity < 0.5) {
      newBefore = buffer;
      newAfter = buffer;
    } else if (scrollVelocity > 0) {
      // Scrolling down - more buffer after
      newAfter = Math.min(totalBuffer - MIN_DIRECTIONAL_BUFFER, Math.round(totalBuffer * 0.7));
      newBefore = Math.max(MIN_DIRECTIONAL_BUFFER, totalBuffer - newAfter);
    } else {
      // Scrolling up - more buffer before
      newBefore = Math.min(totalBuffer - MIN_DIRECTIONAL_BUFFER, Math.round(totalBuffer * 0.7));
      newAfter = Math.max(MIN_DIRECTIONAL_BUFFER, totalBuffer - newBefore);
    }

    const changed = newBefore !== bufferBefore || newAfter !== bufferAfter;
    bufferBefore = newBefore;
    bufferAfter = newAfter;
    return changed;
  }

  let keys: string[] = [];
  let _keysItemsRef: any[] | null = null;

  function rebuildKeys(): void {
    const len = items.length;
    if (keys.length < len) keys = new Array(len);
    for (let i = 0; i < len; i++) {
      keys[i] = getKey(items[i], i);
    }
    if (keys.length > len) keys.length = len;
    _keysItemsRef = items;
  }

  function ensureKeys(): void {
    if (_keysItemsRef !== items || keys.length !== items.length) {
      rebuildKeys();
    }
  }

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
    if (items.length === 0) return { start: 0, end: 0 };
    if (!isVirtualizationEnabled) return { start: 0, end: Math.min(items.length, FALLBACK_RENDER_COUNT) };
    return {
      start: Math.max(0, visibleStart - bufferBefore),
      end: Math.min(items.length, visibleEnd + bufferAfter)
    };
  });

  let visibleItems = $derived(items.slice(visibleRange.start, visibleRange.end));

  let effectiveTotalHeight = $state(0);
  let itemPositions: number[] = $state([]);

  function invalidateLayout(): void {
    effectiveTotalHeight = Math.max(tree.total, minTotalHeight);
    const start = visibleRange.start;
    const end = visibleRange.end;
    const count = end - start;
    const pos = new Array(count);
    for (let i = 0; i < count; i++) {
      pos[i] = Math.round(tree.prefixSum(start + i));
    }
    itemPositions = pos;
  }

  function pruneStaleHeights(): void {
    if (!hm.shouldPrune(items.length)) return;
    const keyToIndex = getKeyToIndex();
    hm.prune(keyToIndex);
  }

  function getAverageHeight(): number {
    return hm.measuredCount > 0 ? hm.average : fallbackItemHeight;
  }

  function getItemHeight(index: number): number {
    if (index < 0 || index >= items.length) return getAverageHeight();
    ensureKeys();
    return hm.get(keys[index]) ?? estimateHeight?.(items[index]) ?? getAverageHeight();
  }

  function applyPendingHeights(): void {
    if (hm.pending.size === 0) return;
    hm.applyPending();
    if (heightUpdateRafId !== null) {
      cancelAnimationFrame(heightUpdateRafId);
      heightUpdateRafId = null;
    }
  }

  function recalculatePositions(): void {
    const len = items.length;
    if (len === 0) {
      tree.clear();
      return;
    }

    applyPendingHeights();
    ensureKeys();
    const avg = getAverageHeight();
    tree.buildWithCallback(len, (i) => {
      return hm.get(keys[i]) ?? estimateHeight?.(items[i]) ?? avg;
    });
  }

  function recalculatePositionsFrom(startIndex: number): void {
    const len = items.length;
    if (len === 0 || startIndex >= len) return;

    if (tree.length !== len) {
      recalculatePositions();
      return;
    }

    ensureKeys();
    const avg = getAverageHeight();
    for (let i = startIndex; i < len; i++) {
      const h = hm.get(keys[i]) ?? estimateHeight?.(items[i]) ?? avg;
      tree.set(i, h);
    }
  }

  function appendPositions(startIndex: number): void {
    const len = items.length;
    if (len === 0 || startIndex >= len) return;
    ensureKeys();
    const avg = getAverageHeight();
    tree.extendWithCallback(len - startIndex, (i) => {
      const idx = startIndex + i;
      return hm.get(keys[idx]) ?? estimateHeight?.(items[idx]) ?? avg;
    });
  }

  function getScrollTop(): number {
    if (_cachedScrollTop >= 0) return _cachedScrollTop;
    return getScrollTopFor(scrollContainer, isWindowScroll);
  }

  function setScrollTop(value: number): void {
    setScrollTopFor(scrollContainer, isWindowScroll, value);
  }

  function getViewportHeight(): number {
    if (isWindowScroll) return window.innerHeight;
    return scrollContainer?.clientHeight ?? 0;
  }

  function getContainerTop(): number {
    if (isWindowScroll) return 0;
    return scrollContainer?.getBoundingClientRect().top ?? 0;
  }

  function findEndIndex(scrollBottom: number): number {
    return Math.min(items.length, tree.findIndex(scrollBottom) + 1);
  }

  function updateVisibleRange(): void {
    if (isNavigating || !scrollContainer || items.length === 0) return;

    const scrollTop = getScrollTop();

    const height = getViewportHeight();
    if (height !== viewportHeight) viewportHeight = height;

    const usableHeight = height - topMargin;
    const newStart = tree.findIndex(scrollTop);
    const newEnd = findEndIndex(scrollTop + usableHeight);

    if (newStart !== visibleStart || newEnd !== visibleEnd) {
      const oldRangeStart = Math.max(0, visibleStart - bufferBefore);
      const newRangeStart = Math.max(0, newStart - bufferBefore);

      if (newStart > visibleStart) {
        if (newRangeStart > oldRangeStart) {
          measureTransitioningItems(oldRangeStart, newRangeStart);
        }
      }

      visibleStart = newStart;
      visibleEnd = newEnd;
      invalidateLayout();
    }
  }

  let scrollRafId: number | null = null;

  let pendingOffscreenFlush = false;

  function handleScroll(): void {
    if (isNavigating || scrollRafId !== null) return;

    if (isOffscreen) {
      pendingOffscreenFlush = true;
      return;
    }

    scrollRafId = requestAnimationFrame(() => {
      scrollRafId = null;
      _cachedScrollTop = getScrollTopFor(scrollContainer, isWindowScroll);
      updateScrollVelocity(_cachedScrollTop);
      const buffersChanged = updateDirectionalBuffers();
      updateVisibleRange();
      if (buffersChanged) {
        invalidateLayout();
      }
      onScroll?.();
      if (scrollContainer) {
        lastValidScrollContainer = scrollContainer;
        lastKnownScrollTop = _cachedScrollTop;
        lastKnownVisibleStart = visibleStart;
      }
      _cachedScrollTop = -1;
    });
  }

  $effect(() => {
    if (!isOffscreen && pendingOffscreenFlush) {
      pendingOffscreenFlush = false;
      _cachedScrollTop = getScrollTopFor(scrollContainer, isWindowScroll);
      updateVisibleRange();
      onScroll?.();
      if (scrollContainer) {
        lastValidScrollContainer = scrollContainer;
        lastKnownScrollTop = _cachedScrollTop;
        lastKnownVisibleStart = visibleStart;
      }
      _cachedScrollTop = -1;
    }
  });

  function scheduleCorrectionRaf(callback: () => void): void {
    if (correctionRafId !== null) cancelAnimationFrame(correctionRafId);
    correctionRafId = requestAnimationFrame(() => {
      correctionRafId = null;
      callback();
    });
  }

  let _keyToIndexCache: Map<string, number> | null = null;
  let _keyToIndexLen = -1;
  let _keyToIndexFirstKey = '';
  let _keyToIndexLastKey = '';

  function getKeyToIndex(): Map<string, number> {
    const len = items.length;
    if (len === 0) return _keyToIndexCache ?? new Map();
    if (_keyToIndexCache && _keyToIndexLen === len
        && _keyToIndexFirstKey === prevFirstKey && _keyToIndexLastKey === prevLastKey) {
      return _keyToIndexCache;
    }
    ensureKeys();
    const map = new Map<string, number>();
    for (let i = 0; i < len; i++) map.set(keys[i], i);
    _keyToIndexCache = map;
    _keyToIndexLen = len;
    _keyToIndexFirstKey = prevFirstKey;
    _keyToIndexLastKey = prevLastKey;
    return map;
  }

  function measureTransitioningItems(fromIdx: number, toIdx: number): void {
    ensureKeys();
    const oldRangeEnd = visibleEnd + buffer;
    for (let i = fromIdx; i < Math.min(toIdx, oldRangeEnd); i++) {
      if (i >= items.length) break;
      const key = keys[i];
      if (hm.has(key) && i < tree.length) {
        const cached = hm.get(key)!;
        if (Math.abs(tree.get(i) - cached) < HEIGHT_APPLY_THRESHOLD) continue;
        tree.set(i, cached);
        continue;
      }
      const el = itemRefs.get(key);
      if (!el) continue;
      const h = el.getBoundingClientRect().height;
      if (h <= 0) continue;
      hm.set(key, h);
      if (i < tree.length) tree.set(i, h);
    }
  }

  function flushHeightUpdates(): void {
    if (isNavigating) {
      if (hm.pending.size > 0) {
        scheduleHeightUpdate();
      }
      return;
    }

    if (hm.pending.size === 0) {
      return;
    }

    let hasChanges = false;
    let aboveDelta = 0;

    const rangeStart = Math.max(0, visibleStart - buffer);

    const keyToIndex = getKeyToIndex();
    for (const [key, newHeight] of hm.pending) {
      const oldHeight = hm.get(key);
      if (oldHeight !== undefined && Math.abs(oldHeight - newHeight) < HEIGHT_APPLY_THRESHOLD) continue;
      hm.set(key, newHeight);

      const idx = keyToIndex.get(key);
      if (idx === undefined || idx >= tree.length) continue;
      if (idx < visibleStart) {
        aboveDelta += newHeight - tree.get(idx);
      }
      tree.set(idx, newHeight);
      hasChanges = true;
    }

    hm.pending.clear();
    if (heightUpdateRafId !== null) {
      cancelAnimationFrame(heightUpdateRafId);
      heightUpdateRafId = null;
    }

    if (hasChanges) {
      if (aboveDelta !== 0 && !isNavigating) {
        const currentSt = getScrollTop();
        if (currentSt > 0) {
          setScrollTop(currentSt + aboveDelta);
        }
      }
      recalculatePositionsFrom(rangeStart);
      invalidateLayout();
      updateVisibleRange();
      onScroll?.();
    }
  }

  function scheduleHeightUpdate(): void {
    if (heightUpdateRafId !== null) return;
    heightUpdateRafId = requestAnimationFrame(() => {
      heightUpdateRafId = null;
      flushHeightUpdates();
    });
  }

  function handleResizeEntries(entries: ResizeObserverEntry[]): void {
    for (const entry of entries) {
      const el = entry.target as HTMLElement;
      const key = el.dataset.virtualKey;
      if (!key) continue;

      const newHeight = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
      if (newHeight <= 0) continue;

      const oldHeight = hm.get(key);
      if (oldHeight !== undefined && Math.abs(oldHeight - newHeight) < HEIGHT_CHANGE_THRESHOLD) {
        continue;
      }

      hm.pending.set(key, newHeight);

      if (recordHeight) {
        const keyToIndex = getKeyToIndex();
        const idx = keyToIndex.get(key);
        if (idx !== undefined) {
          recordHeight(items[idx], newHeight);
        }
      }
    }

    if (hm.pending.size > 0) {
      scheduleHeightUpdate();
    }
  }

  function handleUserScroll() {
    lastUserScrollTime = Date.now();
  }

  function scrollContainerAttach(element: HTMLElement) {
    registerColumn(columnId, handleResizeEntries);

    lastValidScrollContainer = scrollContainer ?? null;
    lastKnownScrollTop = getScrollTop();

    const scrollTarget = isWindowScroll ? window : scrollContainer!;
    scrollTarget.addEventListener('scroll', handleScroll, { passive: true });
    scrollTarget.addEventListener('wheel', handleUserScroll, { passive: true });
    scrollTarget.addEventListener('touchmove', handleUserScroll, { passive: true });

    let extraCleanup: (() => void) | undefined;

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
      extraCleanup = () => window.removeEventListener('resize', handleResize);
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
      extraCleanup = () => containerObserver.disconnect();
    }

    if (!initialScrollState || hasRestoredScroll) {
      queueMicrotask(() => updateVisibleRange());
    } else if (initialScrollState.scrollTop != null) {
      setScrollTop(Math.max(0, initialScrollState.scrollTop));
    }

    return () => {
      if (scrollRafId !== null) cancelAnimationFrame(scrollRafId);
      if (correctionRafId !== null) cancelAnimationFrame(correctionRafId);
      if (heightUpdateRafId !== null) cancelAnimationFrame(heightUpdateRafId);
      unregisterColumn(columnId);
      scrollTarget.removeEventListener('scroll', handleScroll);
      scrollTarget.removeEventListener('wheel', handleUserScroll);
      scrollTarget.removeEventListener('touchmove', handleUserScroll);
      extraCleanup?.();
    };
  }

  function itemAttach(key: string) {
    return (element: HTMLElement) => {
      element.dataset.virtualKey = key;
      observeElement(columnId, element);
      itemRefs.set(key, element);

      return () => {
        unobserveElement(element);
        itemRefs.delete(key);
      };
    };
  }

  function captureAnchorItem(
    shiftCount: number
  ): { key: string; visualY: number } | null {
    if (!scrollContainer) return null;
    ensureKeys();
    const cTop = getContainerTop();

    for (let oldIdx = visibleStart; oldIdx < visibleEnd; oldIdx++) {
      const newIdx = oldIdx + shiftCount;
      if (newIdx >= items.length) break;
      const key = keys[newIdx];
      const el = itemRefs.get(key);
      if (!el) continue;
      const vy = el.getBoundingClientRect().top - cTop;
      if (vy >= topMargin - ANCHOR_TOLERANCE) {
        return { key, visualY: vy };
      }
    }

    const newIdx = visibleStart + shiftCount;
    if (newIdx < items.length) {
      const key = keys[newIdx];
      const el = itemRefs.get(key);
      const vy = el
        ? el.getBoundingClientRect().top - cTop
        : 0;
      return { key, visualY: vy };
    }

    return null;
  }

  function detectPrependShift(firstKey: string, prevKey: string): number {
    if (!prevKey || firstKey === prevKey) return 0;
    ensureKeys();
    const limit = Math.min(items.length, PREPEND_SEARCH_LIMIT);
    for (let i = 1; i < limit; i++) {
      if (keys[i] === prevKey) return i;
    }
    return 0;
  }

  $effect.pre(() => {
    const len = items.length;
    void items;

    if (len === 0) return;

    ensureKeys();

    const firstKey = keys[0];
    const needsRebuild = tree.length === 0 ||
      (prevItemCount > 0 && firstKey !== prevFirstKey && detectPrependShift(firstKey, prevFirstKey) === 0);

    if (needsRebuild && len > 0) {
      const avg = getAverageHeight();
      tree.buildWithCallback(len, (i) => {
        return hm.get(keys[i]) ?? estimateHeight?.(items[i]) ?? avg;
      });
      invalidateLayout();
    }

    if (prevItemCount === 0 || !scrollContainer) return;

    const shiftCount = detectPrependShift(firstKey, prevFirstKey);

    if (shiftCount > 0) {
      if (refreshToTop && getScrollTop() <= topMargin) {
        recalculatePositions();
        visibleEnd = Math.min(items.length, visibleEnd + shiftCount);
        invalidateLayout();
        quickPrependHandled = true;
      } else if (Date.now() - lastUserScrollTime < SCROLL_VELOCITY_THRESHOLD_MS) {
        const anchor = captureAnchorItem(shiftCount);
        const anchorKey = anchor?.key ?? '';
        const anchorVisualY = anchor?.visualY ?? 0;

        recalculatePositions();
        const scrollDelta = tree.length > 0 ? tree.prefixSum(shiftCount) : (shiftCount * getAverageHeight());
        visibleStart = Math.max(0, visibleStart + shiftCount);
        visibleEnd = Math.min(items.length, visibleEnd + shiftCount);
        invalidateLayout();
        setScrollTop(getScrollTop() + scrollDelta);
        quickPrependHandled = true;

        if (anchorKey) {
          const correctQuickPrepend = (remaining: number) => {
            scheduleCorrectionRaf(() => {
              if (!scrollContainer || remaining <= 0) {
                return;
              }
              const el = itemRefs.get(anchorKey);
              if (el) {
                const cTop = getContainerTop();
                const currentY = el.getBoundingClientRect().top - cTop;
                const drift = currentY - anchorVisualY;
                if (Math.abs(drift) > DRIFT_THRESHOLD_COARSE) {
                  setScrollTop(getScrollTop() + drift);
                  correctQuickPrepend(remaining - 1);
                  return;
                }
              }
            });
          };
          correctQuickPrepend(CORRECTION_MAX_PASSES);
        }
      } else {
        const currentScrollTop = getScrollTop();
        const anchor = captureAnchorItem(shiftCount);
        const anchorKey = anchor?.key ?? '';
        const anchorVisualY = anchor?.visualY ?? 0;

        if (anchorKey) {
          isNavigating = true;

          pendingPrependAnchor = {
            scrollTop: currentScrollTop,
            anchorKey,
            anchorVisualY,
            containerTop: getContainerTop(),
            shiftCount,
            oldVisibleEnd: visibleEnd,
          };
        }
      }
    }
  });

  function handleItemsClear(): void {
    tree.clear();
    visibleStart = 0;
    visibleEnd = 0;
    prevItemCount = 0;
    prevFirstKey = '';
    prevLastKey = '';
    minTotalHeight = 0;
    hm.clear();
    keys = [];
    _keysItemsRef = null;
    _keyToIndexCache = null;
    invalidateLayout();
  }

  function handleItemsInitial(): void {
    if (tree.length !== items.length) {
      hm.clear();
      const avg = getAverageHeight();
      tree.buildWithCallback(items.length, () => avg);
      invalidateLayout();
    }
    if (!initialScrollState || hasRestoredScroll) {
      queueMicrotask(() => {
        updateVisibleRange();
      });
    }
  }

  function handleItemsAppend(oldCount: number): void {
    appendPositions(oldCount);
    invalidateLayout();
    queueMicrotask(() => pruneStaleHeights());
  }

  function handleItemsGenericChange(): void {
    recalculatePositions();
    invalidateLayout();
    queueMicrotask(() => {
      updateVisibleRange();
    });
  }

  function handlePrependWithAnchor(shiftCount: number): void {
    const pp = pendingPrependAnchor!;
    pendingPrependAnchor = null;

    recalculatePositions();
    visibleStart = 0;
    visibleEnd = Math.min(items.length, pp.oldVisibleEnd + shiftCount + buffer);
    invalidateLayout();

    tick().then(async () => {
      ensureKeys();
      for (let i = 0; i < shiftCount; i++) {
        const key = keys[i];
        const el = itemRefs.get(key);
        if (el) hm.set(key, el.getBoundingClientRect().height);
      }
      recalculatePositions();
      invalidateLayout();
      await tick();

      const newAnchorEl = itemRefs.get(pp.anchorKey);
      if (newAnchorEl && scrollContainer) {
        const cTop = getContainerTop();
        const newAnchorVisualY = newAnchorEl.getBoundingClientRect().top - cTop;
        const target = Math.max(0, pp.scrollTop + newAnchorVisualY - pp.anchorVisualY);
        setScrollTop(target);
      }

      tick().then(() => correctPrependScroll(pp.anchorKey, pp.anchorVisualY, 0));
      queueMicrotask(() => pruneStaleHeights());
    });
  }

  function handlePrependSimple(shiftCount: number): void {
    recalculatePositions();
    visibleStart = Math.max(0, visibleStart + shiftCount);
    visibleEnd = Math.min(items.length, visibleEnd + shiftCount);
    invalidateLayout();
  }

  function handlePrependFullReset(): void {
    hm.clear();
    handleItemsGenericChange();
  }

  $effect(() => {
    const len = items.length;
    void items;

    if (len === 0) { handleItemsClear(); return; }

    ensureKeys();
    const firstKey = keys[0];
    const lastKey = keys[len - 1];
    const oldCount = prevItemCount;
    const oldFirstKey = prevFirstKey;
    const oldLastKey = prevLastKey;

    prevItemCount = len;
    prevFirstKey = firstKey;
    prevLastKey = lastKey;

    if (quickPrependHandled) { quickPrependHandled = false; invalidateLayout(); return; }

    if (oldCount === 0) { handleItemsInitial(); return; }

    if (firstKey === oldFirstKey) {
      if (len > oldCount && oldLastKey && keys[oldCount - 1] === oldLastKey) {
        handleItemsAppend(oldCount);
      } else if (len === oldCount && lastKey === oldLastKey) {
        return;
      } else {
        handleItemsGenericChange();
      }
      return;
    }

    if (oldFirstKey && firstKey !== oldFirstKey) {
      const shiftCount = detectPrependShift(firstKey, oldFirstKey);
      if (shiftCount > 0 && scrollContainer && pendingPrependAnchor) {
        handlePrependWithAnchor(shiftCount);
      } else if (shiftCount > 0) {
        handlePrependSimple(shiftCount);
      } else {
        handlePrependFullReset();
      }
      return;
    }

    handleItemsGenericChange();
  });

  $effect(() => {
    const range = visibleRange;
    if (!isNavigating) {
      onRangeChange?.(range);
    }
  });

  $effect(() => {
    if (scrollContainer && initialScrollState && !hasRestoredScroll && items.length > 0 && viewportHeight > 0) {
      const targetIdx = findTargetIndex(initialScrollState, items, getKey);
      if (targetIdx < 0 || targetIdx >= items.length) return;

      hasRestoredScroll = true;
      const hasHeights = (initialScrollState.heights?.length ?? 0) > 0;
      const savedScrollTop = initialScrollState.scrollTop;

      if (!hasHeights && savedScrollTop != null && savedScrollTop > 0 && initialScrollState.index > 0) {
        minTotalHeight = savedScrollTop + viewportHeight;
      }

      if (initialScrollState.heights?.length > 0) {
        for (const [key, value] of initialScrollState.heights) {
          hm.set(key, value);
        }
      }

      if (hasHeights || tree.length !== items.length) {
        recalculatePositions();
      }

      applyScrollRestore(initialScrollState, !hasHeights && savedScrollTop != null);
    }
  });

  function measureRenderedItems(): void {
    ensureKeys();
    const start = Math.max(0, visibleStart - buffer);
    const end = Math.min(items.length, visibleEnd + buffer);
    for (let i = start; i < end; i++) {
      const key = keys[i];
      const existing = hm.get(key);
      if (existing !== undefined && i < tree.length
          && Math.abs(tree.get(i) - existing) < HEIGHT_APPLY_THRESHOLD) {
        continue;
      }
      const el = itemRefs.get(key);
      if (!el) continue;
      const h = el.getBoundingClientRect().height;
      if (h <= 0) continue;
      if (existing === undefined || Math.abs(existing - h) >= HEIGHT_APPLY_THRESHOLD) {
        hm.set(key, h);
      }
    }
  }

  function measureAndRecalculate(): void {
    measureRenderedItems();
    recalculatePositions();
    if (minTotalHeight > tree.total) {
      minTotalHeight = tree.total;
    }
    invalidateLayout();
  }

  function measureAndRecalculateIncremental(): void {
    if (hm.pending.size > 0) {
      const keyToIndex = getKeyToIndex();
      for (const [key, newHeight] of hm.pending) {
        const oldHeight = hm.get(key);
        if (oldHeight !== undefined && Math.abs(oldHeight - newHeight) < HEIGHT_APPLY_THRESHOLD) continue;
        hm.set(key, newHeight);
        const idx = keyToIndex.get(key);
        if (idx !== undefined && idx < tree.length) {
          tree.set(idx, newHeight);
        }
      }
      hm.pending.clear();
      if (heightUpdateRafId !== null) {
        cancelAnimationFrame(heightUpdateRafId);
        heightUpdateRafId = null;
      }
    }

    ensureKeys();
    const start = Math.max(0, visibleStart - buffer);
    const end = Math.min(items.length, visibleEnd + buffer);
    for (let i = start; i < end; i++) {
      const key = keys[i];
      const existing = hm.get(key);
      if (existing !== undefined && i < tree.length
          && Math.abs(tree.get(i) - existing) < HEIGHT_APPLY_THRESHOLD) {
        continue;
      }
      const el = itemRefs.get(key);
      if (!el) continue;
      const h = el.getBoundingClientRect().height;
      if (h <= 0) continue;
      if (existing === undefined || Math.abs(existing - h) >= HEIGHT_APPLY_THRESHOLD) {
        hm.set(key, h);
        if (i < tree.length) {
          tree.set(i, h);
        }
      }
    }

    if (minTotalHeight > tree.total) {
      minTotalHeight = tree.total;
    }
    invalidateLayout();
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
    return computeScrollTopPosition(tree, index, getItemHeight(index), viewportHeight, topMargin, align, offset);
  }

  function correctPrependScroll(anchorKey: string, targetVisualY: number, pass: number): void {
    if (!scrollContainer || pass >= CORRECTION_MAX_PASSES) {
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
        const cTop = getContainerTop();
        const currentVisualY = anchorEl.getBoundingClientRect().top - cTop;
        const drift = currentVisualY - targetVisualY;
        if (Math.abs(drift) > DRIFT_THRESHOLD_COARSE) {
          setScrollTop(getScrollTop() + drift);
          correctPrependScroll(anchorKey, targetVisualY, pass + 1);
          return;
        }
      }

      finishNavigation();

      const finalCorrect = (remaining: number) => {
        scheduleCorrectionRaf(() => {
          if (!scrollContainer || remaining <= 0) return;
          const el = itemRefs.get(anchorKey);
          if (el) {
            const cTop = getContainerTop();
            const visualY = el.getBoundingClientRect().top - cTop;
            const drift = visualY - targetVisualY;
            if (Math.abs(drift) > DRIFT_THRESHOLD_FINE) {
              setScrollTop(getScrollTop() + drift);
              finalCorrect(remaining - 1);
              return;
            }
          }
        });
      };
      finalCorrect(CORRECTION_MAX_PASSES);
    });
  }

  function correctAndFinish(key: string, targetVisualY: number): void {
    measureAndRecalculateIncremental();
    const el = itemRefs.get(key);
    if (el && scrollContainer) {
      const containerTop = getContainerTop();
      const drift = el.getBoundingClientRect().top - containerTop - targetVisualY;
      if (Math.abs(drift) > DRIFT_THRESHOLD_POSITION) {
        setScrollTop(Math.max(0, getScrollTop() + drift));
      }
    }
    finishNavigation();
  }

  function correctLightweightScroll(index: number, targetVisualY: number): void {
    ensureKeys();
    const key = keys[index];

    measureAndRecalculateIncremental();

    const el = itemRefs.get(key);
    if (el && scrollContainer) {
      const containerTop = getContainerTop();
      const drift = el.getBoundingClientRect().top - containerTop - targetVisualY;
      if (Math.abs(drift) > DRIFT_THRESHOLD_POSITION) {
        setScrollTop(Math.max(0, getScrollTop() + drift));
      }

      scheduleCorrectionRaf(() => correctAndFinish(key, targetVisualY));
    } else {
      const fallbackOffset = targetVisualY - topMargin;
      const corrected = Math.max(0, computeScrollTop(index, 'start', -fallbackOffset));
      setScrollTop(corrected);
      scheduleCorrectionRaf(() => correctAndFinish(key, targetVisualY));
    }
  }

  function correctScrollPosition(index: number, align: string, offset: number, pass: number): void {
    if (pass >= CORRECTION_MAX_PASSES) {
      finishNavigation();
      return;
    }

    measureAndRecalculate();

    const corrected = Math.max(0, computeScrollTop(index, align, offset));
    const current = getScrollTop();

    if (Math.abs(current - corrected) > DRIFT_THRESHOLD_SCROLL) {
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
    visibleEnd = Math.min(items.length, index + buffer + SCROLLTO_EXTRA_BUFFER);
    invalidateLayout();

    tick().then(() => {
      setScrollTop(Math.max(0, targetScrollTop));
      scheduleCorrectionRaf(() => correctScrollPosition(index, align, offset, 0));
    });
  }

  export function getScrollInfo(): { scrollTop: number; viewportHeight: number; totalHeight: number; distanceFromBottom: number } {
    const st = getScrollTop();
    if (scrollContainer) {
      const sh = isWindowScroll ? document.documentElement.scrollHeight : scrollContainer.scrollHeight;
      const ch = isWindowScroll ? window.innerHeight : scrollContainer.clientHeight;
      return {
        scrollTop: st,
        viewportHeight: ch,
        totalHeight: sh,
        distanceFromBottom: sh - st - ch,
      };
    }
    return {
      scrollTop: st,
      viewportHeight,
      totalHeight: effectiveTotalHeight,
      distanceFromBottom: effectiveTotalHeight - st - viewportHeight,
    };
  }

  export function getScrollInfoFast(): { distanceFromBottom: number } {
    const st = getScrollTop();
    return { distanceFromBottom: effectiveTotalHeight - st - viewportHeight };
  }

  export function getScrollStateLightweight(): ScrollState | null {
    if (items.length === 0) return null;

    ensureKeys();
    const container = scrollContainer ?? lastValidScrollContainer;
    const rawScrollTop = scrollContainer ? getScrollTop() : lastKnownScrollTop;
    const currentScrollTop = (rawScrollTop === 0 && lastKnownScrollTop > 0) ? lastKnownScrollTop : rawScrollTop;
    const index = (currentScrollTop !== rawScrollTop) ? lastKnownVisibleStart
      : (scrollContainer ? tree.findIndex(currentScrollTop) : lastKnownVisibleStart);
    const key = keys[index];
    const offset = currentScrollTop - tree.prefixSum(index);

    let visualY: number | undefined;
    if (container) {
      const el = itemRefs.get(key);
      if (el) {
        const containerTop = getContainerTop();
        visualY = el.getBoundingClientRect().top - containerTop;
      }
    }

    return { index, key, offset, heights: [], scrollTop: currentScrollTop, visualY };
  }

  export function getScrollState(): ScrollState | null {
    if (items.length === 0) return null;

    ensureKeys();
    const container = scrollContainer ?? lastValidScrollContainer;
    const currentScrollTop = scrollContainer ? getScrollTop() : lastKnownScrollTop;
    const index = scrollContainer ? tree.findIndex(currentScrollTop) : lastKnownVisibleStart;
    const key = keys[index];
    const offset = currentScrollTop - tree.prefixSum(index);

    const heightsArray: [string, number][] = Array.from(hm.entries());

    let visualY: number | undefined;
    if (container) {
      const el = itemRefs.get(key);
      if (el) {
        const containerTop = getContainerTop();
        visualY = el.getBoundingClientRect().top - containerTop;
      }
    }

    return { index, key, offset, heights: heightsArray, scrollTop: currentScrollTop, visualY };
  }

  function applyScrollRestore(state: ScrollState, lightweight: boolean): void {
    const targetIdx = findTargetIndex(state, items, getKey);
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const offset = state.offset ?? 0;

    isNavigating = true;
    visibleStart = Math.max(0, targetIdx - buffer);
    visibleEnd = Math.min(items.length, targetIdx + buffer + SCROLLTO_EXTRA_BUFFER);
    invalidateLayout();

    if (lightweight && state.scrollTop != null) {
      const targetScrollTop = state.scrollTop;
      const targetVisualY = state.visualY ?? (topMargin - offset);
      setScrollTop(Math.max(0, targetScrollTop));
      tick().then(() => {
        scheduleCorrectionRaf(() => correctLightweightScroll(targetIdx, targetVisualY));
      });
    } else {
      const position = tree.prefixSum(targetIdx);
      const targetScrollTop = position + offset;
      setScrollTop(Math.max(0, targetScrollTop));
      tick().then(() => {
        scheduleCorrectionRaf(() => correctScrollPosition(targetIdx, 'start', offset, 0));
      });
    }
  }

  export function restoreScrollState(state: ScrollState): void {
    if (!state || !scrollContainer) return;
    hasRestoredScroll = true;

    hm.clear();

    if (state.heights?.length > 0) {
      for (const [key, value] of state.heights) {
        hm.set(key, value);
      }
    }
    recalculatePositions();

    applyScrollRestore(state, false);
  }

  export function getPositionForIndex(index: number): number {
    if (index < 0 || index >= items.length) return 0;
    return tree.prefixSum(index);
  }



  export function getTreeDiagnostics(): {
    total: number;
    length: number;
    measuredCount: number;
    averageHeight: number;
  } {
    return {
      total: tree.total,
      length: tree.length,
      measuredCount: hm.measuredCount,
      averageHeight: getAverageHeight(),
    };
  }

  export function prepareForIndex(index: number): void {
    if (index < 0 || index >= items.length || !scrollContainer) return;
    visibleStart = Math.max(0, index - buffer);
    visibleEnd = Math.min(items.length, index + buffer + SCROLLTO_EXTRA_BUFFER);
    viewportHeight = getViewportHeight();
    invalidateLayout();
  }

  export function getItemElement(index: number): HTMLElement | null {
    if (index < 0 || index >= items.length) return null;
    ensureKeys();
    return itemRefs.get(keys[index]) ?? null;
  }
</script>

{#if scrollContainer}
  <div class="virtual-list"
    class:virtual-list--restoring={initialScrollState && !hasRestoredScroll}
    style:height={isVirtualizationEnabled ? `${effectiveTotalHeight}px` : 'auto'}
    {@attach scrollContainerAttach}>

    {#each visibleItems as item, i (keys[visibleRange.start + i] ?? getKey(item, visibleRange.start + i))}
      {@const index = visibleRange.start + i}
      {@const key = keys[index] ?? getKey(item, index)}
      <div class="virtual-item"
        style:transform={isVirtualizationEnabled ? `translateY(${itemPositions[i] ?? 0}px)` : undefined}
        {@attach itemAttach(key)}>
        {@render children(item, index)}
      </div>
    {/each}
  </div>
{/if}

<style>
  .virtual-list {
    position: relative;
    overflow-anchor: none;
  }

  .virtual-list--restoring {
    opacity: 0;
  }

  .virtual-item {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    will-change: transform;
    contain: layout style paint;
  }
</style>
