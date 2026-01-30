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
  key?: string;
  offset: number;
  heights: [string, number][];
  scrollTop?: number;
  visualY?: number;
}
