import type { FenwickTree } from './fenwick';
import type { ScrollState } from './types';

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
