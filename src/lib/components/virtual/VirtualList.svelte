<script lang="ts">
  import { tick, flushSync } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { VisibleRange, ScrollToIndexOptions, ScrollState } from './types';
  import { FenwickTree } from './fenwick';
  import { HeightManager } from './height-manager';
  import { computeScrollTopPosition, findTargetIndex, getScrollTopFor, setScrollTopFor } from './scroll-helpers';
  import { createResizeOwner, destroyResizeOwner, observeResize, unobserveResize } from './shared-resize-observer';
  import {
    PREPEND_SEARCH_LIMIT,
    SCROLL_VELOCITY_THRESHOLD_MS,
    CORRECTION_MAX_PASSES,
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
    paused?: boolean;
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
    paused = false,
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
  let isNavigating = $state(false);
  let hasRestoredScroll = $state(false);
  let minTotalHeight = initialScrollState?.scrollTop != null
    ? initialScrollState.scrollTop + 1000
    : 0;
  let _cachedScrollTop = -1;
  let spacerHeightAdjustment = 0;
  let _visibleItemScrollOffset = 0;
  let topSpacerEl: HTMLDivElement | undefined = $state();
  let frameId: number | null = null;
  let frameDirty = 0;
  const DIRTY_SCROLL = 1;
  const DIRTY_HEIGHTS = 2;
  const DIRTY_CORRECTION = 4;
  let observedElements = new Set<Element>();
  let earlyCheckId: number | null = null;
  let earlyCheckCountdown = 0;
  let prevItemCount = 0;
  let prevFirstKey = '';
  let prevLastKey = '';
  let lastValidScrollContainer: HTMLElement | null = null;
  let lastKnownScrollTop = 0;
  let lastKnownVisibleStart = 0;
  let lastUserScrollTime = 0;
  let quickPrependHandled = false;
  let cachedPrependShift = 0;
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
      start: Math.max(0, visibleStart - buffer),
      end: Math.min(items.length, visibleEnd + buffer)
    };
  });

  let visibleItems = $derived(items.slice(visibleRange.start, visibleRange.end));

  let effectiveTotalHeight = $state(0);
  let topSpacerHeight = $state(0);
  let bottomSpacerHeight = $state(0);

  function isHeightChanged(a: number, b: number, threshold = HEIGHT_APPLY_THRESHOLD): boolean {
    return Math.abs(a - b) >= threshold;
  }

  function computeTopSpacerHeight(rangeStart: number): number {
    return Math.max(0, tree.prefixSum(rangeStart) + spacerHeightAdjustment);
  }

  function applyTopSpacerHeight(rangeStart: number): void {
    const h = computeTopSpacerHeight(rangeStart);
    if (topSpacerEl) topSpacerEl.style.height = h + 'px';
    topSpacerHeight = h;
  }

  function invalidateLayout(): void {
    effectiveTotalHeight = Math.max(tree.total, minTotalHeight);
    if (!isVirtualizationEnabled) {
      topSpacerHeight = 0;
      bottomSpacerHeight = 0;
      return;
    }
    const prefix = tree.prefixSum(visibleRange.start);
    const rawTopSpacer = prefix + spacerHeightAdjustment;
    if (rawTopSpacer < 0 && spacerHeightAdjustment < 0) {
      const excess = -rawTopSpacer;
      spacerHeightAdjustment += excess;
      const currentSt = getScrollTop();
      if (currentSt > 0) { setScrollTop(Math.max(0, currentSt - excess)); }
    }
    topSpacerHeight = computeTopSpacerHeight(visibleRange.start);
    const endPos = items.length > 0
      ? (visibleRange.end < tree.length ? tree.prefixSum(visibleRange.end) : tree.total)
      : 0;
    bottomSpacerHeight = items.length > 0
      ? Math.max(0, effectiveTotalHeight - endPos)
      : 0;
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
    const key = getKey(items[index], index);
    return hm.get(key) ?? getAverageHeight();
  }

  function applyPendingHeights(): void {
    if (hm.pending.size === 0) return;
    hm.applyPending();
    frameDirty &= ~DIRTY_HEIGHTS;
  }

  function recalculatePositions(): void {
    const len = items.length;
    if (len === 0) {
      tree.clear();
      return;
    }

    applyPendingHeights();
    const avg = getAverageHeight();
    tree.buildWithCallback(len, (i) => hm.get(getKey(items[i], i)) ?? avg);
  }

  function appendPositions(startIndex: number): void {
    const len = items.length;
    if (len === 0 || startIndex >= len) return;
    const avg = getAverageHeight();
    tree.extendWithCallback(len - startIndex, (i) => {
      const idx = startIndex + i;
      return hm.get(getKey(items[idx], idx)) ?? avg;
    });
  }

  function getScrollTop(): number {
    if (_cachedScrollTop >= 0) return _cachedScrollTop;
    return getScrollTopFor(scrollContainer, isWindowScroll);
  }

  function setScrollTop(value: number): void {
    _cachedScrollTop = -1;
    setScrollTopFor(scrollContainer, isWindowScroll, value);
  }

  function getViewportHeight(): number {
    if (isWindowScroll) return window.innerHeight;
    return scrollContainer?.clientHeight ?? 0;
  }

  let _cachedContainerTop: number | null = null;

  function getContainerTop(): number {
    if (isWindowScroll) return 0;
    if (_cachedContainerTop !== null) return _cachedContainerTop;
    return scrollContainer?.getBoundingClientRect().top ?? 0;
  }

  function cacheContainerTop(): void {
    _cachedContainerTop = getContainerTop();
  }

  function clearContainerTopCache(): void {
    _cachedContainerTop = null;
  }

  function findEndIndex(scrollBottom: number): number {
    return Math.min(items.length, tree.findIndex(scrollBottom) + 1);
  }

  function updateVisibleRange(): void {
    if (isNavigating || !scrollContainer || items.length === 0) return;

    const scrollTop = getScrollTop();
    const effectiveScrollTop = scrollTop - spacerHeightAdjustment - _visibleItemScrollOffset;

    const usableHeight = viewportHeight - topMargin;
    const newStart = tree.findIndex(effectiveScrollTop);
    const newEnd = findEndIndex(effectiveScrollTop + usableHeight);

    if (newStart !== visibleStart || newEnd !== visibleEnd) {
      const oldRangeStart = Math.max(0, visibleStart - buffer);
      const newRangeStart = Math.max(0, newStart - buffer);

      if (newStart > visibleStart) {
        if (newRangeStart > oldRangeStart) {
          measureTransitioningItems(oldRangeStart, newRangeStart);
        }
      }

      if (newRangeStart < oldRangeStart) {
        for (let i = newRangeStart; i < oldRangeStart && i < items.length; i++) {
          const key = getKey(items[i], i);
          const cachedH = hm.get(key);
          if (cachedH !== undefined && i < tree.length) {
            const treeVal = tree.get(i);
            const delta = cachedH - treeVal;
            if (delta !== 0) {
              tree.set(i, cachedH);
              spacerHeightAdjustment -= delta;
            }
          }
        }
      }

      if (newRangeStart === 0) {
        if (spacerHeightAdjustment < 0) spacerHeightAdjustment = 0;
        _visibleItemScrollOffset = 0;
      }

      visibleStart = newStart;
      visibleEnd = newEnd;
      invalidateLayout();
    }
  }

  function scheduleFrame(flag: number): void {
    frameDirty |= flag;
    if (frameId !== null) return;
    frameId = requestAnimationFrame(processFrame);
  }

  function cancelFrame(): void {
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
    frameDirty = 0;
  }

  interface CorrectionState {
    computeDrift: () => number | null;
    threshold: number;
    maxPasses: number;
    measure: 'full' | 'incremental' | 'none';
    navigating: boolean;
    onStart?: () => void;
    onFinish?: () => void;
    pass: number;
  }

  let correctionState: CorrectionState | null = null;

  function startCorrection(
    computeDrift: () => number | null,
    opts: { threshold: number; maxPasses: number; measure: 'full' | 'incremental' | 'none'; navigating: boolean; onStart?: () => void; onFinish?: () => void }
  ): void {
    if (correctionState) {
      correctionState.onFinish?.();
      if (correctionState.navigating) finishNavigation();
    }
    correctionState = { computeDrift, ...opts, pass: 0 };
    scheduleFrame(DIRTY_CORRECTION);
  }

  function processCorrectionPass(): void {
    if (!correctionState) return;
    if (!scrollContainer || correctionState.pass >= correctionState.maxPasses) {
      const cs = correctionState;
      correctionState = null;
      cs.onFinish?.();
      if (cs.navigating) finishNavigation();
      return;
    }

    if (correctionState.pass === 0 && correctionState.onStart) {
      correctionState.onStart();
      correctionState.onStart = undefined;
    }

    if (correctionState.measure === 'full') measureAndRecalculate();
    else if (correctionState.measure === 'incremental') measureAndRecalculateIncremental();

    const drift = correctionState.computeDrift();
    const currentScrollTop = getScrollTop();

    if (drift === null || Math.abs(drift) <= correctionState.threshold) {
      const cs = correctionState;
      correctionState = null;
      cs.onFinish?.();
      if (cs.navigating) finishNavigation();
      return;
    }

    setScrollTop(currentScrollTop + drift);
    correctionState.pass++;
    scheduleFrame(DIRTY_CORRECTION);
  }

  function processFrame(): void {
    _cachedScrollTop = getScrollTopFor(scrollContainer, isWindowScroll);
    cacheContainerTop();

    if (frameDirty & DIRTY_HEIGHTS) {
      frameDirty &= ~DIRTY_HEIGHTS;
      flushHeightUpdates();
    }

    if (frameDirty & DIRTY_CORRECTION) {
      frameDirty &= ~DIRTY_CORRECTION;
      processCorrectionPass();
    }

    const oldRangeStart = Math.max(0, visibleStart - buffer);

    if ((frameDirty & DIRTY_SCROLL) && !isNavigating) {
      frameDirty &= ~DIRTY_SCROLL;
      _cachedScrollTop = getScrollTopFor(scrollContainer, isWindowScroll);
      updateVisibleRange();
      onScroll?.();
      if (scrollContainer) {
        lastValidScrollContainer = scrollContainer;
        lastKnownScrollTop = _cachedScrollTop;
        lastKnownVisibleStart = visibleStart;
      }
    }

    flushSync();

    const newRangeStart = Math.max(0, visibleStart - buffer);
    if (newRangeStart < oldRangeStart && topSpacerEl) {
      let heightDelta = 0;
      for (let i = newRangeStart; i < oldRangeStart && i < items.length; i++) {
        const key = getKey(items[i], i);
        const el = itemRefs.get(key);
        const domH = el ? el.getBoundingClientRect().height : 0;
        const cachedH = hm.pending.get(key) ?? hm.get(key);
        const bestH = domH > 0 ? domH : cachedH;
        if (bestH === undefined || bestH <= 0) continue;
        const treeVal = tree.get(i);
        const delta = bestH - treeVal;
        if (delta === 0) continue;
        heightDelta += delta;
        tree.set(i, bestH);
        if (domH > 0) { hm.set(key, domH); hm.pending.delete(key); }
      }
      if (heightDelta !== 0) {
        spacerHeightAdjustment -= heightDelta;
        applyTopSpacerHeight(newRangeStart);
      }
    }

    _cachedScrollTop = -1;
    clearContainerTopCache();

    frameId = null;
    if (frameDirty !== 0) {
      frameId = requestAnimationFrame(processFrame);
    }
  }

  function handleScroll(): void {
    if (isNavigating || paused) return;
    scheduleFrame(DIRTY_SCROLL);
  }

  function earlyBufferCheck(): void {
    if (frameDirty !== 0) {
      if (frameId !== null) {
        cancelAnimationFrame(frameId);
        frameId = null;
      }
      processFrame();
    }

    if (earlyCheckCountdown > 0 && topSpacerEl && !isNavigating) {
      earlyCheckCountdown--;
      const rangeStart = Math.max(0, visibleStart - buffer);
      let heightDelta = 0;
      for (let i = rangeStart; i < visibleStart && i < items.length && i < tree.length; i++) {
        const key = getKey(items[i], i);
        if (hm.pending.has(key)) continue;
        const el = itemRefs.get(key);
        if (!el) continue;
        const domH = el.getBoundingClientRect().height;
        if (domH <= 0) continue;
        const treeVal = tree.get(i);
        const bufDelta = domH - treeVal;
        if (bufDelta === 0) continue;
        heightDelta += bufDelta;
        tree.set(i, domH);
        hm.set(key, domH);
      }
      if (heightDelta !== 0) {
        spacerHeightAdjustment -= heightDelta;
        applyTopSpacerHeight(rangeStart);
      }
    }

    if (earlyCheckCountdown > 0 || frameDirty !== 0) {
      earlyCheckId = requestAnimationFrame(earlyBufferCheck);
    } else {
      earlyCheckId = null;
    }
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

    if (_keyToIndexCache && _keyToIndexFirstKey === prevFirstKey
        && len > _keyToIndexLen && _keyToIndexLen > 0) {
      for (let i = _keyToIndexLen; i < len; i++) {
        _keyToIndexCache.set(getKey(items[i], i), i);
      }
      _keyToIndexLen = len;
      _keyToIndexLastKey = prevLastKey;
      return _keyToIndexCache;
    }

    const map = new Map<string, number>();
    for (let i = 0; i < len; i++) map.set(getKey(items[i], i), i);
    _keyToIndexCache = map;
    _keyToIndexLen = len;
    _keyToIndexFirstKey = prevFirstKey;
    _keyToIndexLastKey = prevLastKey;
    return map;
  }

  const KEY_TO_INDEX_LINEAR_THRESHOLD = 8;

  function findIndexForKey(key: string): number | undefined {
    if (_keyToIndexCache && _keyToIndexLen === items.length
        && _keyToIndexFirstKey === prevFirstKey && _keyToIndexLastKey === prevLastKey) {
      return _keyToIndexCache.get(key);
    }
    const rangeStart = Math.max(0, visibleStart - buffer);
    const rangeEnd = Math.min(items.length, visibleEnd + buffer);
    for (let i = rangeStart; i < rangeEnd; i++) {
      if (getKey(items[i], i) === key) return i;
    }
    return undefined;
  }

  function measureTransitioningItems(fromIdx: number, toIdx: number): void {
    const oldRangeEnd = visibleEnd + buffer;
    for (let i = fromIdx; i < Math.min(toIdx, oldRangeEnd); i++) {
      if (i >= items.length) break;
      const key = getKey(items[i], i);
      if (hm.has(key) && i < tree.length) {
        const cached = hm.get(key)!;
        if (!isHeightChanged(tree.get(i), cached)) continue;
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

  function flushPendingToTree(minIndex = 0): boolean {
    if (hm.pending.size === 0) return false;

    const useLinear = hm.pending.size <= KEY_TO_INDEX_LINEAR_THRESHOLD;
    let hasChanges = false;

    for (const [key, newHeight] of hm.pending) {
      const oldHeight = hm.get(key);
      if (oldHeight !== undefined && !isHeightChanged(oldHeight, newHeight)) continue;
      hm.set(key, newHeight);

      const idx = useLinear ? findIndexForKey(key) : getKeyToIndex().get(key);
      if (idx === undefined) continue;
      if (idx >= minIndex && idx < tree.length) {
        tree.set(idx, newHeight);
        hasChanges = true;
      }
    }

    hm.pending.clear();
    frameDirty &= ~DIRTY_HEIGHTS;
    return hasChanges;
  }

  function flushHeightUpdates(): void {
    if (isNavigating) {
      if (hm.pending.size > 0) {
        scheduleFrame(DIRTY_HEIGHTS);
      }
      return;
    }

    if (hm.pending.size === 0) {
      return;
    }

    const rangeStart = Math.max(0, visibleStart - buffer);
    const hasChanges = flushPendingToTree(rangeStart);

    if (hasChanges) {
      if (tree.length !== items.length) {
        recalculatePositions();
      }
      const rs = Math.max(0, visibleStart - buffer);
      spacerHeightAdjustment = topSpacerHeight - tree.prefixSum(rs);
      invalidateLayout();
      frameDirty |= DIRTY_SCROLL;
    }
  }

  let resizeOwner: object | null = null;

  function handleItemResizeBatch(entries: ResizeObserverEntry[]): void {
    cacheContainerTop();
    let immediateAboveDelta = 0;
    let visibleAboveDelta = 0;

    for (const entry of entries) {
      const el = entry.target as HTMLElement;
      const key = el.dataset.virtualKey;
      if (!key) continue;

      if (el.checkVisibility && !el.checkVisibility({ contentVisibilityAuto: true })) continue;

      const newHeight = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
      if (newHeight <= 0) continue;

      const oldHeight = hm.get(key);
      if (oldHeight !== undefined && !isHeightChanged(oldHeight, newHeight, HEIGHT_CHANGE_THRESHOLD)) {
        continue;
      }

      hm.pending.set(key, newHeight);

      if (!isNavigating) {
        const idx = findIndexForKey(key);
        if (idx !== undefined) {
          if (oldHeight === undefined && idx < tree.length && idx < visibleEnd) {
            const treeValue = tree.get(idx);
            const estimateDelta = newHeight - treeValue;
            if (isHeightChanged(estimateDelta, 0)) {
              immediateAboveDelta += estimateDelta;
            }
          } else if (oldHeight !== undefined && idx < visibleStart) {
            const actualDelta = newHeight - oldHeight;
            if (isHeightChanged(actualDelta, 0)) {
              immediateAboveDelta += actualDelta;
            }
          } else if (oldHeight !== undefined && idx >= visibleStart) {
            const rect = el.getBoundingClientRect();
            const containerTop = getContainerTop();
            const relTop = rect.top - containerTop;
            if (relTop < viewportHeight * 0.6) {
              const delta = newHeight - oldHeight;
              if (isHeightChanged(delta, 0)) {
                visibleAboveDelta += delta;
              }
            }
          }
        }
      }
    }

    if (immediateAboveDelta !== 0 && topSpacerEl) {
      spacerHeightAdjustment -= immediateAboveDelta;
      const rangeStart = Math.max(0, visibleStart - buffer);
      const prefix = tree.prefixSum(rangeStart);
      const rawSpacerHeight = prefix + spacerHeightAdjustment;
      if (rawSpacerHeight < 0 && spacerHeightAdjustment < 0 && scrollContainer) {
        const excess = -rawSpacerHeight;
        spacerHeightAdjustment += excess;
        const currentSt = getScrollTop();
        if (currentSt > 0) {
          setScrollTop(currentSt + excess);
        }
      }
      applyTopSpacerHeight(rangeStart);
    }

    if (visibleAboveDelta !== 0 && scrollContainer) {
      _visibleItemScrollOffset += visibleAboveDelta;
      const st = getScrollTop();
      setScrollTop(st + visibleAboveDelta);
    }

    clearContainerTopCache();

    if (hm.pending.size > 0 && !paused) {
      earlyCheckCountdown = 10;
      scheduleFrame(DIRTY_HEIGHTS);
      if (earlyCheckId === null) earlyCheckId = requestAnimationFrame(earlyBufferCheck);
    }
  }

  function handleUserScroll() {
    lastUserScrollTime = Date.now();
  }

  function scrollContainerAttach(element: HTMLElement) {
    resizeOwner = createResizeOwner(handleItemResizeBatch);
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
      if (earlyCheckId !== null) {
        cancelAnimationFrame(earlyCheckId);
        earlyCheckId = null;
      }
      cancelFrame();
      correctionState = null;
      for (const el of observedElements) {
        unobserveResize(el);
      }
      observedElements.clear();
      if (resizeOwner) {
        destroyResizeOwner(resizeOwner);
        resizeOwner = null;
      }
      scrollTarget.removeEventListener('scroll', handleScroll);
      scrollTarget.removeEventListener('wheel', handleUserScroll);
      scrollTarget.removeEventListener('touchmove', handleUserScroll);
      extraCleanup?.();
    };
  }

  function itemAttach(key: string) {
    return (element: HTMLElement) => {
      element.dataset.virtualKey = key;
      if (resizeOwner) {
        observeResize(element, resizeOwner);
        observedElements.add(element);
      }
      itemRefs.set(key, element);

      return () => {
        unobserveResize(element);
        observedElements.delete(element);
        itemRefs.delete(key);
      };
    };
  }

  function captureAnchorItem(
    shiftCount: number
  ): { key: string; visualY: number } | null {
    if (!scrollContainer) return null;
    const cTop = getContainerTop();

    for (let oldIdx = visibleStart; oldIdx < visibleEnd; oldIdx++) {
      const newIdx = oldIdx + shiftCount;
      if (newIdx >= items.length) break;
      const key = getKey(items[newIdx], newIdx);
      const el = itemRefs.get(key);
      if (!el) continue;
      const vy = el.getBoundingClientRect().top - cTop;
      if (vy >= topMargin - ANCHOR_TOLERANCE) {
        return { key, visualY: vy };
      }
    }

    const newIdx = visibleStart + shiftCount;
    if (newIdx < items.length) {
      const key = getKey(items[newIdx], newIdx);
      const el = itemRefs.get(key);
      const vy = el
        ? el.getBoundingClientRect().top - cTop
        : 0;
      return { key, visualY: vy };
    }

    return null;
  }

  function captureAnchorWithDefaults(shiftCount: number): { key: string; visualY: number } {
    const anchor = captureAnchorItem(shiftCount);
    return { key: anchor?.key ?? '', visualY: anchor?.visualY ?? 0 };
  }

  function detectPrependShift(firstKey: string, prevKey: string): number {
    if (!prevKey || firstKey === prevKey) return 0;
    const limit = Math.min(items.length, PREPEND_SEARCH_LIMIT);
    for (let i = 1; i < limit; i++) {
      if (getKey(items[i], i) === prevKey) return i;
    }
    return 0;
  }

  function handlePrePrependRefreshToTop(shiftCount: number): void {
    recalculatePositions();
    visibleEnd = Math.min(items.length, visibleEnd + shiftCount);
    invalidateLayout();
    quickPrependHandled = true;
  }

  function handlePrePrependActiveScroll(shiftCount: number): void {
    const { key: anchorKey, visualY: anchorVisualY } = captureAnchorWithDefaults(shiftCount);

    scrollContainer!.style.overflowAnchor = 'none';
    recalculatePositions();
    const scrollDelta = tree.length > 0 ? tree.prefixSum(shiftCount) : (shiftCount * getAverageHeight());
    setScrollTop(getScrollTop() + scrollDelta);
    visibleStart = Math.max(0, visibleStart + shiftCount);
    visibleEnd = Math.min(items.length, visibleEnd + shiftCount);
    quickPrependHandled = true;

    if (anchorKey) {
      startCorrection(
        () => {
          const el = itemRefs.get(anchorKey);
          if (!el) return null;
          return el.getBoundingClientRect().top - getContainerTop() - anchorVisualY;
        },
        {
          threshold: DRIFT_THRESHOLD_POSITION,
          maxPasses: CORRECTION_MAX_PASSES,
          measure: 'none',
          navigating: false,
          onFinish: () => { if (scrollContainer) scrollContainer.style.overflowAnchor = ''; },
        },
      );
    } else {
      startCorrection(
        () => null,
        {
          threshold: 0,
          maxPasses: 1,
          measure: 'none',
          navigating: false,
          onFinish: () => { if (scrollContainer) scrollContainer.style.overflowAnchor = ''; },
        },
      );
    }
  }

  function handlePrePrependIdle(shiftCount: number): void {
    const currentScrollTop = getScrollTop();
    const { key: anchorKey, visualY: anchorVisualY } = captureAnchorWithDefaults(shiftCount);

    if (anchorKey) {
      scrollContainer!.style.overflowAnchor = 'none';
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

  $effect.pre(() => {
    const len = items.length;
    void items;

    cachedPrependShift = 0;
    if (len === 0 || prevItemCount === 0 || !scrollContainer) return;

    const firstKey = getKey(items[0], 0);
    const shiftCount = detectPrependShift(firstKey, prevFirstKey);
    cachedPrependShift = shiftCount;

    if (shiftCount > 0) {
      if (refreshToTop && getScrollTop() <= topMargin) {
        handlePrePrependRefreshToTop(shiftCount);
      } else if (Date.now() - lastUserScrollTime < SCROLL_VELOCITY_THRESHOLD_MS || isNavigating) {
        handlePrePrependActiveScroll(shiftCount);
      } else {
        handlePrePrependIdle(shiftCount);
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
    spacerHeightAdjustment = 0;
    _visibleItemScrollOffset = 0;
    hm.clear();
    queueMicrotask(() => invalidateLayout());
  }

  function handleItemsInitial(): void {
    hm.clear();
    spacerHeightAdjustment = 0;
    _visibleItemScrollOffset = 0;
    const avg = getAverageHeight();
    tree.buildWithCallback(items.length, () => avg);
    if (!initialScrollState || hasRestoredScroll) {
      queueMicrotask(() => {
        invalidateLayout();
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
    spacerHeightAdjustment = 0;
    _visibleItemScrollOffset = 0;
    recalculatePositions();
    queueMicrotask(() => {
      invalidateLayout();
      updateVisibleRange();
      pruneStaleHeights();
    });
  }

  function handlePrependWithAnchor(shiftCount: number): void {
    const pp = pendingPrependAnchor!;
    pendingPrependAnchor = null;

    recalculatePositions();
    visibleStart = 0;
    visibleEnd = Math.min(items.length, pp.oldVisibleEnd + shiftCount + buffer);
    invalidateLayout();

    tick().then(() => {
      for (let i = 0; i < shiftCount; i++) {
        const key = getKey(items[i], i);
        const el = itemRefs.get(key);
        if (el) hm.set(key, el.getBoundingClientRect().height);
      }
      recalculatePositions();

      const newAnchorEl = itemRefs.get(pp.anchorKey);
      if (newAnchorEl && scrollContainer) {
        const cTop = getContainerTop();
        const newAnchorVisualY = newAnchorEl.getBoundingClientRect().top - cTop;
        const target = Math.max(0, pp.scrollTop + newAnchorVisualY - pp.anchorVisualY);
        setScrollTop(target);
      }

      startCorrection(
        () => {
          const el = itemRefs.get(pp.anchorKey);
          if (!el) return null;
          const cTop = getContainerTop();
          return el.getBoundingClientRect().top - cTop - pp.anchorVisualY;
        },
        {
          threshold: DRIFT_THRESHOLD_POSITION,
          maxPasses: CORRECTION_MAX_PASSES,
          measure: 'full',
          navigating: true,
          onFinish: () => { if (scrollContainer) scrollContainer.style.overflowAnchor = ''; },
        },
      );
      queueMicrotask(() => pruneStaleHeights());
    });
  }

  function handlePrependSimple(shiftCount: number): void {
    recalculatePositions();
    visibleStart = Math.max(0, visibleStart + shiftCount);
    visibleEnd = Math.min(items.length, visibleEnd + shiftCount);
    invalidateLayout();
    queueMicrotask(() => pruneStaleHeights());
  }

  function handlePrependFullReset(): void {
    hm.clear();
    handleItemsGenericChange();
  }

  type ItemChangeType =
    | { type: 'clear' }
    | { type: 'quickPrepend' }
    | { type: 'initial' }
    | { type: 'append'; oldCount: number }
    | { type: 'unchanged' }
    | { type: 'prependWithAnchor'; shiftCount: number }
    | { type: 'prependSimple'; shiftCount: number }
    | { type: 'prependFullReset' }
    | { type: 'generic' };

  function classifyItemChange(
    len: number, firstKey: string, lastKey: string,
    oldCount: number, oldFirstKey: string, oldLastKey: string
  ): ItemChangeType {
    if (len === 0) return { type: 'clear' };
    if (quickPrependHandled) return { type: 'quickPrepend' };
    if (oldCount === 0) return { type: 'initial' };

    if (firstKey === oldFirstKey) {
      if (len > oldCount && oldLastKey && getKey(items[oldCount - 1], oldCount - 1) === oldLastKey) {
        return { type: 'append', oldCount };
      }
      if (len === oldCount && lastKey === oldLastKey) return { type: 'unchanged' };
      return { type: 'generic' };
    }

    if (oldFirstKey && firstKey !== oldFirstKey) {
      const shiftCount = cachedPrependShift > 0 ? cachedPrependShift : detectPrependShift(firstKey, oldFirstKey);
      if (shiftCount > 0 && scrollContainer && pendingPrependAnchor) {
        return { type: 'prependWithAnchor', shiftCount };
      }
      if (shiftCount > 0) return { type: 'prependSimple', shiftCount };
      return { type: 'prependFullReset' };
    }

    return { type: 'generic' };
  }

  $effect(() => {
    const len = items.length;
    void items;

    const firstKey = len > 0 ? getKey(items[0], 0) : '';
    const lastKey = len > 0 ? getKey(items[len - 1], len - 1) : '';
    const oldCount = prevItemCount;
    const oldFirstKey = prevFirstKey;
    const oldLastKey = prevLastKey;

    const change = classifyItemChange(len, firstKey, lastKey, oldCount, oldFirstKey, oldLastKey);

    prevItemCount = len;
    prevFirstKey = firstKey;
    prevLastKey = lastKey;

    switch (change.type) {
      case 'clear': handleItemsClear(); break;
      case 'quickPrepend': quickPrependHandled = false; invalidateLayout(); break;
      case 'initial': handleItemsInitial(); break;
      case 'append': handleItemsAppend(change.oldCount); break;
      case 'unchanged': break;
      case 'prependWithAnchor': handlePrependWithAnchor(change.shiftCount); break;
      case 'prependSimple': handlePrependSimple(change.shiftCount); break;
      case 'prependFullReset': handlePrependFullReset(); break;
      case 'generic': handleItemsGenericChange(); break;
    }
  });

  $effect(() => {
    const range = visibleRange;
    if (!isNavigating) {
      onRangeChange?.(range);
    }
  });

  $effect(() => {
    if (!paused && scrollContainer) {
      if (hm.pending.size > 0) {
        scheduleFrame(DIRTY_HEIGHTS);
      }
      scheduleFrame(DIRTY_SCROLL);
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

  function measureVisibleItems(updateTree: boolean): void {
    const start = Math.max(0, visibleStart - buffer);
    const end = Math.min(items.length, visibleEnd + buffer);

    const measurements: { key: string; index: number; height: number }[] = [];
    for (let i = start; i < end; i++) {
      const key = getKey(items[i], i);
      const existing = hm.get(key);
      if (existing !== undefined && i < tree.length
          && !isHeightChanged(tree.get(i), existing)) {
        continue;
      }
      const el = itemRefs.get(key);
      if (!el) continue;
      const h = el.getBoundingClientRect().height;
      if (h <= 0) continue;
      if (existing === undefined || isHeightChanged(existing, h)) {
        measurements.push({ key, index: i, height: h });
      }
    }

    for (const { key, index, height } of measurements) {
      hm.set(key, height);
      if (updateTree && index < tree.length) {
        tree.set(index, height);
      }
    }
  }

  function measureAndRecalculate(): void {
    measureVisibleItems(false);
    recalculatePositions();
    if (minTotalHeight > tree.total) {
      minTotalHeight = tree.total;
    }
    invalidateLayout();
  }

  function measureAndRecalculateIncremental(): void {
    flushPendingToTree();

    measureVisibleItems(true);

    if (minTotalHeight > tree.total) {
      minTotalHeight = tree.total;
    }
    invalidateLayout();
  }

  function finishNavigation(): void {
    isNavigating = false;
    frameDirty |= DIRTY_SCROLL;
  }

  function computeScrollTop(index: number, align: string, offset: number): number {
    return computeScrollTopPosition(tree, index, getItemHeight(index), viewportHeight, topMargin, align, offset);
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
      startCorrection(
        () => {
          const corrected = Math.max(0, computeScrollTop(index, align, offset));
          return corrected - getScrollTop();
        },
        {
          threshold: DRIFT_THRESHOLD_SCROLL,
          maxPasses: CORRECTION_MAX_PASSES,
          measure: 'full',
          navigating: true,
        },
      );
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

  export function getScrollStateLightweight(): ScrollState | null {
    if (items.length === 0) return null;

    const container = scrollContainer ?? lastValidScrollContainer;
    const rawScrollTop = scrollContainer ? getScrollTop() : lastKnownScrollTop;
    const currentScrollTop = (rawScrollTop === 0 && lastKnownScrollTop > 0) ? lastKnownScrollTop : rawScrollTop;
    const index = (currentScrollTop !== rawScrollTop) ? lastKnownVisibleStart
      : (scrollContainer ? tree.findIndex(currentScrollTop) : lastKnownVisibleStart);
    const key = getKey(items[index], index);
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

    const container = scrollContainer ?? lastValidScrollContainer;
    const currentScrollTop = scrollContainer ? getScrollTop() : lastKnownScrollTop;
    const index = scrollContainer ? tree.findIndex(currentScrollTop) : lastKnownVisibleStart;
    const key = getKey(items[index], index);
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
        const key = getKey(items[targetIdx], targetIdx);
        startCorrection(
          () => {
            const e = itemRefs.get(key);
            if (!e) return null;
            return e.getBoundingClientRect().top - getContainerTop() - targetVisualY;
          },
          {
            threshold: DRIFT_THRESHOLD_POSITION,
            maxPasses: CORRECTION_MAX_PASSES,
            measure: 'incremental',
            navigating: true,
            onStart: () => {
              if (!itemRefs.get(key)) {
                const fallbackOffset = targetVisualY - topMargin;
                setScrollTop(Math.max(0, computeScrollTop(targetIdx, 'start', -fallbackOffset)));
              }
            },
          },
        );
      });
    } else {
      const position = tree.prefixSum(targetIdx);
      const targetScrollTop = position + offset;
      setScrollTop(Math.max(0, targetScrollTop));
      tick().then(() => {
        startCorrection(
          () => {
            const corrected = Math.max(0, computeScrollTop(targetIdx, 'start', offset));
            return corrected - getScrollTop();
          },
          {
            threshold: DRIFT_THRESHOLD_SCROLL,
            maxPasses: CORRECTION_MAX_PASSES,
            measure: 'full',
            navigating: true,
          },
        );
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
    const key = getKey(items[index], index);
    return itemRefs.get(key) ?? null;
  }

  export function getHeightEntries(): [string, number][] {
    return Array.from(hm.entries());
  }
</script>

{#if scrollContainer}
  <div class="virtual-list" class:virtual-list--restoring={initialScrollState && !hasRestoredScroll} {@attach scrollContainerAttach}>
    {#if isVirtualizationEnabled}
      <div class="virtual-spacer" style:height="{topSpacerHeight}px" aria-hidden="true" bind:this={topSpacerEl}></div>
    {/if}

    {#each visibleItems as item, i (getKey(item, visibleRange.start + i))}
      {@const index = visibleRange.start + i}
      {@const key = getKey(item, index)}
      {@const useAutoCV = (index >= visibleEnd || index < visibleStart) ? !isNavigating : false}
      <div class="virtual-item" style:content-visibility={useAutoCV ? "auto" : "visible"} style:contain-intrinsic-block-size={useAutoCV ? `auto ${getItemHeight(index)}px` : undefined} {@attach itemAttach(key)}>
        {@render children(item, index)}
      </div>
    {/each}

    {#if isVirtualizationEnabled}
      <div class="virtual-spacer" style:height="{bottomSpacerHeight}px" aria-hidden="true"></div>
    {/if}
  </div>
{/if}

<style>
  .virtual-list {
    position: relative;
  }

  .virtual-list--restoring {
    opacity: 0;
  }

  .virtual-item {
    overflow-anchor: none;
  }

  .virtual-spacer {
    pointer-events: none;
    overflow-anchor: none;
  }
</style>
