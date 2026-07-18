<script lang="ts">
  import { flushSync, tick, untrack } from 'svelte';
  import type { Snippet } from 'svelte';
  import type { VisibleRange, ScrollToIndexOptions, ScrollState } from './types';
  import { FenwickTree } from './fenwick';
  import { classifyItemChange } from './item-change-classifier';
  import {
    RESIZE_RECENT_SCROLL_MS,
    CV_CORE_MARGIN,
    DEFAULT_BUFFER_PX,
    DEFAULT_ITEM_HEIGHT,
    FALLBACK_RENDER_COUNT,
    HEIGHT_CHANGE_THRESHOLD,
    PREPEND_SEARCH_LIMIT,
    SCROLLTO_EXTRA_BUFFER,
    SETTLE_IDLE_MS,
  } from './constants';

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

  let tree = new FenwickTree();
  let itemRefs = new Map<string, HTMLElement>();
  let lastDeliveredHeights = new WeakMap<Element, number>();
  let observedFlexChildren = new WeakSet<Element>();

  let pivotIndex = $state(0);
  let pivotKey = '';
  let B = $state(0);
  let downOffset = $state(0);
  let canvasHeight = $state(0);
  let rangeStart = $state(0);
  let rangeEnd = $state(0);

  let viewportHeight = $state(0);
  let visibleStart = $state(0);
  let visibleEnd = $state(Infinity);
  let measuredEpoch = $state(0);
  let isNavigating = $state(false);
  let hasRestoredScroll = $state(false);
  let restoreDeferred = $state(false);
  let isDocumentHidden = $state(typeof document !== 'undefined' && document.hidden);
  let effectivePaused = $derived(paused || isDocumentHidden);

  let canvasEl: HTMLDivElement | undefined = $state();
  let downBlockEl: HTMLDivElement | undefined = $state();

  let prevItemCount = 0;
  let prevFirstKey = '';
  let prevLastKey = '';
  let prevKeys: string[] = [];
  let pendingEpochBump = false;
  let lastUserScrollTime = 0;
  let lastTouchTime = 0;
  let lastUserActivityTime = 0;
  let _programmaticScroll = false;
  let frameQueued = false;
  let settlementId: number | null = null;
  let lastValidScrollContainer: HTMLElement | null = null;
  let lastKnownScrollTop = 0;
  let lastKnownAnchorIndex = 0;
  let lastKnownVisualY: number | undefined = undefined;
  let lastKnownCanvasWidth = 0;
  let restoreLock: { key: string; y: number } | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let frameTops: number[] = [];
  let frameBottoms: number[] = [];
  let pendingTopStill = false;
  let deferRestoreExpansion = false;

  let isWindowScroll = $derived(
    typeof document !== 'undefined' &&
    (scrollContainer === document.documentElement || scrollContainer === document.body)
  );

  let isVirtualizationEnabled = $derived(
    scrollContainer != null && viewportHeight > 0 && items.length > 0
  );

  let restorePending = $derived(!!initialScrollState && !hasRestoredScroll && !restoreDeferred);

  let upIndices = $derived.by(() => {
    const end = Math.min(rangeEnd, pivotIndex);
    const len = Math.max(0, end - rangeStart);
    const arr = new Array(len);
    for (let i = 0; i < len; i++) arr[i] = rangeStart + i;
    return arr;
  });

  let downIndices = $derived.by(() => {
    const start = Math.max(rangeStart, pivotIndex);
    const len = Math.max(0, rangeEnd - start);
    const arr = new Array(len);
    for (let i = 0; i < len; i++) arr[i] = start + i;
    return arr;
  });

  let upBottom = $derived(canvasHeight - B);
  let downTop = $derived(B + downOffset);

  function getAverageHeight(): number {
    return tree.measuredCount > 0 ? tree.measuredAverage : DEFAULT_ITEM_HEIGHT;
  }

  function getEffectiveBufferPx(): number {
    return buffer !== undefined ? buffer * getAverageHeight() : bufferPx;
  }

  function getScrollTop(): number {
    if (isWindowScroll) return window.scrollY;
    return scrollContainer?.scrollTop ?? 0;
  }

  function setScrollTop(value: number): void {
    if (scrollContainer && 'smoothScrolling' in scrollContainer.dataset) return;
    _programmaticScroll = true;
    if (isWindowScroll) { window.scrollTo(0, value); }
    else if (scrollContainer) { scrollContainer.scrollTop = value; }
  }

  function getCanvasTopInContainer(): number {
    if (!canvasEl || !scrollContainer) return 0;
    const canvasTop = canvasEl.getBoundingClientRect().top;
    const containerTop = isWindowScroll ? 0 : scrollContainer.getBoundingClientRect().top + (scrollContainer.clientTop || 0);
    return canvasTop - containerTop + getScrollTop();
  }

  function sumEstimate(from: number, to: number): number {
    if (to <= from) return 0;
    return tree.prefixSum(to) - tree.prefixSum(from);
  }

  function key(i: number): string {
    return getKey(items[i], i);
  }

  function refEl(i: number): HTMLElement | undefined {
    if (i < 0 || i >= items.length) return undefined;
    return itemRefs.get(key(i));
  }

  function growCanvas(min: number): void {
    if (min > canvasHeight) canvasHeight = min;
  }

  function hasBelowCanvasContent(): boolean {
    if (!scrollContainer || !canvasEl) return false;
    const sh = isWindowScroll ? document.documentElement.scrollHeight : scrollContainer.scrollHeight;
    const listOffset = getCanvasTopInContainer();
    return sh - listOffset - canvasEl.offsetHeight > 100;
  }

  function requiredCanvasHeight(): number {
    const contentBottom = B + downOffset + (downBlockEl?.offsetHeight ?? 0) + sumEstimate(rangeEnd, items.length);
    if (rangeEnd >= items.length && rangeEnd > rangeStart) {
      return Math.max(contentBottom, B);
    }
    const st = scrollContainer ? getScrollTop() : lastKnownScrollTop;
    const listOffset = getCanvasTopInContainer();
    return Math.max(tree.total, contentBottom, st - listOffset + viewportHeight);
  }

  function applyRange(newStart: number, newEnd: number): void {
    newStart = Math.max(0, Math.min(newStart, items.length));
    newEnd = Math.max(newStart, Math.min(newEnd, items.length));
    const oldStart = rangeStart;
    const oldEnd = rangeEnd;
    if (newStart === oldStart && newEnd === oldEnd) return;

    const p = pivotIndex;
    const oldDownHead = Math.max(oldStart, p);
    const newDownHead = Math.max(newStart, p);
    const oldUpTail = Math.min(oldEnd, p);
    const newUpTail = Math.min(newEnd, p);
    const downHeadDelta = newDownHead - oldDownHead;
    const upTailDelta = newUpTail - oldUpTail;
    const upBecomesNonEmpty = oldUpTail <= oldStart && newUpTail > newStart;
    const foldSeamOffset = () => {
      if (upBecomesNonEmpty && downOffset !== 0) {
        B += downOffset;
        downOffset = 0;
        growCanvas(requiredCanvasHeight());
        flushSync();
      }
    };

    if (downHeadDelta === 0 && upTailDelta === 0) {
      rangeStart = newStart;
      rangeEnd = newEnd;
      foldSeamOffset();
      return;
    }

    if (upTailDelta !== 0) {
      rebuildAtView();
      return;
    }

    const anchorIdx = Math.max(oldDownHead, newDownHead);
    if (anchorIdx >= newEnd || anchorIdx >= oldEnd || !refEl(anchorIdx)) {
      rebuildAtView();
      return;
    }
    if (downHeadDelta > 0) {
      const headEl = refEl(oldDownHead);
      const survivorEl = refEl(newDownHead);
      if (headEl && survivorEl) {
        downOffset += survivorEl.getBoundingClientRect().top - headEl.getBoundingClientRect().top;
      } else {
        downOffset += sumEstimate(oldDownHead, newDownHead);
      }
    } else {
      downOffset -= sumEstimate(newDownHead, oldDownHead);
    }

    const anchorEl = refEl(anchorIdx);
    const y0 = anchorEl?.getBoundingClientRect().top;

    rangeStart = newStart;
    rangeEnd = newEnd;
    flushSync();

    if (anchorEl && y0 != null && anchorEl.isConnected) {
      const residual = anchorEl.getBoundingClientRect().top - y0;
      if (residual !== 0) {
        downOffset -= residual;
        flushSync();
      }
    }
    foldSeamOffset();
  }

  function rebuildAtView(anchorOverride?: { key: string; y0: number } | null): void {
    if (!scrollContainer || items.length === 0) return;
    const st = getScrollTop();
    const listOffset = getCanvasTopInContainer();
    const viewTop = st - listOffset;

    let anchorKey: string | null;
    let anchorY0: number | undefined;
    if (anchorOverride) {
      anchorKey = anchorOverride.key;
      anchorY0 = anchorOverride.y0;
    } else {
      const anchorIdx = findViewportAnchorIndex();
      anchorKey = anchorIdx != null ? key(anchorIdx) : null;
      anchorY0 = anchorKey != null ? itemRefs.get(anchorKey)?.getBoundingClientRect().top : undefined;
    }

    const isSmoothFlight = 'smoothScrolling' in scrollContainer.dataset;
    const logicalTop = isSmoothFlight ? Math.max(0, viewTop) : Math.max(0, viewTop - headroom());
    const approxIndex = Math.max(0, Math.min(items.length - 1, tree.findIndex(logicalTop)));
    const avg = getAverageHeight();
    const buf = Math.ceil(getEffectiveBufferPx() / avg);
    const viewItems = Math.ceil(viewportHeight / avg);
    const pivotIdx = Math.min(items.length - 1, approxIndex + viewItems + Math.ceil(buf / 2));
    setPivot(pivotIdx, isSmoothFlight ? tree.prefixSum(pivotIdx) : Math.max(0, viewTop) + topMargin + sumEstimate(approxIndex, pivotIdx));
    rangeStart = Math.max(0, approxIndex - buf);
    rangeEnd = Math.min(items.length, Math.max(pivotIdx + 2, approxIndex + buf + SCROLLTO_EXTRA_BUFFER));
    growCanvas(tree.total + Math.max(0, viewTop + viewportHeight - tree.total));
    flushSync();

    if (isSmoothFlight) return;

    if (anchorKey != null && anchorY0 != null) {
      const el = itemRefs.get(anchorKey);
      if (el && el.isConnected) {
        const residual = el.getBoundingClientRect().top - anchorY0;
        if (residual !== 0) {
          B -= residual;
          growCanvas(requiredCanvasHeight());
          flushSync();
        }
      }
    }
  }

  function setPivot(index: number, canvasY: number): void {
    pivotIndex = index;
    pivotKey = index >= 0 && index < items.length ? key(index) : '';
    B = canvasY;
    downOffset = 0;
  }

  function renderedEdges(): { top: number; bottom: number } | null {
    if (rangeEnd <= rangeStart || !canvasEl) return null;
    const canvasTop = canvasEl.getBoundingClientRect().top;
    const firstEl = refEl(rangeStart);
    const lastEl = refEl(rangeEnd - 1);
    if (!firstEl || !lastEl) return null;
    return {
      top: firstEl.getBoundingClientRect().top - canvasTop,
      bottom: lastEl.getBoundingClientRect().bottom - canvasTop,
    };
  }

  function processScroll(): void {
    frameQueued = false;
    if (pendingEpochBump) {
      pendingEpochBump = false;
      measuredEpoch++;
    }
    if (deferRestoreExpansion) {
      deferRestoreExpansion = false;
      frameQueued = true;
      requestAnimationFrame(processScroll);
      return;
    }
    if (!scrollContainer || !canvasEl || items.length === 0 || isNavigating || effectivePaused) return;

    const containerTop = isWindowScroll ? 0 : scrollContainer.getBoundingClientRect().top + (scrollContainer.clientTop || 0);

    if (restoreLock) {
      const el = itemRefs.get(restoreLock.key);
      if (!el || !el.isConnected) {
        restoreLock = null;
      } else {
        const drift = el.getBoundingClientRect().top - containerTop - restoreLock.y;
        if (Math.abs(drift) >= 1) {
          setScrollTop(getScrollTop() + drift);
        }
      }
    }

    const st = getScrollTop();
    const canvasTop = canvasEl.getBoundingClientRect().top;
    const listOffset = canvasTop - containerTop + st;
    const viewTop = st - listOffset;
    const buf = getEffectiveBufferPx();
    const wantTop = viewTop - buf;
    const wantBottom = viewTop + viewportHeight + buf;
    const dropTop = wantTop - buf * 0.5;
    const dropBottom = wantBottom + buf * 0.5;
    const avg = getAverageHeight();

    const count = rangeEnd - rangeStart;
    if (frameTops.length < count) {
      frameTops = new Array(count);
      frameBottoms = new Array(count);
    }
    let firstIdx = -1;
    let lastIdx = -1;
    for (let i = 0; i < count; i++) {
      const el = refEl(rangeStart + i);
      if (!el) {
        frameTops[i] = NaN;
        frameBottoms[i] = NaN;
        continue;
      }
      const r = el.getBoundingClientRect();
      frameTops[i] = r.top - canvasTop;
      frameBottoms[i] = r.bottom - canvasTop;
      if (firstIdx === -1) firstIdx = i;
      lastIdx = i;
    }
    const renderedTop = firstIdx >= 0 ? frameTops[firstIdx] : B + downOffset;
    const renderedBottom = lastIdx >= 0 ? frameBottoms[lastIdx] : B + downOffset;

    let ns = rangeStart;
    let ne = rangeEnd;

    if (renderedTop > wantTop && ns > 0) {
      ns = Math.max(0, ns - Math.max(1, Math.ceil((renderedTop - wantTop) / avg)));
    } else if (renderedTop < dropTop && ns < rangeEnd) {
      let c = 0;
      for (let i = 0; i < count; i++) {
        if (Number.isNaN(frameBottoms[i])) break;
        if (frameBottoms[i] < dropTop) c++;
        else break;
      }
      ns = Math.min(rangeEnd, ns + c);
    }

    if (renderedBottom < wantBottom && ne < items.length) {
      ne = Math.min(items.length, ne + Math.max(1, Math.ceil((wantBottom - renderedBottom) / avg)));
    } else if (renderedBottom > dropBottom && ne > ns) {
      let c = 0;
      for (let i = count - 1; i >= 0; i--) {
        if (Number.isNaN(frameTops[i])) break;
        if (frameTops[i] > dropBottom) c++;
        else break;
      }
      ne = Math.max(ns, ne - c);
    }

    if (count > 0) {
      let vs = rangeStart;
      for (let i = 0; i < count; i++) {
        if (Number.isNaN(frameBottoms[i])) continue;
        vs = rangeStart + i;
        if (frameBottoms[i] > viewTop) break;
      }
      let ve = vs;
      for (let i = count - 1; i >= vs - rangeStart; i--) {
        if (Number.isNaN(frameTops[i])) continue;
        ve = rangeStart + i;
        if (frameTops[i] < viewTop + viewportHeight) break;
      }
      visibleStart = vs;
      visibleEnd = ve;

      const anchorLimit = viewTop + topMargin - 1;
      for (let i = 0; i < count; i++) {
        if (Number.isNaN(frameTops[i])) continue;
        if (frameTops[i] >= anchorLimit) {
          lastKnownAnchorIndex = rangeStart + i;
          lastKnownVisualY = frameTops[i] - viewTop;
          break;
        }
      }

    }

    const measuredHeadroom = renderedTop - sumEstimate(0, rangeStart);
    const prevRs = rangeStart;
    const prevRe = rangeEnd;
    applyRange(ns, ne);
    if (rangeStart < Math.min(rangeEnd, pivotIndex) && downOffset !== 0) {
      B += downOffset;
      downOffset = 0;
      flushSync();
    }
    growCanvas(requiredCanvasHeight());
    const rangeChanged = rangeStart !== prevRs || rangeEnd !== prevRe;
    if (!rangeChanged && rangeEnd >= items.length && rangeEnd > rangeStart && !hasBelowCanvasContent()) {
      const req = requiredCanvasHeight();
      if (canvasHeight > req + 1) canvasHeight = req;
    }
    if (st - listOffset < viewportHeight * 2 && Math.abs(measuredHeadroom) >= 1) {
      recenter();
    }
    scheduleSettlement();
    if (rangeChanged && !frameQueued) {
      frameQueued = true;
      requestAnimationFrame(processScroll);
    }

    lastValidScrollContainer = scrollContainer;
    lastKnownScrollTop = st;
    if (pendingTopStill && viewTop > viewportHeight) pendingTopStill = false;

    onScroll?.();
    onRangeChange?.({ start: rangeStart, end: rangeEnd });
  }

  function isCvAuto(index: number, _epoch: number): boolean {
    const margin = Math.max(CV_CORE_MARGIN, Math.ceil(getEffectiveBufferPx() / getAverageHeight()));
    if (index >= visibleStart - margin && index <= visibleEnd + margin) return false;
    return tree.isMeasured(index);
  }

  function findViewportAnchorIndex(): number | null {
    if (!scrollContainer || !canvasEl) return null;
    const containerTop = isWindowScroll ? 0 : scrollContainer.getBoundingClientRect().top;
    const headerBottom = containerTop + topMargin;
    for (let i = rangeStart; i < rangeEnd; i++) {
      const el = refEl(i);
      if (el && el.getBoundingClientRect().top >= headerBottom - 1) return i;
    }
    return null;
  }

  function headroom(): number {
    const edges = renderedEdges();
    const renderedTop = edges ? edges.top : B + downOffset;
    return renderedTop - sumEstimate(0, rangeStart);
  }

  function recenter(): boolean {
    if (!scrollContainer || isNavigating) return false;
    if ('smoothScrolling' in scrollContainer.dataset) return false;
    if (!renderedEdges()) return false;
    const gap = Math.round(headroom());
    if (Math.abs(gap) < 1) return false;
    const st = getScrollTop();
    if (st <= topMargin && (gap > 0 || refreshToTop || !pendingTopStill)) {
      B -= gap;
      canvasHeight = Math.max(requiredCanvasHeight(), canvasHeight - gap);
      pendingTopStill = false;
      return true;
    }
    const delta = Math.max(-gap, -st);
    B += delta;
    canvasHeight = Math.max(requiredCanvasHeight(), canvasHeight + delta);
    flushSync();
    setScrollTop(st + delta);
    pendingTopStill = false;
    return true;
  }

  function isUserInteracting(): boolean {
    const now = Date.now();
    if (now - lastTouchTime < 300) return true;
    if (now - lastUserScrollTime < SETTLE_IDLE_MS) return true;
    if (!scrollContainer) return false;
    const st = getScrollTop();
    if (st < 0) return true;
    const maxScroll = (isWindowScroll ? document.documentElement.scrollHeight - window.innerHeight : scrollContainer.scrollHeight - scrollContainer.clientHeight);
    if (st > maxScroll) return true;
    return false;
  }

  function scheduleSettlement(): void {
    if (settlementId !== null) return;
    settlementId = (typeof requestIdleCallback !== 'undefined')
      ? requestIdleCallback(processSettlement, { timeout: 1000 })
      : setTimeout(processSettlement, SETTLE_IDLE_MS) as unknown as number;
  }

  function cancelSettlement(): void {
    if (settlementId !== null) {
      if (typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(settlementId);
      else clearTimeout(settlementId);
      settlementId = null;
    }
  }

  function processSettlement(): void {
    settlementId = null;
    if (!scrollContainer || isNavigating || effectivePaused) return;
    if (isUserInteracting()) {
      scheduleSettlement();
      return;
    }
    const st = getScrollTop();
    if (st - getCanvasTopInContainer() < viewportHeight * 2 && Math.abs(headroom()) >= 1) {
      recenter();
    }
    if (!hasBelowCanvasContent()) {
      const required = requiredCanvasHeight();
      if (canvasHeight > required + viewportHeight) {
        canvasHeight = required;
      }
    }
  }

  function handleScrollEvent(): void {
    if (_programmaticScroll) {
      _programmaticScroll = false;
    } else {
      lastUserScrollTime = Date.now();
      lastUserActivityTime = lastUserScrollTime;
      restoreLock = null;
    }
    if (!frameQueued) {
      frameQueued = true;
      requestAnimationFrame(processScroll);
    }
  }

  function handleUserInput(): void {
    lastUserScrollTime = Date.now();
    lastUserActivityTime = lastUserScrollTime;
    restoreLock = null;
  }

  function handleTouch(): void {
    lastTouchTime = Date.now();
    lastUserScrollTime = Date.now();
    lastUserActivityTime = lastUserScrollTime;
    restoreLock = null;
  }

  function handleScrollEnd(): void {
    lastUserScrollTime = 0;
    lastTouchTime = 0;
    cancelSettlement();
    processSettlement();
  }

  function handleResizeEntries(entries: ResizeObserverEntry[]): void {
    if (isDocumentHidden) return;
    let changed = false;
    let downAboveDelta = 0;
    let upBelowDelta = 0;
    let anchorIdx: number | null | undefined = undefined;
    const recentScroll = Date.now() - lastUserActivityTime < RESIZE_RECENT_SCROLL_MS;
    let gazeLine: number | undefined = undefined;
    const getGazeLine = (): number => {
      if (gazeLine === undefined) {
        const containerTop = isWindowScroll ? 0 : (scrollContainer?.getBoundingClientRect().top ?? 0);
        gazeLine = containerTop + topMargin + (viewportHeight - topMargin) * 0.5;
      }
      return gazeLine;
    };
    let flexHints: Map<Element, number> | null = null;
    for (const entry of entries) {
      const el = entry.target as HTMLElement;
      if (el.dataset.virtualKey !== undefined || el.dataset.vlFlex === undefined) continue;
      const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
      if (h <= 0) continue;
      const prev = lastDeliveredHeights.get(el);
      lastDeliveredHeights.set(el, h);
      if (prev === undefined || h === prev) continue;
      const item = el.closest('.virtual-item');
      if (!item) continue;
      if (!flexHints) flexHints = new Map();
      flexHints.set(item, el.getBoundingClientRect().bottom - (h - prev));
    }
    for (const entry of entries) {
      const el = entry.target as HTMLElement;
      const k = el.dataset.virtualKey;
      if (!k) continue;
      const h = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
      if (h <= 0) continue;
      const idx = findIndexForKey(k);
      if (idx === undefined || idx >= tree.length) continue;
      const w = entry.borderBoxSize?.[0]?.inlineSize ?? entry.contentRect.width;
      if (w > 0) lastKnownCanvasWidth = w;
      const prevDelivered = lastDeliveredHeights.get(el);
      lastDeliveredHeights.set(el, h);
      const wasMeasured = tree.isMeasured(idx);
      const old = wasMeasured ? tree.get(idx) : undefined;
      if (old !== undefined && Math.abs(old - h) < HEIGHT_CHANGE_THRESHOLD) continue;
      tree.setMeasured(idx, h);
      changed = true;
      if (!wasMeasured) pendingEpochBump = true;
      const flexChildren = el.querySelectorAll('[data-vl-flex]');
      for (let i = 0; i < flexChildren.length; i++) {
        const child = flexChildren[i];
        if (!observedFlexChildren.has(child)) {
          observedFlexChildren.add(child);
          lastDeliveredHeights.set(child, child.getBoundingClientRect().height);
          resizeObserver?.observe(child);
        }
      }
      if (prevDelivered === undefined || isNavigating) continue;
      if (anchorIdx === undefined) anchorIdx = findViewportAnchorIndex();
      if (anchorIdx === null) continue;
      let absorbAbove: boolean;
      const hintBottom = flexHints?.get(el);
      if (hintBottom !== undefined) {
        absorbAbove = hintBottom <= getGazeLine();
      } else if (recentScroll && (idx === anchorIdx || idx === anchorIdx - 1)) {
        const preChangeBottom = el.getBoundingClientRect().bottom - (h - prevDelivered);
        absorbAbove = preChangeBottom <= getGazeLine();
      } else {
        absorbAbove = idx < anchorIdx;
      }
      if (absorbAbove && idx >= pivotIndex) {
        downAboveDelta += h - prevDelivered;
      } else if (!absorbAbove && idx < pivotIndex) {
        upBelowDelta += h - prevDelivered;
      }
    }
    if (downAboveDelta !== 0 || upBelowDelta !== 0) {
      B += upBelowDelta - downAboveDelta;
      growCanvas(requiredCanvasHeight());
      flushSync();
    }
    if (changed && !effectivePaused) {
      growCanvas(requiredCanvasHeight());
      if (!frameQueued) {
        frameQueued = true;
        requestAnimationFrame(processScroll);
      }
    }
  }

  function findIndexForKey(k: string): number | undefined {
    for (let i = rangeStart; i < rangeEnd; i++) {
      if (key(i) === k) return i;
    }
    return undefined;
  }

  function detectPrependShift(firstKey: string, prevKey: string): number {
    if (!prevKey || firstKey === prevKey) return 0;
    const limit = Math.min(items.length, PREPEND_SEARCH_LIMIT);
    for (let i = 1; i < limit; i++) {
      if (key(i) === prevKey) return i;
    }
    return 0;
  }

  function reconcileTreeLength(): void {
    const len = items.length;
    const avg = getAverageHeight();
    if (tree.length > len) {
      tree.truncate(len, avg);
    } else if (tree.length < len) {
      tree.extendWithCallback(len - tree.length, () => avg);
    }
  }

  function handleItemsClear(): void {
    tree.clear();
    pivotIndex = 0;
    pivotKey = '';
    B = 0;
    downOffset = 0;
    rangeStart = 0;
    rangeEnd = 0;
    canvasHeight = 0;
    prevItemCount = 0;
    prevFirstKey = '';
    prevLastKey = '';
    restoreLock = null;
  }

  function handleItemsInitial(): void {
    const avg = getAverageHeight();
    tree.buildWithCallback(items.length, () => avg);
    setPivot(0, 0);
    rangeStart = 0;
    rangeEnd = initialScrollState && !hasRestoredScroll ? 0 : Math.min(items.length, initialRenderCount());
    canvasHeight = Math.max(tree.total, initialScrollState?.scrollTop != null ? initialScrollState.scrollTop + 1000 : 0);
  }

  function initialRenderCount(): number {
    if (viewportHeight > 0) {
      return Math.ceil((viewportHeight + getEffectiveBufferPx()) / getAverageHeight()) + 1;
    }
    return FALLBACK_RENDER_COUNT;
  }

  function handleItemsAppend(oldCount: number): void {
    tree.extendWithCallback(items.length - oldCount, () => getAverageHeight());
    growCanvas(tree.total);
  }

  function handlePrepend(shiftCount: number): void {
    tree.prependWithCallback(shiftCount, () => getAverageHeight());
    pivotIndex += shiftCount;
    rangeStart += shiftCount;
    rangeEnd = Math.min(items.length, rangeEnd + shiftCount);
    reconcileTreeLength();
    growCanvas(tree.total);

    if (scrollContainer && refreshToTop && getScrollTop() <= topMargin && !isNavigating) {
      setPivot(0, 0);
      rangeStart = 0;
      rangeEnd = Math.min(items.length, initialRenderCount());
      canvasHeight = Math.max(tree.total, getScrollTop() - getCanvasTopInContainer() + viewportHeight);
    } else {
      if (scrollContainer && !refreshToTop && getScrollTop() <= topMargin && !isNavigating) {
        pendingTopStill = true;
      }
      scheduleSettlement();
    }
  }

  function handleItemsGenericChange(): void {
    realignTreeByKey();
    if (rangeEnd > items.length) rangeEnd = items.length;
    if (rangeStart > rangeEnd) rangeStart = Math.max(0, rangeEnd - 1);
    const resolved = resolvePivotKey();
    if (!resolved) {
      const aIdx = findViewportAnchorIndex();
      const aKey = aIdx != null ? key(aIdx) : null;
      const aY0 = aKey != null ? itemRefs.get(aKey)?.getBoundingClientRect().top : undefined;
      const anchor = aKey != null && aY0 !== undefined ? { key: aKey, y0: aY0 } : null;
      queueMicrotask(() => {
        if (scrollContainer) rebuildAtView(anchor);
      });
      return;
    }
    growCanvas(tree.total);
  }

  function realignTreeByKey(): void {
    const n = items.length;
    if (prevKeys.length === 0) {
      reconcileTreeLength();
      return;
    }
    const oldIndexByKey = new Map<string, number>();
    for (let i = 0; i < prevKeys.length; i++) oldIndexByKey.set(prevKeys[i], i);
    const avg = getAverageHeight();
    const heights = new Array(n);
    const measured = new Array(n);
    for (let j = 0; j < n; j++) {
      const oldIdx = oldIndexByKey.get(key(j));
      if (oldIdx !== undefined && oldIdx < tree.length && tree.isMeasured(oldIdx)) {
        heights[j] = tree.get(oldIdx);
        measured[j] = true;
      } else {
        heights[j] = avg;
        measured[j] = false;
      }
    }
    tree.buildWithMeasured(n, (j) => heights[j], (j) => measured[j]);
  }

  function resolvePivotKey(): boolean {
    if (!pivotKey) return items.length === 0;
    if (pivotIndex < items.length && key(pivotIndex) === pivotKey) return true;
    const searchRadius = 50;
    for (let d = 1; d <= searchRadius; d++) {
      const lo = pivotIndex - d;
      const hi = pivotIndex + d;
      if (lo >= 0 && lo < items.length && key(lo) === pivotKey) {
        pivotIndex = lo;
        return true;
      }
      if (hi >= 0 && hi < items.length && key(hi) === pivotKey) {
        pivotIndex = hi;
        return true;
      }
    }
    for (let i = 0; i < items.length; i++) {
      if (key(i) === pivotKey) {
        pivotIndex = i;
        return true;
      }
    }
    return false;
  }

  $effect.pre(() => {
    const len = items.length;
    void items;

    untrack(() => {
      const firstKey = len > 0 ? key(0) : '';
      const lastKey = len > 0 ? key(len - 1) : '';
      const oldCount = prevItemCount;
      const oldFirstKey = prevFirstKey;
      const oldLastKey = prevLastKey;

      prevItemCount = len;
      prevFirstKey = firstKey;
      prevLastKey = lastKey;

      const change = classifyItemChange(len, firstKey, lastKey, oldCount, oldFirstKey, oldLastKey, {
        detectPrependShift,
        getKeyAt: (i: number) => key(i),
      });

      switch (change.type) {
        case 'clear': handleItemsClear(); break;
        case 'initial': handleItemsInitial(); break;
        case 'append': handleItemsAppend(change.oldCount); break;
        case 'unchanged': break;
        case 'generic': handleItemsGenericChange(); break;
        case 'prependFullReset': handleItemsGenericChange(); break;
        case 'prepend': handlePrepend(change.shiftCount); break;
      }

      if (change.type !== 'unchanged') {
        prevKeys = Array.from({ length: len }, (_, i) => key(i));
        if (!frameQueued) {
          frameQueued = true;
          requestAnimationFrame(processScroll);
        }
      }
    });
  });

  $effect(() => {
    void rangeStart;
    void rangeEnd;
    if (!isNavigating) {
      onRangeChange?.({ start: rangeStart, end: rangeEnd });
    }
  });

  $effect(() => {
    if (!effectivePaused && scrollContainer && !frameQueued) {
      frameQueued = true;
      requestAnimationFrame(processScroll);
    }
  });

  $effect(() => {
    if (typeof document === 'undefined') return;
    const handler = () => {
      isDocumentHidden = document.hidden;
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  });

  $effect(() => {
    void items.length;
    if (scrollContainer && initialScrollState && !hasRestoredScroll && items.length > 0 && viewportHeight > 0) {
      untrack(() => {
        if (!restoreScrollState(initialScrollState!)) {
          restoreDeferred = true;
          if (rangeStart === 0 && rangeEnd === 0) {
            rangeEnd = Math.min(items.length, initialRenderCount());
          }
        }
      });
    }
  });

  function findTargetIndex(state: ScrollState): number {
    let targetIdx = state.index;
    if (state.key && items.length > 0) {
      const currentKey = targetIdx >= 0 && targetIdx < items.length ? key(targetIdx) : '';
      if (currentKey !== state.key) {
        for (let i = 0; i < items.length; i++) {
          if (key(i) === state.key) { targetIdx = i; break; }
        }
      }
    }
    return targetIdx;
  }

  export function scrollToIndex(index: number, options: ScrollToIndexOptions = {}): void {
    if (!scrollContainer || index < 0 || index >= items.length) return;
    const { align = 'start', offset = 0 } = options;

    restoreLock = null;
    isNavigating = true;
    const listOffset = getCanvasTopInContainer();
    const targetCanvasY = Math.max(0, tree.prefixSum(index));
    setPivot(index, targetCanvasY);
    const buf = Math.ceil(getEffectiveBufferPx() / getAverageHeight());
    rangeStart = Math.max(0, index - buf);
    rangeEnd = Math.min(items.length, index + buf + SCROLLTO_EXTRA_BUFFER);
    const naiveTarget = targetCanvasY + listOffset - topMargin + offset;
    growCanvas(Math.max(tree.total, naiveTarget + viewportHeight));

    tick().then(() => {
      let target = naiveTarget;
      if (align !== 'start') {
        const el = refEl(index);
        const h = el ? el.getBoundingClientRect().height : getAverageHeight();
        const usable = viewportHeight - topMargin;
        if (align === 'center') target = targetCanvasY + listOffset - topMargin - usable / 2 + h / 2 + offset;
        if (align === 'end') target = targetCanvasY + listOffset - topMargin - usable + h + offset;
      }
      setScrollTop(Math.max(0, target));
      isNavigating = false;
      if (!frameQueued) {
        frameQueued = true;
        requestAnimationFrame(processScroll);
      }
    });
  }

  export function restoreScrollState(state: ScrollState): boolean {
    if (!state || !scrollContainer) return false;

    const savedWidth = state.heightsWidth ?? 0;
    const currentWidth = canvasEl?.clientWidth || lastKnownCanvasWidth;
    const heightsUsable = !!state.heights && state.heights.length > 0 &&
      (savedWidth <= 0 || currentWidth <= 0 || Math.abs(currentWidth - savedWidth) <= 1);
    if (heightsUsable) {
      const keyToHeight = new Map<string, number>();
      let heightSum = 0;
      for (const [k, v] of state.heights) {
        keyToHeight.set(k, v);
        heightSum += v;
      }
      const avg = keyToHeight.size > 0 ? heightSum / keyToHeight.size : getAverageHeight();
      tree.buildWithMeasured(
        items.length,
        (i) => keyToHeight.get(key(i)) ?? avg,
        (i) => keyToHeight.has(key(i))
      );
    } else {
      reconcileTreeLength();
    }

    const targetIdx = findTargetIndex(state);
    if (targetIdx < 0 || targetIdx >= items.length) return false;

    hasRestoredScroll = true;
    isNavigating = true;
    const savedScrollTop = Math.max(0, state.scrollTop ?? tree.prefixSum(targetIdx));
    const listOffset = getCanvasTopInContainer();
    const visualY = state.visualY ?? (topMargin - (state.offset ?? 0));
    const targetCanvasY = savedScrollTop - listOffset + visualY;
    setPivot(targetIdx, Math.max(0, targetCanvasY));
    const avg = getAverageHeight();
    const upCount = Math.ceil(Math.max(0, visualY) / avg) + 1;
    const downCount = Math.ceil(Math.max(0, viewportHeight - visualY) / avg) + 1;
    rangeStart = Math.max(0, targetIdx - upCount);
    rangeEnd = Math.min(items.length, targetIdx + downCount);
    growCanvas(Math.max(tree.total, savedScrollTop + viewportHeight));
    deferRestoreExpansion = true;

    tick().then(() => {
      setScrollTop(savedScrollTop);
      isNavigating = false;
      restoreLock = { key: key(targetIdx), y: visualY };
      if (!frameQueued) {
        frameQueued = true;
        requestAnimationFrame(processScroll);
      }
    });
    return true;
  }

  export function getScrollInfo(): { scrollTop: number; viewportHeight: number; totalHeight: number; distanceFromBottom: number } {
    const st = getScrollTop();
    if (scrollContainer) {
      const sh = isWindowScroll ? document.documentElement.scrollHeight : scrollContainer.scrollHeight;
      const ch = isWindowScroll ? window.innerHeight : scrollContainer.clientHeight;
      return { scrollTop: st, viewportHeight: ch, totalHeight: sh, distanceFromBottom: sh - st - ch };
    }
    return { scrollTop: st, viewportHeight, totalHeight: canvasHeight, distanceFromBottom: canvasHeight - st - viewportHeight };
  }

  function captureScrollState(includeHeights: boolean): ScrollState | null {
    if (items.length === 0) return null;
    const container = scrollContainer ?? lastValidScrollContainer;
    const connected = !!container && container.isConnected;
    const currentScrollTop = connected && scrollContainer ? getScrollTop() : lastKnownScrollTop;
    const anchorIdx = connected && scrollContainer ? (findViewportAnchorIndex() ?? lastKnownAnchorIndex) : lastKnownAnchorIndex;
    const idx = Math.max(0, Math.min(items.length - 1, anchorIdx));
    const k = key(idx);

    let visualY: number | undefined;
    let offset = 0;
    if (container && connected) {
      const el = itemRefs.get(k);
      if (el && el.isConnected) {
        const isWin = container === document.documentElement || container === document.body;
        const containerTop = isWin ? 0 : container.getBoundingClientRect().top + (container.clientTop || 0);
        visualY = el.getBoundingClientRect().top - containerTop;
        offset = topMargin - visualY;
      }
    }
    if (visualY === undefined && lastKnownVisualY !== undefined) {
      visualY = lastKnownVisualY;
      offset = topMargin - visualY;
    }

    const heightsArray: [string, number][] = [];
    if (includeHeights) {
      const limit = Math.min(items.length, tree.length);
      for (let i = 0; i < limit; i++) {
        if (tree.isMeasured(i)) heightsArray.push([key(i), tree.get(i)]);
      }
    }

    return {
      index: idx,
      key: k,
      offset,
      heights: heightsArray,
      ...(includeHeights ? { heightsWidth: (canvasEl?.clientWidth || lastKnownCanvasWidth) } : {}),
      scrollTop: currentScrollTop,
      visualY,
    };
  }

  export function getScrollState(): ScrollState | null {
    return captureScrollState(true);
  }

  export function getScrollStateLightweight(): ScrollState | null {
    return captureScrollState(false);
  }

  export function getPositionForIndex(index: number): number {
    if (index < 0 || index >= items.length) return 0;
    return tree.prefixSum(index);
  }

  export function getTreeDiagnostics(): { total: number; length: number; measuredCount: number; averageHeight: number } {
    return { total: tree.total, length: tree.length, measuredCount: tree.measuredCount, averageHeight: getAverageHeight() };
  }

  export function getLayoutDiagnostics(): {
    pivotIndex: number; B: number; downOffset: number;
    canvasHeight: number; rangeStart: number; rangeEnd: number; headroom: number;
    topGap: number; bottomGap: number;
  } {
    const edges = renderedEdges();
    const renderedTop = edges ? edges.top : B + downOffset;
    const renderedBottom = edges ? edges.bottom : B + downOffset;
    return {
      pivotIndex, B, downOffset, canvasHeight, rangeStart, rangeEnd,
      headroom: headroom(),
      topGap: renderedTop,
      bottomGap: canvasHeight - renderedBottom,
    };
  }

  export function getHeightSnapshot(): { width: number; entries: [string, number][] } {
    const entries: [string, number][] = [];
    const limit = Math.min(items.length, tree.length);
    for (let i = 0; i < limit; i++) {
      if (tree.isMeasured(i)) entries.push([key(i), tree.get(i)]);
    }
    return { width: canvasEl?.clientWidth || lastKnownCanvasWidth, entries };
  }

  export function prepareForIndex(index: number): void {
    if (index < 0 || index >= items.length) return;
    if (index < rangeStart || index >= rangeEnd) {
      const buf = Math.ceil(getEffectiveBufferPx() / getAverageHeight());
      applyRange(Math.min(rangeStart, Math.max(0, index - buf)), Math.max(rangeEnd, Math.min(items.length, index + buf + 1)));
      growCanvas(requiredCanvasHeight());
    }
  }

  export function getItemElement(index: number): HTMLElement | undefined {
    if (index < 0 || index >= items.length) return undefined;
    return itemRefs.get(key(index));
  }

  function itemAttach(k: string) {
    return (element: HTMLElement) => {
      element.dataset.virtualKey = k;
      if (element.style.contentVisibility === 'auto') {
        const intrinsic = /auto (\d+(?:\.\d+)?)px/.exec(element.style.getPropertyValue('contain-intrinsic-block-size'));
        if (intrinsic) lastDeliveredHeights.set(element, Number(intrinsic[1]));
      }
      resizeObserver?.observe(element);
      const flexChildren = element.querySelectorAll('[data-vl-flex]');
      for (let i = 0; i < flexChildren.length; i++) {
        observedFlexChildren.add(flexChildren[i]);
        resizeObserver?.observe(flexChildren[i]);
      }
      itemRefs.set(k, element);
      return () => {
        resizeObserver?.unobserve(element);
        for (let i = 0; i < flexChildren.length; i++) resizeObserver?.unobserve(flexChildren[i]);
        if (itemRefs.get(k) === element) itemRefs.delete(k);
      };
    };
  }

  function scrollContainerAttach(_element: HTMLElement) {
    resizeObserver = new ResizeObserver(handleResizeEntries);
    lastValidScrollContainer = scrollContainer ?? null;
    lastKnownScrollTop = getScrollTop();

    const scrollTarget = isWindowScroll ? window : scrollContainer!;
    scrollTarget.addEventListener('scroll', handleScrollEvent, { passive: true });
    scrollTarget.addEventListener('scrollend', handleScrollEnd, { passive: true });
    scrollTarget.addEventListener('wheel', handleUserInput, { passive: true });
    scrollTarget.addEventListener('pointerdown', handleUserInput, { passive: true });
    scrollTarget.addEventListener('touchstart', handleTouch, { passive: true });
    scrollTarget.addEventListener('touchmove', handleTouch, { passive: true });
    scrollTarget.addEventListener('touchend', handleTouch, { passive: true });

    let extraCleanup: (() => void) | undefined;

    if (isWindowScroll) {
      viewportHeight = window.innerHeight;
      const handleResize = () => {
        const newHeight = window.innerHeight;
        if (newHeight !== viewportHeight && newHeight > 0) viewportHeight = newHeight;
      };
      window.addEventListener('resize', handleResize, { passive: true });
      extraCleanup = () => window.removeEventListener('resize', handleResize);
    } else {
      viewportHeight = scrollContainer!.clientHeight;
      const containerObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newHeight = entry.contentRect.height;
          if (newHeight !== viewportHeight && newHeight > 0) viewportHeight = newHeight;
        }
      });
      containerObserver.observe(scrollContainer!);
      extraCleanup = () => containerObserver.disconnect();
    }

    return () => {
      cancelSettlement();
      if (resizeObserver) {
        resizeObserver.disconnect();
        resizeObserver = null;
      }
      scrollTarget.removeEventListener('scroll', handleScrollEvent);
      scrollTarget.removeEventListener('scrollend', handleScrollEnd);
      scrollTarget.removeEventListener('wheel', handleUserInput);
      scrollTarget.removeEventListener('pointerdown', handleUserInput);
      scrollTarget.removeEventListener('touchstart', handleTouch);
      scrollTarget.removeEventListener('touchmove', handleTouch);
      scrollTarget.removeEventListener('touchend', handleTouch);
      extraCleanup?.();
    };
  }

</script>

{#if scrollContainer}
  <div
    class="virtual-list vl-canvas"
    class:virtual-list--restoring={restorePending}
    style:height="{canvasHeight}px"
    bind:this={canvasEl}
    {@attach scrollContainerAttach}
  >
    {#if isVirtualizationEnabled}
      <div class="vl-up" style:bottom="{upBottom}px">
        {#each upIndices as index (getKey(items[index], index))}
          {@const k = getKey(items[index], index)}
          {@const cvAuto = isCvAuto(index, measuredEpoch)}
          <div
            class="virtual-item"
            style:content-visibility={cvAuto ? 'auto' : 'visible'}
            style:contain-intrinsic-block-size={cvAuto ? `auto ${Math.round(tree.get(index))}px` : undefined}
            {@attach itemAttach(k)}
          >
            {@render children(items[index], index)}
          </div>
        {/each}
      </div>
      <div class="vl-down" style:top="{downTop}px" bind:this={downBlockEl}>
        {#each downIndices as index (getKey(items[index], index))}
          {@const k = getKey(items[index], index)}
          {@const cvAuto = isCvAuto(index, measuredEpoch)}
          <div
            class="virtual-item"
            style:content-visibility={cvAuto ? 'auto' : 'visible'}
            style:contain-intrinsic-block-size={cvAuto ? `auto ${Math.round(tree.get(index))}px` : undefined}
            {@attach itemAttach(k)}
          >
            {@render children(items[index], index)}
          </div>
        {/each}
      </div>
    {:else}
      <div class="vl-down" style:top="0px">
        {#each (restorePending ? [] : items.slice(0, FALLBACK_RENDER_COUNT)) as item, index (getKey(item, index))}
          {@const k = getKey(item, index)}
          <div class="virtual-item" {@attach itemAttach(k)}>
            {@render children(item, index)}
          </div>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .vl-canvas {
    position: relative;
    overflow-anchor: auto;
    contain: layout;
  }

  .virtual-list--restoring {
    opacity: 0;
  }

  .vl-up,
  .vl-down {
    position: absolute;
    left: 0;
    right: 0;
    overflow-anchor: none;
  }

  .virtual-item {
    overflow-anchor: none;
  }
</style>
