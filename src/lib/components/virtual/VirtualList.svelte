<script lang="ts">
  import { tick, untrack } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { VisibleRange, ScrollToIndexOptions, ScrollState } from './types';
  import { FenwickTree } from './fenwick';
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
    EARLY_CHECK_FRAMES,
    DEFAULT_BUFFER_PX,
    SCROLLTO_CORRECTION_MAX_PASSES,
  } from './constants';

  let fallbackItemHeight = DEFAULT_ITEM_HEIGHT;

  interface Props<T> {
    items: T[];
    getKey: (item: T, index: number) => string;
    scrollContainer: HTMLElement | null | undefined;
    buffer?: number;
    bufferPx?: number;
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
    buffer,
    bufferPx = DEFAULT_BUFFER_PX,
    topMargin = 0,
    initialScrollState = null,
    refreshToTop = false,
    paused = false,
    onRangeChange,
    onScroll,
    children
  }: Props<any> = $props();

  let _cachedEffectiveBuffer = 2;

  function getEffectiveBuffer(): number {
    if (buffer !== undefined) return buffer;
    const avgH = getAverageHeight();
    _cachedEffectiveBuffer = Math.max(1, Math.ceil(bufferPx / avgH));
    return _cachedEffectiveBuffer;
  }

  let visibleStart = $state(initialScrollState ? Math.max(0, (initialScrollState.index ?? 0) - _cachedEffectiveBuffer) : 0);
  let visibleEnd = $state(initialScrollState ? Math.min(
    initialScrollState.index != null ? initialScrollState.index + _cachedEffectiveBuffer + SCROLLTO_EXTRA_BUFFER : 0,
    999999
  ) : 0);
  let viewportHeight = $state(0);
  let tree = new FenwickTree();
  let pendingHeights = new Map<string, number>();

  let itemRefs = new Map<string, HTMLElement>();
  let isNavigating = $state(false);
  let hasRestoredScroll = $state(false);
  let minTotalHeight = initialScrollState?.scrollTop != null
    ? initialScrollState.scrollTop + 1000
    : 0;
  let _cachedScrollTop = -1;
  let isDocumentHidden = $state(typeof document !== 'undefined' && document.hidden);
  let effectivePaused = $derived(paused || isDocumentHidden);
  let spacerHeightAdjustment = 0;
  let _visibleItemScrollOffset = 0;
  let topSpacerEl: HTMLDivElement | undefined = $state();
  let frameId: number | null = null;
  let frameDirty = 0;
  const DIRTY_SCROLL = 1;
  const DIRTY_HEIGHTS = 2;
  const DIRTY_CORRECTION = 4;
  let earlyCheckId: number | null = null;
  let earlyCheckCountdown = 0;
  let prevItemCount = 0;
  let prevFirstKey = '';
  let prevLastKey = '';
  let lastValidScrollContainer: HTMLElement | null = null;
  let lastKnownScrollTop = 0;
  let lastKnownVisibleStart = 0;
  let lastUserScrollTime = 0;
  let _programmaticScroll = false;
  let _deferredScrollDelta = 0;
  let quickPrependHandled = false;
  let _postCorrectionAnchor: { key: string; visualY: number } | null = null;
  let cachedPrependShift = 0;

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
    const buf = getEffectiveBuffer();
    const start = Math.max(0, visibleStart - buf);
    const end = Math.min(items.length, visibleEnd + buf);
    return { start, end: Math.max(start, end) };
  });

  let visibleIndices = $derived.by(() => {
    const { start, end } = visibleRange;
    const len = end - start;
    const arr = new Array(len);
    for (let i = 0; i < len; i++) arr[i] = start + i;
    return arr;
  });

  let effectiveTotalHeight = 0;
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
    if (visibleRange.start === 0 && spacerHeightAdjustment > 0) {
      const excess = spacerHeightAdjustment;
      spacerHeightAdjustment = 0;
      const currentSt = getScrollTop();
      if (currentSt > 0) { setScrollTop(Math.max(0, currentSt - excess)); }
    }
    topSpacerHeight = Math.max(0, prefix + spacerHeightAdjustment);
    const endPos = items.length > 0 ? tree.prefixSum(visibleRange.end) : 0;
    bottomSpacerHeight = items.length > 0
      ? Math.max(0, effectiveTotalHeight - endPos)
      : 0;
  }

  function getAverageHeight(): number {
    return tree.measuredCount > 0 ? tree.measuredAverage : fallbackItemHeight;
  }

  function findTargetIndex(state: ScrollState): number {
    let targetIdx = state.index;
    if (state.key && items.length > 0) {
      const currentKey = targetIdx >= 0 && targetIdx < items.length
        ? getKey(items[targetIdx], targetIdx) : '';
      if (currentKey !== state.key) {
        for (let i = 0; i < items.length; i++) {
          if (getKey(items[i], i) === state.key) { targetIdx = i; break; }
        }
      }
    }
    return targetIdx;
  }

  function getItemHeight(index: number): number {
    if (index < 0 || index >= items.length) return getAverageHeight();
    return tree.isMeasured(index) ? tree.get(index) : getAverageHeight();
  }

  function recalculatePositions(): void {
    const len = items.length;
    if (len === 0) {
      tree.clear();
      return;
    }

    flushPendingToTree();
    const avg = getAverageHeight();

    if (tree.length > len) {
      tree.truncate(len, avg);
    } else if (tree.length < len) {
      tree.extendWithCallback(len - tree.length, () => avg);
      tree.rebuildWithAverage(avg);
    } else {
      tree.rebuildWithAverage(avg);
    }
  }

  function prependPositions(shiftCount: number): void {
    if (shiftCount <= 0) return;
    const avg = getAverageHeight();
    tree.prependWithCallback(shiftCount, () => avg);
  }

  function appendPositions(startIndex: number): void {
    const len = items.length;
    if (len === 0 || startIndex >= len) return;
    const avg = getAverageHeight();
    tree.extendWithCallback(len - startIndex, () => avg);
  }

  function getScrollTop(): number {
    if (_cachedScrollTop >= 0) return _cachedScrollTop;
    if (isWindowScroll) return window.scrollY;
    return scrollContainer?.scrollTop ?? 0;
  }

  function setScrollTop(value: number): void {
    if (scrollContainer && 'smoothScrolling' in scrollContainer.dataset) return;
    _programmaticScroll = true;
    _cachedScrollTop = -1;
    if (isWindowScroll) { window.scrollTo(0, value); }
    else if (scrollContainer) { scrollContainer.scrollTop = value; }
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
      const buf = getEffectiveBuffer();
      const oldRangeStart = Math.max(0, visibleStart - buf);
      const newRangeStart = Math.max(0, newStart - buf);

      if (newStart > visibleStart) {
        if (newRangeStart > oldRangeStart) {
          measureTransitioningItems(oldRangeStart, newRangeStart);
        }
      }

      if (newRangeStart === 0) {
        spacerHeightAdjustment = 0;
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

  let _corrState: {
    computeDrift: () => number | null;
    threshold: number;
    maxPasses: number;
    measure: 'full' | 'incremental' | 'none';
    navigating: boolean;
    onStart?: () => void;
    onFinish?: () => void;
    pass: number;
  } | null = null;

  function finishCorrectionState(s: NonNullable<typeof _corrState>): void {
    s.onFinish?.();
    if (s.navigating) finishNavigation();
  }

  function startCorrection(
    computeDrift: () => number | null,
    opts: { threshold: number; maxPasses: number; measure: 'full' | 'incremental' | 'none'; navigating: boolean; onStart?: () => void; onFinish?: () => void },
  ): void {
    if (_corrState) finishCorrectionState(_corrState);
    _corrState = { computeDrift, ...opts, pass: 0 };
    scheduleFrame(DIRTY_CORRECTION);
  }

  function processCorrection(): void {
    if (!_corrState) return;
    if (!scrollContainer || _corrState.pass >= _corrState.maxPasses) {
      const s = _corrState; _corrState = null;
      finishCorrectionState(s);
      return;
    }
    if (_corrState.pass === 0 && _corrState.onStart) {
      _corrState.onStart();
      _corrState.onStart = undefined;
    }
    if (_corrState.measure === 'full') measureAndRecalculate();
    else if (_corrState.measure === 'incremental') measureAndRecalculateIncremental();
    const drift = _corrState.computeDrift();
    const st = getScrollTop();
    if (drift === null || Math.abs(drift) <= _corrState.threshold) {
      const s = _corrState; _corrState = null;
      finishCorrectionState(s);
      return;
    }
    setScrollTop(st + drift);
    _corrState.pass++;
    scheduleFrame(DIRTY_CORRECTION);
  }

  function cancelCorrection(): void {
    if (_corrState) finishCorrectionState(_corrState);
    _corrState = null;
  }

  function processFrame(): void {
    _cachedScrollTop = (isWindowScroll ? window.scrollY : scrollContainer?.scrollTop ?? 0);
    cacheContainerTop();

    if (frameDirty & DIRTY_HEIGHTS) {
      frameDirty &= ~DIRTY_HEIGHTS;
      flushHeightUpdates();
    }

    if (frameDirty & DIRTY_CORRECTION) {
      frameDirty &= ~DIRTY_CORRECTION;
      processCorrection();
    }

    const buf = getEffectiveBuffer();
    const oldRangeStart = Math.max(0, visibleStart - buf);

    if ((frameDirty & DIRTY_SCROLL) && !isNavigating) {
      frameDirty &= ~DIRTY_SCROLL;
      _cachedScrollTop = (isWindowScroll ? window.scrollY : scrollContainer?.scrollTop ?? 0);
      updateVisibleRange();
      onScroll?.();
      if (scrollContainer) {
        lastValidScrollContainer = scrollContainer;
        lastKnownScrollTop = _cachedScrollTop;
        lastKnownVisibleStart = visibleStart;
      }
    }

    const newRangeStart = Math.max(0, visibleStart - buf);

    if (newRangeStart > oldRangeStart && newRangeStart < items.length) {
      const refKey = getKey(items[newRangeStart], newRangeStart);
      const driftRefEl = itemRefs.get(refKey) ?? null;
      if (driftRefEl) {
        const driftRefY = driftRefEl.getBoundingClientRect().top;
        tick().then(() => {
          const newY = driftRefEl.getBoundingClientRect().top;
          const drift = newY - driftRefY;
          if (Math.abs(drift) > 0.5) {
            setScrollTop(getScrollTop() + Math.round(drift));
          }
        });
      }
    }

    if (_postCorrectionAnchor) {
      const anchor = _postCorrectionAnchor;
      _postCorrectionAnchor = null;
      tick().then(() => {
        const el = itemRefs.get(anchor.key);
        if (el && topSpacerEl) {
          const cTop = isWindowScroll ? 0 : scrollContainer?.getBoundingClientRect().top ?? 0;
          const residual = el.getBoundingClientRect().top - cTop - anchor.visualY;
          if (Math.abs(residual) > 0.01) {
            topSpacerEl.style.height = (topSpacerHeight - residual) + 'px';
          }
        }
      });
    }

    if (newRangeStart < oldRangeStart && topSpacerEl) {
      let heightDelta = 0;
      for (let i = newRangeStart; i < oldRangeStart && i < items.length; i++) {
        const key = getKey(items[i], i);
        const pendingH = pendingHeights.get(key);
        const treeVal = tree.get(i);
        if (pendingH !== undefined && isHeightChanged(treeVal, pendingH)) {
          heightDelta += pendingH - treeVal;
          tree.setMeasured(i, pendingH);
          pendingHeights.delete(key);
        } else if (pendingH === undefined) {
          const el = itemRefs.get(key);
          if (el) {
            const domH = el.getBoundingClientRect().height;
            if (domH > 0 && isHeightChanged(treeVal, domH)) {
              heightDelta += domH - treeVal;
              tree.setMeasured(i, domH);
            }
          }
        }
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
    if (isNavigating || effectivePaused) return;
    if (_programmaticScroll) {
      _programmaticScroll = false;
    } else {
      lastUserScrollTime = Date.now();
    }
    scheduleFrame(DIRTY_SCROLL);
  }

  function cancelEarlyCheck(): void {
    if (earlyCheckId !== null) {
      if (typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(earlyCheckId);
      else clearTimeout(earlyCheckId);
      earlyCheckId = null;
    }
  }

  function scheduleEarlyCheck(): void {
    if (earlyCheckId !== null) return;
    earlyCheckId = (typeof requestIdleCallback !== 'undefined')
      ? requestIdleCallback(idleBufferCheck, { timeout: 100 })
      : setTimeout(idleBufferCheck, 0) as unknown as number;
  }

  function idleBufferCheck(): void {
    earlyCheckId = null;

    if (frameDirty !== 0 && frameId === null) {
      frameId = requestAnimationFrame(processFrame);
    }

    if (earlyCheckCountdown > 0 && topSpacerEl && !isNavigating) {
      earlyCheckCountdown--;
      const rangeStart = Math.max(0, visibleStart - getEffectiveBuffer());
      let heightDelta = 0;
      for (let i = rangeStart; i < visibleStart && i < items.length && i < tree.length; i++) {
        const key = getKey(items[i], i);
        if (pendingHeights.has(key)) continue;
        const el = itemRefs.get(key);
        if (!el) continue;
        const domH = el.getBoundingClientRect().height;
        if (domH <= 0) continue;
        const treeVal = tree.get(i);
        const bufDelta = domH - treeVal;
        if (bufDelta === 0) continue;
        heightDelta += bufDelta;
        tree.setMeasured(i, domH);
      }
      if (heightDelta !== 0) {
        spacerHeightAdjustment -= heightDelta;
        applyTopSpacerHeight(rangeStart);
      }
    }

    if (earlyCheckCountdown > 0) {
      scheduleEarlyCheck();
    }
  }

  function findIndexForKey(key: string): number | undefined {
    const buf = getEffectiveBuffer();
    const rangeStart = Math.max(0, visibleStart - buf);
    const rangeEnd = Math.min(items.length, visibleEnd + buf);
    for (let i = rangeStart; i < rangeEnd; i++) {
      if (getKey(items[i], i) === key) return i;
    }
    return undefined;
  }

  function measureTransitioningItems(fromIdx: number, toIdx: number): void {
    const oldRangeEnd = visibleEnd + getEffectiveBuffer();
    for (let i = fromIdx; i < Math.min(toIdx, oldRangeEnd); i++) {
      if (i >= items.length) break;
      const key = getKey(items[i], i);
      if (tree.isMeasured(i) && i < tree.length) {
        const pendingH = pendingHeights.get(key);
        if (pendingH !== undefined) {
          tree.setMeasured(i, pendingH);
          pendingHeights.delete(key);
        }
        continue;
      }
      const el = itemRefs.get(key);
      if (!el) continue;
      const h = el.getBoundingClientRect().height;
      if (h <= 0) continue;
      tree.setMeasured(i, h);
    }
  }

  function flushPendingToTree(minIndex = 0): boolean {
    if (pendingHeights.size === 0) return false;

    let hasChanges = false;
    const resolved: string[] = [];

    for (const [key, newHeight] of pendingHeights) {
      const idx = findIndexForKey(key);
      if (idx === undefined) continue;
      resolved.push(key);
      const oldHeight = tree.isMeasured(idx) ? tree.get(idx) : undefined;
      if (oldHeight !== undefined && !isHeightChanged(oldHeight, newHeight)) continue;
      if (idx >= minIndex && idx < tree.length) {
        tree.setMeasured(idx, newHeight);
        hasChanges = true;
      }
    }

    for (const key of resolved) pendingHeights.delete(key);
    if (pendingHeights.size === 0) frameDirty &= ~DIRTY_HEIGHTS;
    return hasChanges;
  }

  function flushHeightUpdates(): void {
    if (isNavigating) {
      if (pendingHeights.size > 0) {
        scheduleFrame(DIRTY_HEIGHTS);
      }
      return;
    }

    if (pendingHeights.size === 0) {
      return;
    }

    const buf = getEffectiveBuffer();
    const rangeStart = Math.max(0, visibleStart - buf);
    const hasChanges = flushPendingToTree(rangeStart);

    if (hasChanges) {
      if (tree.length !== items.length) {
        recalculatePositions();
      }
      const rs = Math.max(0, visibleStart - buf);
      if (rs === 0) {
        spacerHeightAdjustment = 0;
      } else {
        spacerHeightAdjustment = topSpacerHeight - tree.prefixSum(rs);
      }
      invalidateLayout();
      frameDirty |= DIRTY_SCROLL;
    }
  }

  let resizeObserver: ResizeObserver | null = null;

  function handleItemResizeBatch(entries: ResizeObserverEntry[]): void {
    if (isDocumentHidden) return;
    cacheContainerTop();
    let immediateAboveDelta = 0;
    let visibleAboveDelta = 0;
    let hasDirectTreeUpdate = false;

    for (const entry of entries) {
      const el = entry.target as HTMLElement;
      const key = el.dataset.virtualKey;
      if (!key) continue;

      if (el.checkVisibility && !el.checkVisibility({ contentVisibilityAuto: true })) continue;

      const newHeight = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
      if (newHeight <= 0) continue;

      const idx = !isNavigating ? findIndexForKey(key) : undefined;
      const oldHeight = idx !== undefined && tree.isMeasured(idx) ? tree.get(idx) : undefined;
      if (oldHeight !== undefined && !isHeightChanged(oldHeight, newHeight, HEIGHT_CHANGE_THRESHOLD)) {
        continue;
      }

      pendingHeights.set(key, newHeight);

      if (!isNavigating && idx !== undefined) {
        if (idx < visibleStart && idx < tree.length) {
          const prevHeight = oldHeight ?? tree.get(idx);
          const delta = newHeight - prevHeight;
          if (isHeightChanged(delta, 0)) {
            immediateAboveDelta += delta;
          }
        } else if (oldHeight !== undefined && idx >= visibleStart) {
          if (getScrollTop() > topMargin) {
            const rect = el.getBoundingClientRect();
            const containerTop = getContainerTop();
            const relTop = rect.top - containerTop;
            if (relTop < topMargin) {
              const delta = newHeight - oldHeight;
              if (isHeightChanged(delta, 0)) {
                visibleAboveDelta += delta;
              }
            }
          }
        } else if (oldHeight === undefined && idx >= visibleStart && idx < tree.length) {
          const treeValue = tree.get(idx);
          const estimateDelta = newHeight - treeValue;
          if (isHeightChanged(estimateDelta, 0)) {
            tree.setMeasured(idx, newHeight);
            pendingHeights.delete(key);
            hasDirectTreeUpdate = true;
            if (getScrollTop() > topMargin) {
              const rect = el.getBoundingClientRect();
              const containerTop = getContainerTop();
              const relTop = rect.top - containerTop;
              if (relTop < topMargin) {
                visibleAboveDelta += estimateDelta;
              }
            }
          }
        }
      }
    }

    if (immediateAboveDelta !== 0 && topSpacerEl) {
      spacerHeightAdjustment -= immediateAboveDelta;
      const rangeStart = Math.max(0, visibleStart - getEffectiveBuffer());
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
      if (rangeStart === 0 && spacerHeightAdjustment > 0 && scrollContainer) {
        const excess = spacerHeightAdjustment;
        spacerHeightAdjustment = 0;
        const currentSt = getScrollTop();
        if (currentSt > 0) setScrollTop(Math.max(0, currentSt - excess));
      }
      applyTopSpacerHeight(rangeStart);
    }

    if (visibleAboveDelta !== 0 && scrollContainer && !('smoothScrolling' in scrollContainer.dataset)) {
      _visibleItemScrollOffset += visibleAboveDelta;
      const st = getScrollTop();
      setScrollTop(st + visibleAboveDelta);
    }

    clearContainerTopCache();

    if (pendingHeights.size > 0 && !effectivePaused) {
      earlyCheckCountdown = EARLY_CHECK_FRAMES;
      scheduleFrame(DIRTY_HEIGHTS);
      scheduleEarlyCheck();
    } else if (hasDirectTreeUpdate && !effectivePaused) {
      scheduleFrame(DIRTY_SCROLL);
    }
  }

  function handleUserScroll() {
    lastUserScrollTime = Date.now();
  }

  function scrollContainerAttach(element: HTMLElement) {
    resizeObserver = new ResizeObserver(handleItemResizeBatch);
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
      cancelEarlyCheck();
      cancelFrame();
      cancelCorrection();

      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
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
    prependPositions(shiftCount);
    visibleEnd = Math.min(items.length, visibleEnd + shiftCount);
    invalidateLayout();
    scheduleFrame(DIRTY_SCROLL);
    quickPrependHandled = true;
  }

  function handlePrePrependActiveScroll(shiftCount: number): void {
    const { key: anchorKey, visualY: anchorVisualY } = captureAnchorWithDefaults(shiftCount);

    scrollContainer!.style.overflowAnchor = 'none';
    prependPositions(shiftCount);
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
          onFinish: () => {
            _postCorrectionAnchor = { key: anchorKey, visualY: anchorVisualY };
            if (scrollContainer) scrollContainer.style.overflowAnchor = '';
          },
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
    prependPositions(shiftCount);

    const newVisibleStart = Math.max(0, visibleStart + shiftCount);
    const buf = getEffectiveBuffer();
    const rangeStart = Math.max(0, newVisibleStart - buf);
    const newSpacerHeight = computeTopSpacerHeight(rangeStart);
    if (topSpacerEl) topSpacerEl.style.height = newSpacerHeight + 'px';
    topSpacerHeight = newSpacerHeight;

    const scrollDelta = tree.prefixSum(shiftCount);
    if (isDocumentHidden) {
      _deferredScrollDelta += scrollDelta;
    } else {
      setScrollTop(getScrollTop() + scrollDelta);
    }

    visibleStart = newVisibleStart;
    visibleEnd = Math.min(items.length, visibleEnd + shiftCount);
    quickPrependHandled = true;
  }

  $effect.pre(() => {
    const len = items.length;
    void items;

    untrack(() => {
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
  });

  function handleItemsClear(): void {
    tree.clear();
    pendingHeights.clear();
    visibleStart = 0;
    visibleEnd = 0;
    prevItemCount = 0;
    prevFirstKey = '';
    prevLastKey = '';
    minTotalHeight = 0;
    spacerHeightAdjustment = 0;
    _visibleItemScrollOffset = 0;
    queueMicrotask(() => invalidateLayout());
  }

  function handleItemsInitial(): void {
    pendingHeights.clear();
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
  }

  function handleItemsGenericChange(): void {
    spacerHeightAdjustment = 0;
    _visibleItemScrollOffset = 0;
    pendingHeights.clear();
    if (visibleEnd > items.length) visibleEnd = items.length;
    if (visibleStart > visibleEnd) visibleStart = Math.max(0, visibleEnd - 1);
    recalculatePositions();
    queueMicrotask(() => {
      invalidateLayout();
      updateVisibleRange();
    });
  }

  function handlePrependSimple(shiftCount: number): void {
    prependPositions(shiftCount);
    visibleStart = Math.max(0, visibleStart + shiftCount);
    visibleEnd = Math.min(items.length, visibleEnd + shiftCount);
    invalidateLayout();
  }

  function handlePrependFullReset(): void {
    pendingHeights.clear();
    tree.clearMeasured();
    handleItemsGenericChange();
  }

  $effect(() => {
    const len = items.length;
    void items;

    untrack(() => {
      const firstKey = len > 0 ? getKey(items[0], 0) : '';
      const lastKey = len > 0 ? getKey(items[len - 1], len - 1) : '';
      const oldCount = prevItemCount;
      const oldFirstKey = prevFirstKey;
      const oldLastKey = prevLastKey;

      prevItemCount = len;
      prevFirstKey = firstKey;
      prevLastKey = lastKey;

      if (len === 0) { handleItemsClear(); }
      else if (quickPrependHandled) { quickPrependHandled = false; invalidateLayout(); }
      else if (oldCount === 0) { handleItemsInitial(); }
      else if (firstKey === oldFirstKey) {
        if (len > oldCount && oldLastKey && getKey(items[oldCount - 1], oldCount - 1) === oldLastKey) {
          handleItemsAppend(oldCount);
        } else if (len !== oldCount || lastKey !== oldLastKey) {
          handleItemsGenericChange();
        }
      } else if (oldFirstKey) {
        const shiftCount = cachedPrependShift > 0
          ? cachedPrependShift
          : detectPrependShift(firstKey, oldFirstKey);
        if (shiftCount > 0) {
          handlePrependSimple(shiftCount);
        } else {
          handlePrependFullReset();
        }
      } else {
        handleItemsGenericChange();
      }
    });
  });

  $effect(() => {
    const range = visibleRange;
    if (!isNavigating) {
      onRangeChange?.(range);
    }
  });

  $effect(() => {
    if (!effectivePaused && scrollContainer) {
      if (pendingHeights.size > 0) {
        scheduleFrame(DIRTY_HEIGHTS);
      }
      scheduleFrame(DIRTY_SCROLL);
    }
  });

  $effect(() => {
    if (typeof document === 'undefined') return;
    const handler = () => {
      const wasHidden = isDocumentHidden;
      isDocumentHidden = document.hidden;
      if (wasHidden && !document.hidden && scrollContainer) {
        if (_deferredScrollDelta !== 0) {
          setScrollTop(getScrollTop() + _deferredScrollDelta);
          _deferredScrollDelta = 0;
        }
        scheduleFrame(DIRTY_HEIGHTS | DIRTY_SCROLL);
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  });

  $effect(() => {
    if (scrollContainer && initialScrollState && !hasRestoredScroll && items.length > 0 && viewportHeight > 0) {
      untrack(() => {
        const targetIdx = findTargetIndex(initialScrollState);
        if (targetIdx < 0 || targetIdx >= items.length) return;

        hasRestoredScroll = true;
        const hasHeights = (initialScrollState.heights?.length ?? 0) > 0;
        const savedScrollTop = initialScrollState.scrollTop;

        if (!hasHeights && savedScrollTop != null && savedScrollTop > 0 && initialScrollState.index > 0) {
          minTotalHeight = savedScrollTop + viewportHeight;
        }

        if (initialScrollState.heights?.length > 0) {
          const keyToHeight = new Map<string, number>();
          let heightSum = 0;
          for (const [key, value] of initialScrollState.heights) {
            keyToHeight.set(key, value);
            heightSum += value;
          }
          const avg = keyToHeight.size > 0 ? heightSum / keyToHeight.size : getAverageHeight();
          tree.buildWithMeasured(
            items.length,
            (i) => keyToHeight.get(getKey(items[i], i)) ?? avg,
            (i) => keyToHeight.has(getKey(items[i], i))
          );
        } else if (tree.length !== items.length) {
          recalculatePositions();
        }

        applyScrollRestore(initialScrollState, !hasHeights && savedScrollTop != null);
      });
    }
  });

  function measureVisibleItems(updateTree: boolean): void {
    const buf = getEffectiveBuffer();
    const start = Math.max(0, visibleStart - buf);
    const end = Math.min(items.length, visibleEnd + buf);

    for (let i = start; i < end; i++) {
      const key = getKey(items[i], i);
      const el = itemRefs.get(key);
      if (!el) continue;
      const h = el.getBoundingClientRect().height;
      if (h <= 0) continue;
      if (i < tree.length) {
        const treeVal = tree.get(i);
        if (!isHeightChanged(treeVal, h)) continue;
      }
      if (updateTree) {
        tree.setMeasured(i, h);
      } else {
        pendingHeights.set(key, h);
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
    const pos = tree.prefixSum(index);
    const usable = viewportHeight - topMargin;
    if (align === 'center') return pos - usable / 2 + getItemHeight(index) / 2 + offset;
    if (align === 'end') return pos - usable + getItemHeight(index) + offset;
    return pos + offset;
  }

  export function scrollToIndex(index: number, options: ScrollToIndexOptions = {}): void {
    if (!scrollContainer || index < 0 || index >= items.length) return;

    spacerHeightAdjustment = 0;
    _visibleItemScrollOffset = 0;

    recalculatePositions();

    const { align = 'start', offset = 0 } = options;
    const targetScrollTop = computeScrollTop(index, align, offset);
    const buf = getEffectiveBuffer();

    isNavigating = true;
    visibleStart = Math.max(0, index - buf);
    visibleEnd = Math.min(items.length, index + buf + SCROLLTO_EXTRA_BUFFER);
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
          maxPasses: SCROLLTO_CORRECTION_MAX_PASSES,
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

  function adjustIndexForStickyHeader(idx: number, scrollTop: number): number {
    if (topMargin > 0 && idx + 1 < items.length && idx < tree.length) {
      const off = scrollTop - tree.prefixSum(idx);
      if (off + topMargin >= tree.get(idx)) return idx + 1;
    }
    return idx;
  }

  export function getScrollStateLightweight(): ScrollState | null {
    if (items.length === 0) return null;

    const container = scrollContainer ?? lastValidScrollContainer;
    const rawScrollTop = scrollContainer ? getScrollTop() : lastKnownScrollTop;
    const currentScrollTop = (rawScrollTop === 0 && lastKnownScrollTop > 0) ? lastKnownScrollTop : rawScrollTop;
    let index = (currentScrollTop !== rawScrollTop) ? lastKnownVisibleStart
      : (scrollContainer ? tree.findIndex(currentScrollTop) : lastKnownVisibleStart);
    index = adjustIndexForStickyHeader(index, currentScrollTop);
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
    let index = scrollContainer ? tree.findIndex(currentScrollTop) : lastKnownVisibleStart;
    index = adjustIndexForStickyHeader(index, currentScrollTop);
    const key = getKey(items[index], index);
    const offset = currentScrollTop - tree.prefixSum(index);

    const heightsArray: [string, number][] = [];
    const limit = Math.min(items.length, tree.length);
    for (let i = 0; i < limit; i++) {
      if (tree.isMeasured(i)) {
        heightsArray.push([getKey(items[i], i), tree.get(i)]);
      }
    }

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
    const targetIdx = findTargetIndex(state);
    if (targetIdx < 0 || targetIdx >= items.length) return;

    const offset = state.offset ?? 0;

    const buf = getEffectiveBuffer();
    isNavigating = true;
    visibleStart = Math.max(0, targetIdx - buf);
    visibleEnd = Math.min(items.length, targetIdx + buf + SCROLLTO_EXTRA_BUFFER);
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

    pendingHeights.clear();

    if (state.heights?.length > 0) {
      const keyToHeight = new Map<string, number>();
      let heightSum = 0;
      for (const [key, value] of state.heights) {
        keyToHeight.set(key, value);
        heightSum += value;
      }
      const avg = keyToHeight.size > 0 ? heightSum / keyToHeight.size : getAverageHeight();
      tree.buildWithMeasured(
        items.length,
        (i) => keyToHeight.get(getKey(items[i], i)) ?? avg,
        (i) => keyToHeight.has(getKey(items[i], i))
      );
    } else {
      recalculatePositions();
    }

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
      measuredCount: tree.measuredCount,
      averageHeight: getAverageHeight(),
    };
  }

  export function getHeightEntries(): [string, number][] {
    const result: [string, number][] = [];
    const limit = Math.min(items.length, tree.length);
    for (let i = 0; i < limit; i++) {
      if (tree.isMeasured(i)) {
        result.push([getKey(items[i], i), tree.get(i)]);
      }
    }
    return result;
  }
</script>

{#if scrollContainer}
  <div class="virtual-list" class:virtual-list--restoring={initialScrollState && !hasRestoredScroll} {@attach scrollContainerAttach}>
    {#if isVirtualizationEnabled}
      <div class="virtual-spacer" style:height="{topSpacerHeight}px" aria-hidden="true" bind:this={topSpacerEl}></div>
    {/if}

    {#each visibleIndices as index (getKey(items[index], index))}
      {@const item = items[index]}
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
