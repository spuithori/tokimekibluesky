export interface VisibleRange {
  start: number;
  end: number;
}

export interface ScrollToIndexOptions {
  align?: 'start' | 'center' | 'end';
  offset?: number;
}

export interface ScrollState {
  index: number;
  offset: number;
  heights: [string, number][];
}
