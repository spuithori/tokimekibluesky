import { describe, expect, it } from 'vitest';
import { insertionIndex, type Box } from './chipDrag.svelte';

function row(y: number, xs: number[]): Box[] {
  return xs.map((x) => ({ left: x, right: x + 40, top: y, bottom: y + 20 }));
}

describe('差し込む位置', () => {
  const boxes = [...row(0, [0, 50, 100]), ...row(30, [0, 50])];

  it('同じ行では、中心より左にある最初のチップの前', () => {
    expect(insertionIndex(boxes, 5, 10)).toBe(0);
    expect(insertionIndex(boxes, 30, 10)).toBe(1);
    expect(insertionIndex(boxes, 125, 10)).toBe(3);
  });

  it('行の右端より右なら、次の行の先頭（= その行の最後の後ろ）', () => {
    expect(insertionIndex(boxes, 200, 10)).toBe(3);
  });

  it('下の行と行の間（どの行にも入らない高さ）なら、下の行の先頭の前', () => {
    expect(insertionIndex(boxes, 200, 25)).toBe(3);
    expect(insertionIndex(boxes, 60, 40)).toBe(4);
  });

  it('最後の行の右や、すべての下は末尾', () => {
    expect(insertionIndex(boxes, 95, 40)).toBe(5);
    expect(insertionIndex(boxes, 0, 100)).toBe(5);
    expect(insertionIndex([], 0, 0)).toBe(0);
  });
});
