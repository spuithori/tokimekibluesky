import { describe, it, expect } from 'vitest';
import { FenwickTree } from './fenwick';

class NaiveOracle {
  heights: number[] = [];
  measured: boolean[] = [];

  get length() { return this.heights.length; }
  get total() { return this.heights.reduce((a, b) => a + b, 0); }
  get measuredCount() { return this.measured.filter(Boolean).length; }
  get measuredAverage() {
    const mc = this.measuredCount;
    if (mc === 0) return 0;
    let tm = 0;
    for (let i = 0; i < this.heights.length; i++) if (this.measured[i]) tm += this.heights[i];
    return tm / mc;
  }

  get(index: number) { return index >= 0 && index < this.heights.length ? this.heights[index] : 0; }
  isMeasured(index: number) { return index >= 0 && index < this.measured.length ? this.measured[index] : false; }

  set(index: number, height: number) {
    if (index < 0 || index >= this.heights.length) return;
    this.heights[index] = height;
  }

  setMeasured(index: number, height: number) {
    if (index < 0 || index >= this.heights.length) return;
    this.heights[index] = height;
    this.measured[index] = true;
  }

  clearMeasured() { this.measured = this.measured.map(() => false); }

  prefixSum(count: number) {
    if (count <= 0) return 0;
    let s = 0;
    for (let i = 0; i < Math.min(count, this.heights.length); i++) s += this.heights[i];
    return s;
  }

  findIndex(target: number) {
    const n = this.heights.length;
    if (n === 0 || target <= 0) return 0;
    let pos = 0;
    while (pos < n && this.prefixSum(pos + 1) <= target) pos++;
    return Math.min(pos, n - 1);
  }

  buildWithCallback(n: number, getHeight: (i: number) => number) {
    this.heights = Array.from({ length: n }, (_, i) => getHeight(i));
    this.measured = new Array(n).fill(false);
  }

  buildWithMeasured(n: number, getHeight: (i: number) => number, isMeasuredFn: (i: number) => boolean) {
    this.buildWithCallback(n, getHeight);
    this.measured = Array.from({ length: n }, (_, i) => isMeasuredFn(i));
  }

  prependWithCallback(count: number, getHeight: (i: number) => number) {
    if (count === 0) return;
    this.heights = [...Array.from({ length: count }, (_, i) => getHeight(i)), ...this.heights];
    this.measured = [...new Array(count).fill(false), ...this.measured];
  }

  prependAndTruncate(count: number, targetLen: number, getHeight: (i: number) => number, avg: number) {
    if (count === 0 && targetLen >= this.heights.length) return;
    if (targetLen >= this.heights.length + count) {
      this.prependWithCallback(count, getHeight);
      return;
    }
    const prependEnd = Math.min(count, targetLen);
    const newH = Array.from({ length: prependEnd }, (_, i) => getHeight(i));
    const newM = new Array(prependEnd).fill(false);
    const copyLen = Math.max(0, targetLen - count);
    for (let i = 0; i < copyLen; i++) {
      newH[count + i] = this.heights[i];
      newM[count + i] = this.measured[i];
    }
    newH.length = targetLen;
    newM.length = targetLen;
    for (let i = 0; i < targetLen; i++) {
      if (newH[i] === undefined) newH[i] = 0;
      if (newM[i] === undefined) newM[i] = false;
    }
    this.heights = newH;
    this.measured = newM;
    this.rebuildWithAverage(avg);
  }

  extendWithCallback(count: number, getHeight: (i: number) => number) {
    for (let i = 0; i < count; i++) {
      this.heights.push(getHeight(i));
      this.measured.push(false);
    }
  }

  rebuildWithAverage(avg: number) {
    for (let i = 0; i < this.heights.length; i++) {
      if (!this.measured[i]) this.heights[i] = avg;
    }
  }

  truncate(newSize: number, avg: number) {
    if (newSize >= this.heights.length) return;
    this.heights = this.heights.slice(0, newSize);
    this.measured = this.measured.slice(0, newSize);
    this.rebuildWithAverage(avg);
  }

  clear() {
    this.heights = [];
    this.measured = [];
  }
}

function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function expectEquivalent(tree: FenwickTree, oracle: NaiveOracle) {
  expect(tree.length).toBe(oracle.length);
  expect(tree.total).toBeCloseTo(oracle.total, 6);
  expect(tree.measuredCount).toBe(oracle.measuredCount);
  expect(tree.measuredAverage).toBeCloseTo(oracle.measuredAverage, 6);
  const n = oracle.length;
  for (const count of [0, 1, Math.floor(n / 3), Math.floor(n / 2), n - 1, n, n + 5]) {
    expect(tree.prefixSum(count)).toBeCloseTo(oracle.prefixSum(count), 6);
  }
  const total = oracle.total;
  for (const target of [-10, 0, 0.5, total * 0.25, total * 0.5, total * 0.99, total, total + 100]) {
    expect(tree.findIndex(target)).toBe(oracle.findIndex(target));
  }
  for (const i of [0, Math.floor(n / 2), n - 1]) {
    expect(tree.get(i)).toBeCloseTo(oracle.get(i), 6);
    expect(tree.isMeasured(i)).toBe(oracle.isMeasured(i));
  }
}

describe('FenwickTree', () => {
  it('buildWithCallback + prefixSum + findIndex match naive oracle', () => {
    const tree = new FenwickTree();
    const oracle = new NaiveOracle();
    const h = (i: number) => 50 + (i % 7) * 20;
    tree.buildWithCallback(100, h);
    oracle.buildWithCallback(100, h);
    expectEquivalent(tree, oracle);
  });

  it('setMeasured updates totals and measured stats', () => {
    const tree = new FenwickTree();
    const oracle = new NaiveOracle();
    tree.buildWithCallback(50, () => 100);
    oracle.buildWithCallback(50, () => 100);
    for (const [i, hVal] of [[0, 120], [10, 80], [49, 300], [10, 85]] as const) {
      tree.setMeasured(i, hVal);
      oracle.setMeasured(i, hVal);
    }
    expectEquivalent(tree, oracle);
  });

  it('set (unmeasured) keeps measured flags untouched', () => {
    const tree = new FenwickTree();
    const oracle = new NaiveOracle();
    tree.buildWithCallback(20, () => 100);
    oracle.buildWithCallback(20, () => 100);
    tree.setMeasured(5, 150);
    oracle.setMeasured(5, 150);
    tree.set(6, 200);
    oracle.set(6, 200);
    tree.set(5, 160);
    oracle.set(5, 160);
    expectEquivalent(tree, oracle);
  });

  it('out-of-range set/setMeasured are no-ops', () => {
    const tree = new FenwickTree();
    tree.buildWithCallback(10, () => 100);
    tree.set(-1, 50);
    tree.set(10, 50);
    tree.setMeasured(-1, 50);
    tree.setMeasured(10, 50);
    expect(tree.total).toBe(1000);
    expect(tree.measuredCount).toBe(0);
  });

  it('findIndex boundary semantics: exact prefix boundary selects next item', () => {
    const tree = new FenwickTree();
    tree.buildFrom([100, 100, 100]);
    expect(tree.findIndex(0)).toBe(0);
    expect(tree.findIndex(99.9)).toBe(0);
    expect(tree.findIndex(100)).toBe(1);
    expect(tree.findIndex(200)).toBe(2);
    expect(tree.findIndex(300)).toBe(2);
    expect(tree.findIndex(9999)).toBe(2);
  });

  it('prependWithCallback shifts measured flags', () => {
    const tree = new FenwickTree();
    const oracle = new NaiveOracle();
    tree.buildWithCallback(30, () => 100);
    oracle.buildWithCallback(30, () => 100);
    tree.setMeasured(0, 111);
    oracle.setMeasured(0, 111);
    tree.setMeasured(29, 222);
    oracle.setMeasured(29, 222);
    tree.prependWithCallback(5, () => 90);
    oracle.prependWithCallback(5, () => 90);
    expectEquivalent(tree, oracle);
    expect(tree.isMeasured(5)).toBe(true);
    expect(tree.get(5)).toBe(111);
  });

  it('prependAndTruncate: pure prepend when target allows full length', () => {
    const tree = new FenwickTree();
    const oracle = new NaiveOracle();
    tree.buildWithCallback(20, () => 100);
    oracle.buildWithCallback(20, () => 100);
    tree.prependAndTruncate(5, 25, () => 80, 100);
    oracle.prependAndTruncate(5, 25, () => 80, 100);
    expectEquivalent(tree, oracle);
  });

  it('prependAndTruncate: truncating tail preserves head measurements', () => {
    const tree = new FenwickTree();
    const oracle = new NaiveOracle();
    tree.buildWithCallback(20, () => 100);
    oracle.buildWithCallback(20, () => 100);
    tree.setMeasured(2, 130);
    oracle.setMeasured(2, 130);
    tree.setMeasured(18, 170);
    oracle.setMeasured(18, 170);
    tree.prependAndTruncate(5, 20, () => 80, 100);
    oracle.prependAndTruncate(5, 20, () => 80, 100);
    expectEquivalent(tree, oracle);
    expect(tree.isMeasured(7)).toBe(true);
    expect(tree.get(7)).toBe(130);
    expect(tree.isMeasured(18 + 5 < 20 ? 23 : 0)).toBe(false);
  });

  it('extendWithCallback appends unmeasured items', () => {
    const tree = new FenwickTree();
    const oracle = new NaiveOracle();
    tree.buildWithCallback(10, () => 100);
    oracle.buildWithCallback(10, () => 100);
    tree.setMeasured(9, 140);
    oracle.setMeasured(9, 140);
    tree.extendWithCallback(15, (i) => 60 + i);
    oracle.extendWithCallback(15, (i) => 60 + i);
    expectEquivalent(tree, oracle);
  });

  it('truncate removes tail measurements and rebuilds estimates', () => {
    const tree = new FenwickTree();
    const oracle = new NaiveOracle();
    tree.buildWithCallback(30, () => 100);
    oracle.buildWithCallback(30, () => 100);
    tree.setMeasured(5, 150);
    oracle.setMeasured(5, 150);
    tree.setMeasured(25, 200);
    oracle.setMeasured(25, 200);
    tree.truncate(10, 120);
    oracle.truncate(10, 120);
    expectEquivalent(tree, oracle);
    expect(tree.length).toBe(10);
    expect(tree.measuredCount).toBe(1);
  });

  it('rebuildWithAverage only rewrites unmeasured slots', () => {
    const tree = new FenwickTree();
    const oracle = new NaiveOracle();
    tree.buildWithCallback(10, () => 100);
    oracle.buildWithCallback(10, () => 100);
    tree.setMeasured(3, 170);
    oracle.setMeasured(3, 170);
    tree.rebuildWithAverage(90);
    oracle.rebuildWithAverage(90);
    expectEquivalent(tree, oracle);
    expect(tree.get(3)).toBe(170);
    expect(tree.get(4)).toBe(90);
  });

  it('buildWithMeasured restores measurement flags', () => {
    const tree = new FenwickTree();
    const oracle = new NaiveOracle();
    const h = (i: number) => 80 + i;
    const m = (i: number) => i % 3 === 0;
    tree.buildWithMeasured(40, h, m);
    oracle.buildWithMeasured(40, h, m);
    expectEquivalent(tree, oracle);
  });

  it('clearMeasured resets stats but keeps heights', () => {
    const tree = new FenwickTree();
    tree.buildWithCallback(10, () => 100);
    tree.setMeasured(0, 130);
    tree.clearMeasured();
    expect(tree.measuredCount).toBe(0);
    expect(tree.measuredAverage).toBe(0);
    expect(tree.get(0)).toBe(130);
    expect(tree.total).toBe(1030);
  });

  it('clear empties everything', () => {
    const tree = new FenwickTree();
    tree.buildWithCallback(10, () => 100);
    tree.clear();
    expect(tree.length).toBe(0);
    expect(tree.total).toBe(0);
    expect(tree.findIndex(50)).toBe(0);
    expect(tree.prefixSum(5)).toBe(0);
  });

  it('randomized operation sequences stay equivalent to oracle', () => {
    for (const seed of [1, 42, 2026]) {
      const rng = makeRng(seed);
      const tree = new FenwickTree();
      const oracle = new NaiveOracle();
      const initial = 20 + Math.floor(rng() * 60);
      const h0 = () => 40 + Math.floor(rng() * 200);
      const heights: number[] = Array.from({ length: initial }, h0);
      tree.buildFrom(heights);
      oracle.buildWithCallback(initial, (i) => heights[i]);

      for (let step = 0; step < 200; step++) {
        const op = rng();
        const len = oracle.length;
        if (op < 0.35 && len > 0) {
          const idx = Math.floor(rng() * len);
          const hVal = 30 + Math.floor(rng() * 300);
          tree.setMeasured(idx, hVal);
          oracle.setMeasured(idx, hVal);
        } else if (op < 0.5 && len > 0) {
          const idx = Math.floor(rng() * len);
          const hVal = 30 + Math.floor(rng() * 300);
          tree.set(idx, hVal);
          oracle.set(idx, hVal);
        } else if (op < 0.65) {
          const count = 1 + Math.floor(rng() * 10);
          const hs = Array.from({ length: count }, () => 50 + Math.floor(rng() * 100));
          tree.extendWithCallback(count, (i) => hs[i]);
          oracle.extendWithCallback(count, (i) => hs[i]);
        } else if (op < 0.8) {
          const count = 1 + Math.floor(rng() * 8);
          const hs = Array.from({ length: count }, () => 50 + Math.floor(rng() * 100));
          tree.prependWithCallback(count, (i) => hs[i]);
          oracle.prependWithCallback(count, (i) => hs[i]);
        } else if (op < 0.9 && len > 5) {
          const newSize = 1 + Math.floor(rng() * (len - 1));
          const avg = 60 + Math.floor(rng() * 80);
          tree.truncate(newSize, avg);
          oracle.truncate(newSize, avg);
        } else if (len > 5) {
          const count = 1 + Math.floor(rng() * 5);
          const target = Math.max(1, len + count - Math.floor(rng() * 5));
          const hs = Array.from({ length: count }, () => 50 + Math.floor(rng() * 100));
          const avg = 60 + Math.floor(rng() * 80);
          tree.prependAndTruncate(count, target, (i) => hs[i], avg);
          oracle.prependAndTruncate(count, target, (i) => hs[i], avg);
        }
        expectEquivalent(tree, oracle);
      }
    }
  });
});
