import type { FenwickTree } from './fenwick';
import type { ScrollState } from './types';

export type ScrollSnapshotData = {
  index: number;
  key?: string;
  offset: number;
  scrollTop?: number;
  visualY?: number;
  legacyScrollTop?: number;
} | null;

export function captureScrollSnapshot(
  getColumnData: () => any | null,
  isSingleColumn: boolean,
): ScrollSnapshotData {
  const colData = getColumnData();
  const s = colData?.scrollState;
  if (s) {
    return { index: s.index, key: s.key, offset: s.offset, scrollTop: s.scrollTop, visualY: s.visualY };
  }
  if (isSingleColumn) {
    return { index: 0, offset: 0, legacyScrollTop: window.scrollY };
  }
  const el = document.querySelector('.modal-page-content') as HTMLElement | null;
  if (!el) return null;
  return { index: 0, offset: 0, legacyScrollTop: el.scrollTop };
}

export function restoreScrollSnapshot(
  value: ScrollSnapshotData,
  getColumnData: () => any | null,
  isSingleColumn: boolean,
): void {
  if (!value) return;
  if (value.legacyScrollTop != null) {
    requestAnimationFrame(() => {
      if (isSingleColumn) {
        window.scrollTo(0, value.legacyScrollTop!);
      } else {
        (document.querySelector('.modal-page-content') as HTMLElement)?.scroll(0, value.legacyScrollTop!);
      }
    });
    return;
  }
  const colData = getColumnData();
  if (!colData) return;
  colData._pendingScrollRestore = { ...value, heights: [] };
}

export function resolveScrollContainer(
  parent: HTMLElement | undefined | null,
  isSingleColumn: boolean,
  isJunk: boolean,
  columnScrollElement?: HTMLElement | null,
): HTMLElement | null {
  if (!parent) return null;
  if (isSingleColumn) return document.documentElement;
  if (isJunk) return parent.closest('.modal-page-content') as HTMLElement | null;
  return columnScrollElement ?? null;
}

export function computeScrollTopPosition(
  tree: FenwickTree,
  index: number,
  itemHeight: number,
  viewportHeight: number,
  topMargin: number,
  align: string,
  offset: number,
): number {
  const pos = tree.prefixSum(index);
  const usable = viewportHeight - topMargin;
  switch (align) {
    case 'center': return pos - usable / 2 + itemHeight / 2 + offset;
    case 'end': return pos - usable + itemHeight + offset;
    default: return pos + offset;
  }
}

export function findTargetIndex<T>(
  state: ScrollState,
  items: T[],
  getKey: (item: T, index: number) => string,
): number {
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

export function getScrollTopFor(
  container: HTMLElement | null | undefined,
  isWindow: boolean,
): number {
  if (isWindow) return window.scrollY;
  return container?.scrollTop ?? 0;
}

export function setScrollTopFor(
  container: HTMLElement | null | undefined,
  isWindow: boolean,
  value: number,
): void {
  if (isWindow) {
    window.scrollTo(0, value);
  } else if (container) {
    container.scrollTop = value;
  }
}
