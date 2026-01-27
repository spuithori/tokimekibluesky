import type { ScrollState } from './types';

const DEFAULT_ITEM_HEIGHT = 100;

export interface ScrollCoreConfig {
  getKey: (item: any, index: number) => string;
  buffer: number;
  topMargin: number;
}

export interface ItemsChangeResult {
  type: 'empty' | 'first-load' | 'append' | 'prepend' | 'replace';
  shiftCount: number;
  scrollAdjust: number;
}

export interface HeightUpdateResult {
  scrollAdjust: number;
  changed: boolean;
}

export interface VisibleRangeResult {
  visibleStart: number;
  visibleEnd: number;
  rangeStart: number;
  rangeEnd: number;
  topSpacer: number;
  bottomSpacer: number;
}

export class VirtualScrollCore {
  private getKey: (item: any, index: number) => string;
  private buffer: number;
  private topMargin: number;

  items: any[] = [];
  heights = new Map<string, number>();
  private totalMeasuredHeight = 0;
  private measuredCount = 0;
  positions: number[] = [];
  totalHeight = 0;
  viewportHeight = 0;
  private prevItemCount = 0;
  private prevFirstKey = '';
  private prevLastKey = '';

  constructor(config: ScrollCoreConfig) {
    this.getKey = config.getKey;
    this.buffer = config.buffer;
    this.topMargin = config.topMargin;
  }

  getAverageHeight(): number {
    return this.measuredCount > 0 ? this.totalMeasuredHeight / this.measuredCount : DEFAULT_ITEM_HEIGHT;
  }

  setHeight(key: string, height: number): void {
    const existing = this.heights.get(key);
    if (existing !== undefined) {
      this.totalMeasuredHeight -= existing;
    } else {
      this.measuredCount++;
    }
    this.heights.set(key, height);
    this.totalMeasuredHeight += height;
  }

  getItemHeight(index: number): number {
    if (index < 0 || index >= this.items.length) return this.getAverageHeight();
    const key = this.getKey(this.items[index], index);
    return this.heights.get(key) ?? this.getAverageHeight();
  }

  recalculatePositions(): void {
    const len = this.items.length;
    if (len === 0) {
      this.positions = [];
      this.totalHeight = 0;
      return;
    }

    const newPositions = new Array(len);
    let cumulative = 0;
    const fallbackHeight = this.getAverageHeight();

    for (let i = 0; i < len; i++) {
      newPositions[i] = cumulative;
      const key = this.getKey(this.items[i], i);
      cumulative += this.heights.get(key) ?? fallbackHeight;
    }

    this.positions = newPositions;
    this.totalHeight = cumulative;
  }

  appendPositions(startIndex: number): void {
    const len = this.items.length;
    if (len === 0 || startIndex >= len) return;

    const fallbackHeight = this.getAverageHeight();
    const newPositions = [...this.positions];

    let cumulative = startIndex > 0
      ? (this.positions[startIndex - 1] ?? 0) + this.getItemHeight(startIndex - 1)
      : 0;

    for (let i = startIndex; i < len; i++) {
      newPositions[i] = cumulative;
      const key = this.getKey(this.items[i], i);
      cumulative += this.heights.get(key) ?? fallbackHeight;
    }

    this.positions = newPositions;
    this.totalHeight = cumulative;
  }

  findIndexAtPosition(scrollTop: number): number {
    if (this.positions.length === 0) return 0;
    let left = 0;
    let right = this.positions.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right + 1) / 2);
      if (this.positions[mid] <= scrollTop) {
        left = mid;
      } else {
        right = mid - 1;
      }
    }
    return left;
  }

  findEndIndex(scrollBottom: number): number {
    if (this.positions.length === 0) return 0;
    let left = 0;
    let right = this.positions.length - 1;

    while (left < right) {
      const mid = Math.floor((left + right + 1) / 2);
      if (this.positions[mid] <= scrollBottom) {
        left = mid;
      } else {
        right = mid - 1;
      }
    }
    return Math.min(this.items.length, left + 1);
  }

  computeVisibleRange(scrollTop: number): VisibleRangeResult {
    if (this.items.length === 0 || this.viewportHeight <= 0) {
      const end = Math.min(this.items.length, 20);
      return { visibleStart: 0, visibleEnd: end, rangeStart: 0, rangeEnd: end, topSpacer: 0, bottomSpacer: 0 };
    }

    const usableHeight = this.viewportHeight - this.topMargin;
    const visibleStart = this.findIndexAtPosition(scrollTop);
    const visibleEnd = this.findEndIndex(scrollTop + usableHeight);

    const rangeStart = Math.max(0, visibleStart - this.buffer);
    const rangeEnd = Math.min(this.items.length, visibleEnd + this.buffer);

    const topSpacer = this.positions[rangeStart] ?? 0;
    const endPosition = this.positions[rangeEnd] ?? this.totalHeight;
    const bottomSpacer = Math.max(0, this.totalHeight - endPosition);

    return { visibleStart, visibleEnd, rangeStart, rangeEnd, topSpacer, bottomSpacer };
  }

  handleItemsChange(newItems: any[], currentScrollTop: number): ItemsChangeResult {
    const oldCount = this.prevItemCount;
    const oldFirstKey = this.prevFirstKey;
    const oldLastKey = this.prevLastKey;

    this.items = newItems;
    const len = newItems.length;
    this.prevItemCount = len;
    this.prevFirstKey = len > 0 ? this.getKey(newItems[0], 0) : '';
    this.prevLastKey = len > 0 ? this.getKey(newItems[len - 1], len - 1) : '';

    if (len === 0) {
      this.positions = [];
      this.totalHeight = 0;
      return { type: 'empty', shiftCount: 0, scrollAdjust: 0 };
    }

    const firstKey = this.getKey(newItems[0], 0);

    if (oldCount === 0) {
      this.recalculatePositions();
      return { type: 'first-load', shiftCount: 0, scrollAdjust: 0 };
    }

    if (len > oldCount && firstKey === oldFirstKey) {
      const isRealAppend = oldLastKey &&
        oldCount > 0 &&
        this.getKey(newItems[oldCount - 1], oldCount - 1) === oldLastKey;

      if (isRealAppend) {
        this.appendPositions(oldCount);
        return { type: 'append', shiftCount: 0, scrollAdjust: 0 };
      }

      this.recalculatePositions();
      return { type: 'replace', shiftCount: 0, scrollAdjust: 0 };
    }

    if (len > oldCount && oldFirstKey && firstKey !== oldFirstKey) {
      let shiftCount = 0;
      const limit = Math.min(len, len - oldCount + 10);
      for (let i = 1; i < limit; i++) {
        if (this.getKey(newItems[i], i) === oldFirstKey) {
          shiftCount = i;
          break;
        }
      }

      this.recalculatePositions();

      let scrollAdjust = 0;
      if (shiftCount > 0) {
        scrollAdjust = this.positions[shiftCount] ?? 0;
      }

      return { type: 'prepend', shiftCount, scrollAdjust };
    }

    this.recalculatePositions();
    return { type: 'replace', shiftCount: 0, scrollAdjust: 0 };
  }

  processHeightUpdates(
    updates: Map<string, number>,
    currentScrollTop: number
  ): HeightUpdateResult {
    let changed = false;

    for (const [key, newHeight] of updates) {
      const oldHeight = this.heights.get(key);
      if (oldHeight !== undefined && Math.abs(oldHeight - newHeight) < 1) continue;
      this.setHeight(key, newHeight);
      changed = true;
    }

    let scrollAdjust = 0;
    if (changed) {
      const anchorIndex = this.findIndexAtPosition(currentScrollTop);
      const oldAnchorPos = this.positions[anchorIndex] ?? 0;

      this.recalculatePositions();

      const newAnchorPos = this.positions[anchorIndex] ?? 0;
      scrollAdjust = newAnchorPos - oldAnchorPos;
    }

    return { scrollAdjust, changed };
  }

  getScrollState(currentScrollTop: number): ScrollState | null {
    if (this.items.length === 0) return null;

    const index = this.findIndexAtPosition(currentScrollTop);
    const key = this.getKey(this.items[index], index);
    const offset = currentScrollTop - (this.positions[index] ?? 0);

    const heightsArray: [string, number][] = Array.from(this.heights.entries());

    return { index, key, offset, heights: heightsArray };
  }

  computeRestoreScrollTop(state: ScrollState): number {
    if (!state || this.items.length === 0) return -1;

    if (state.heights?.length > 0) {
      for (const [k, v] of state.heights) {
        this.setHeight(k, v);
      }
    }
    this.recalculatePositions();

    let targetIdx = state.index;
    if (state.key && this.items.length > 0) {
      const currentKey = targetIdx >= 0 && targetIdx < this.items.length
        ? this.getKey(this.items[targetIdx], targetIdx)
        : '';
      if (currentKey !== state.key) {
        for (let i = 0; i < this.items.length; i++) {
          if (this.getKey(this.items[i], i) === state.key) {
            targetIdx = i;
            break;
          }
        }
      }
    }

    if (targetIdx < 0 || targetIdx >= this.items.length) return -1;

    const position = this.positions[targetIdx] ?? 0;
    return Math.max(0, position + (state.offset ?? 0));
  }
}
