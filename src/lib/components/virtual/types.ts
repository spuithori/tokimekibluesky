export interface VisibleRange {
  start: number;
  end: number;
}

export interface ScrollToIndexOptions {
  align?: 'start' | 'center' | 'end';
  offset?: number;
}

export interface VirtualListProps<T> {
  items: T[];
  getKey: (item: T, index: number) => string;
  scrollContainer: HTMLElement | null | undefined;
  buffer?: number;
  estimatedItemHeight?: number;
  topMargin?: number;
  maintainScrollPosition?: boolean;
  onRangeChange?: (range: VisibleRange) => void;
}
