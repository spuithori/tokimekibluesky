export interface TestItem {
  id: string;
  height: number;
  label: string;
  color: string;
  bodyLines: number;
}

export function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

export function getItemHeight(id: number): number {
  const r = seededRandom(id);
  if (r < 0.3) return 72 + Math.floor(seededRandom(id + 1000) * 40);
  if (r < 0.6) return 120 + Math.floor(seededRandom(id + 2000) * 60);
  if (r < 0.85) return 200 + Math.floor(seededRandom(id + 3000) * 80);
  return 280 + Math.floor(seededRandom(id + 4000) * 40);
}

export function getItemColor(id: number): string {
  const hue = Math.floor(seededRandom(id + 5000) * 360);
  const sat = 40 + Math.floor(seededRandom(id + 6000) * 30);
  const light = 82 + Math.floor(seededRandom(id + 7000) * 12);
  return `hsl(${hue}, ${sat}%, ${light}%)`;
}

export function getBodyLines(id: number): number {
  return 1 + Math.floor(seededRandom(id + 8000) * 4);
}

export function makeItem(id: number): TestItem {
  return {
    id: `item-${id}`,
    height: getItemHeight(id),
    color: getItemColor(id),
    label: `Item ${id}`,
    bodyLines: getBodyLines(id),
  };
}

export function generateItems(count: number, startId: number): TestItem[] {
  const result: TestItem[] = [];
  for (let i = 0; i < count; i++) {
    result.push(makeItem(startId + i));
  }
  return result;
}

export interface BenchmarkTestAPI {
  prepend(count: number): void;
  append(count: number): void;
  reset(count: number): void;
  getItemCount(): number;
  scrollToIndex(index: number): void;
  getScrollTop(): number;
  getItemVisualY(testId: string): number | null;
  getVisibleItemIds(): string[];
  getRenderedItemCount(): number;
  getLibraryName(): string;
  isScrollStable(): boolean;
  saveState(): void;
  restoreState(): void;
  changeItemHeightDOM(testId: string, newHeight: number): void;
}

export const TOP_MARGIN = 108;
