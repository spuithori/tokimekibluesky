import { describe, it, expect, beforeEach } from 'vitest';
import {
  binarySearchStart,
  binarySearchEnd,
  calculatePositions,
  calculateTotalHeight
} from './utils';

function generateMockItems(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: `item-${i}`,
    content: `Content ${i}`
  }));
}

function generateMockHeights(items: any[], getKey: (item: any, index: number) => string, baseHeight = 150, variance = 50) {
  const heights = new Map<string, number>();
  items.forEach((item, index) => {
    const key = getKey(item, index);
    heights.set(key, baseHeight + Math.floor(Math.random() * variance * 2) - variance);
  });
  return heights;
}

const getKey = (item: any, index: number) => item.id;

describe('VirtualList Performance Tests', () => {
  describe('Binary Search Performance', () => {
    const testCases = [100, 1000, 10000, 50000];

    testCases.forEach(count => {
      it(`binarySearchStart with ${count} items`, () => {
        const items = generateMockItems(count);
        const heights = generateMockHeights(items, getKey);
        const positions = calculatePositions(items, heights, getKey, 150);

        const totalHeight = positions[positions.length - 1] + 150;
        const iterations = 1000;

        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
          const targetOffset = Math.random() * totalHeight;
          binarySearchStart(positions, targetOffset);
        }
        const end = performance.now();

        const avgTime = (end - start) / iterations;
        console.log(`binarySearchStart (${count} items): ${avgTime.toFixed(4)}ms avg per call`);

        expect(avgTime).toBeLessThan(0.1);
      });

      it(`binarySearchEnd with ${count} items`, () => {
        const items = generateMockItems(count);
        const heights = generateMockHeights(items, getKey);
        const positions = calculatePositions(items, heights, getKey, 150);

        const totalHeight = positions[positions.length - 1] + 150;
        const iterations = 1000;

        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
          const targetOffset = Math.random() * totalHeight;
          binarySearchEnd(positions, heights, items, getKey, targetOffset, 150);
        }
        const end = performance.now();

        const avgTime = (end - start) / iterations;
        console.log(`binarySearchEnd (${count} items): ${avgTime.toFixed(4)}ms avg per call`);

        expect(avgTime).toBeLessThan(0.1);
      });
    });
  });

  describe('calculatePositions Performance', () => {
    const testCases = [100, 1000, 10000, 50000];

    testCases.forEach(count => {
      it(`calculatePositions with ${count} items`, () => {
        const items = generateMockItems(count);
        const heights = generateMockHeights(items, getKey);
        const iterations = 10;

        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
          calculatePositions(items, heights, getKey, 150);
        }
        const end = performance.now();

        const avgTime = (end - start) / iterations;
        console.log(`calculatePositions (${count} items): ${avgTime.toFixed(4)}ms avg per call`);

        // 10000 アイテムでも 5ms 未満
        if (count <= 10000) {
          expect(avgTime).toBeLessThan(5);
        } else {
          expect(avgTime).toBeLessThan(25);
        }
      });
    });
  });

  describe('Incremental Range Update Simulation', () => {
    function computeVisibleRangeIncremental(
      positions: number[],
      heights: Map<string, number>,
      items: any[],
      prevRange: { start: number; end: number },
      prevScrollOffset: number,
      currentScrollOffset: number,
      viewportHeight: number,
      estimatedItemHeight: number
    ): { start: number; end: number } | null {
      const scrollDelta = currentScrollOffset - prevScrollOffset;
      const absScrollDelta = Math.abs(scrollDelta);

      if (absScrollDelta > viewportHeight) {
        return null;
      }

      const adjustedScrollOffset = Math.max(0, currentScrollOffset);
      const viewportEnd = adjustedScrollOffset + viewportHeight;

      let newStart = prevRange.start;
      let newEnd = prevRange.end;

      if (scrollDelta > 0) {
        while (newStart < items.length - 1) {
          const nextPos = positions[newStart + 1];
          if (nextPos === undefined || nextPos > adjustedScrollOffset) break;
          newStart++;
        }
        while (newEnd < items.length) {
          const pos = positions[newEnd];
          if (pos === undefined || pos >= viewportEnd) break;
          newEnd++;
        }
      } else if (scrollDelta < 0) {
        while (newStart > 0) {
          const pos = positions[newStart];
          if (pos <= adjustedScrollOffset) break;
          newStart--;
        }
        while (newEnd > 1) {
          const prevPos = positions[newEnd - 1];
          const prevKey = getKey(items[newEnd - 1], newEnd - 1);
          const prevHeight = heights.get(prevKey) ?? estimatedItemHeight;
          if (prevPos + prevHeight <= viewportEnd) break;
          newEnd--;
        }
      }

      return { start: newStart, end: newEnd };
    }

    const testCases = [1000, 10000, 50000];

    testCases.forEach(count => {
      it(`Incremental update vs Binary search with ${count} items`, () => {
        const items = generateMockItems(count);
        const heights = generateMockHeights(items, getKey);
        const positions = calculatePositions(items, heights, getKey, 150);
        const viewportHeight = 800;
        const estimatedItemHeight = 150;
        const scrollSteps = 100;
        const scrollAmountPerStep = 50; // 50px ずつスクロール

        let binarySearchTime = 0;
        {
          const start = performance.now();
          let scrollOffset = 0;
          for (let i = 0; i < scrollSteps; i++) {
            scrollOffset += scrollAmountPerStep;
            binarySearchStart(positions, scrollOffset);
            binarySearchEnd(positions, heights, items, getKey, scrollOffset + viewportHeight, estimatedItemHeight);
          }
          binarySearchTime = performance.now() - start;
        }

        let incrementalTime = 0;
        {
          const start = performance.now();
          let scrollOffset = 0;
          let prevScrollOffset = 0;
          let prevRange = { start: 0, end: Math.ceil(viewportHeight / estimatedItemHeight) + 10 };

          for (let i = 0; i < scrollSteps; i++) {
            scrollOffset += scrollAmountPerStep;
            const result = computeVisibleRangeIncremental(
              positions,
              heights,
              items,
              prevRange,
              prevScrollOffset,
              scrollOffset,
              viewportHeight,
              estimatedItemHeight
            );
            if (result) {
              prevRange = result;
            } else {
              const newStart = binarySearchStart(positions, scrollOffset);
              const newEnd = binarySearchEnd(positions, heights, items, getKey, scrollOffset + viewportHeight, estimatedItemHeight);
              prevRange = { start: newStart, end: newEnd };
            }
            prevScrollOffset = scrollOffset;
          }
          incrementalTime = performance.now() - start;
        }

        console.log(`\n${count} items, ${scrollSteps} scroll steps:`);
        console.log(`  Binary search: ${binarySearchTime.toFixed(4)}ms total, ${(binarySearchTime / scrollSteps).toFixed(4)}ms avg`);
        console.log(`  Incremental:   ${incrementalTime.toFixed(4)}ms total, ${(incrementalTime / scrollSteps).toFixed(4)}ms avg`);
        console.log(`  Speedup:       ${(binarySearchTime / incrementalTime).toFixed(2)}x`);

        if (count >= 10000) {
          expect(incrementalTime).toBeLessThan(binarySearchTime * 1.5);
        }
      });
    });
  });

  describe('Scroll Threshold Simulation', () => {
    it('Measures state updates with and without threshold', () => {
      const items = generateMockItems(10000);
      const heights = generateMockHeights(items, getKey);
      const positions = calculatePositions(items, heights, getKey, 150);
      const viewportHeight = 800;

      const scrollEvents = 1000;
      const threshold = 50;

      let updatesWithoutThreshold = 0;
      {
        let scrollOffset = 0;
        for (let i = 0; i < scrollEvents; i++) {
          scrollOffset += 1; // 1px スクロール
          updatesWithoutThreshold++; // 毎回更新
        }
      }

      let updatesWithThreshold = 0;
      {
        let scrollOffset = 0;
        let lastComputedOffset = 0;
        for (let i = 0; i < scrollEvents; i++) {
          scrollOffset += 1;
          if (Math.abs(scrollOffset - lastComputedOffset) > threshold) {
            updatesWithThreshold++;
            lastComputedOffset = scrollOffset;
          }
        }
      }

      console.log(`\nScroll threshold simulation (${scrollEvents} events, threshold=${threshold}px):`);
      console.log(`  Without threshold: ${updatesWithoutThreshold} updates`);
      console.log(`  With threshold:    ${updatesWithThreshold} updates`);
      console.log(`  Reduction:         ${((1 - updatesWithThreshold / updatesWithoutThreshold) * 100).toFixed(1)}%`);

      expect(updatesWithThreshold).toBeLessThan(updatesWithoutThreshold / 10);
    });
  });

  describe('Memory Allocation Test', () => {
    it('Map creation overhead', () => {
      const size = 10000;
      const iterations = 100;

      const start1 = performance.now();
      for (let i = 0; i < iterations; i++) {
        const map = new Map<string, number>();
        for (let j = 0; j < size; j++) {
          map.set(`key-${j}`, j * 150);
        }
      }
      const newMapTime = performance.now() - start1;

      const start2 = performance.now();
      const map = new Map<string, number>();
      for (let i = 0; i < iterations; i++) {
        map.clear();
        for (let j = 0; j < size; j++) {
          map.set(`key-${j}`, j * 150);
        }
      }
      const reuseMapTime = performance.now() - start2;

      console.log(`\nMap allocation (${size} entries, ${iterations} iterations):`);
      console.log(`  New Map each time: ${newMapTime.toFixed(2)}ms`);
      console.log(`  Reuse Map:         ${reuseMapTime.toFixed(2)}ms`);
      console.log(`  Ratio:             ${(newMapTime / reuseMapTime).toFixed(2)}x`);
    });

    it('Map clone vs in-place update (Phase 4)', () => {
      const size = 10000;
      const iterations = 1000;

      const start1 = performance.now();
      let clonedMap = new Map<string, number>();
      for (let j = 0; j < size; j++) {
        clonedMap.set(`key-${j}`, j * 150);
      }
      for (let i = 0; i < iterations; i++) {
        clonedMap.set(`key-${i % size}`, (i % size) * 150 + i);
        clonedMap = new Map(clonedMap);
      }
      const cloneTime = performance.now() - start1;
      const start2 = performance.now();
      const inPlaceMap = new Map<string, number>();
      let version = 0;
      for (let j = 0; j < size; j++) {
        inPlaceMap.set(`key-${j}`, j * 150);
      }
      for (let i = 0; i < iterations; i++) {
        inPlaceMap.set(`key-${i % size}`, (i % size) * 150 + i);
        version++;
      }
      const inPlaceTime = performance.now() - start2;

      console.log(`\nMap clone vs in-place update (${size} entries, ${iterations} updates):`);
      console.log(`  Clone each time:  ${cloneTime.toFixed(2)}ms`);
      console.log(`  In-place update:  ${inPlaceTime.toFixed(2)}ms`);
      console.log(`  Speedup:          ${(cloneTime / inPlaceTime).toFixed(2)}x`);

      expect(inPlaceTime).toBeLessThan(cloneTime);
    });
  });
});

describe('Memory Optimization Tests', () => {
  describe('LRU Map (M1)', () => {
    class LRUMap<K, V> {
      private map = new Map<K, V>();
      private accessOrder: K[] = [];

      constructor(private maxSize: number) {}

      get(key: K): V | undefined {
        const value = this.map.get(key);
        if (value !== undefined) {
          const idx = this.accessOrder.indexOf(key);
          if (idx !== -1) {
            this.accessOrder.splice(idx, 1);
            this.accessOrder.push(key);
          }
        }
        return value;
      }

      set(key: K, value: V): void {
        if (this.map.has(key)) {
          this.map.set(key, value);
          const idx = this.accessOrder.indexOf(key);
          if (idx !== -1) {
            this.accessOrder.splice(idx, 1);
            this.accessOrder.push(key);
          }
        } else {
          while (this.map.size >= this.maxSize) {
            const oldest = this.accessOrder.shift();
            if (oldest !== undefined) {
              this.map.delete(oldest);
            }
          }
          this.map.set(key, value);
          this.accessOrder.push(key);
        }
      }

      delete(key: K): boolean {
        const idx = this.accessOrder.indexOf(key);
        if (idx !== -1) {
          this.accessOrder.splice(idx, 1);
        }
        return this.map.delete(key);
      }

      get size(): number {
        return this.map.size;
      }

      clear(): void {
        this.map.clear();
        this.accessOrder = [];
      }

      has(key: K): boolean {
        return this.map.has(key);
      }

      keys(): IterableIterator<K> {
        return this.map.keys();
      }
    }

    it('evicts oldest entries when exceeding capacity', () => {
      const lru = new LRUMap<string, number>(5);

      for (let i = 0; i < 5; i++) {
        lru.set(`key-${i}`, i);
      }
      expect(lru.size).toBe(5);

      lru.set('key-5', 5);
      expect(lru.size).toBe(5);
      expect(lru.has('key-0')).toBe(false);
      expect(lru.has('key-5')).toBe(true);
    });

    it('updates access order on get', () => {
      const lru = new LRUMap<string, number>(3);

      lru.set('a', 1);
      lru.set('b', 2);
      lru.set('c', 3);

      lru.get('a');

      lru.set('d', 4);

      expect(lru.has('a')).toBe(true);
      expect(lru.has('b')).toBe(false);
      expect(lru.has('c')).toBe(true);
      expect(lru.has('d')).toBe(true);
    });

    it('LRU vs standard Map memory pattern', () => {
      const iterations = 10000;
      const maxSize = 1000;

      const standardMap = new Map<string, number>();
      const start1 = performance.now();
      for (let i = 0; i < iterations; i++) {
        standardMap.set(`key-${i}`, i);
      }
      const standardTime = performance.now() - start1;
      const standardSize = standardMap.size;

      const lruMap = new LRUMap<string, number>(maxSize);
      const start2 = performance.now();
      for (let i = 0; i < iterations; i++) {
        lruMap.set(`key-${i}`, i);
      }
      const lruTime = performance.now() - start2;
      const lruSize = lruMap.size;

      console.log(`\nLRU vs Standard Map (${iterations} insertions, maxSize=${maxSize}):`);
      console.log(`  Standard Map: ${standardSize} entries, ${standardTime.toFixed(2)}ms`);
      console.log(`  LRU Map:      ${lruSize} entries, ${lruTime.toFixed(2)}ms`);
      console.log(`  Memory reduction: ${((1 - lruSize / standardSize) * 100).toFixed(1)}%`);

      expect(lruSize).toBeLessThanOrEqual(maxSize);
      expect(standardSize).toBe(iterations);
    });
  });

  describe('keyToIndexMap Optimization (M2)', () => {
    it('in-place update vs recreation performance', () => {
      const items = generateMockItems(10000);
      const iterations = 100;

      const start1 = performance.now();
      for (let iter = 0; iter < iterations; iter++) {
        const map = new Map<string, number>();
        for (let i = 0; i < items.length; i++) {
          map.set(getKey(items[i], i), i);
        }
      }
      const recreateTime = performance.now() - start1;

      const start2 = performance.now();
      const reuseMap = new Map<string, number>();
      for (let iter = 0; iter < iterations; iter++) {
        reuseMap.clear();
        for (let i = 0; i < items.length; i++) {
          reuseMap.set(getKey(items[i], i), i);
        }
      }
      const reuseTime = performance.now() - start2;

      console.log(`\nkeyToIndexMap optimization (${items.length} items, ${iterations} iterations):`);
      console.log(`  Recreate each time: ${recreateTime.toFixed(2)}ms`);
      console.log(`  Reuse with clear:   ${reuseTime.toFixed(2)}ms`);
      console.log(`  Speedup:            ${(recreateTime / reuseTime).toFixed(2)}x`);

      expect(reuseTime).toBeLessThan(recreateTime * 1.5);
    });

    it('differential update performance', () => {
      const baseItems = generateMockItems(10000);
      const iterations = 100;

      const prependCount = 10;

      const start1 = performance.now();
      for (let iter = 0; iter < iterations; iter++) {
        const map = new Map<string, number>();
        for (let i = 0; i < prependCount; i++) {
          map.set(`new-${iter}-${i}`, i);
        }
        for (let i = 0; i < baseItems.length; i++) {
          map.set(getKey(baseItems[i], i), i + prependCount);
        }
      }
      const fullRebuildTime = performance.now() - start1;

      const start2 = performance.now();
      const diffMap = new Map<string, number>();
      for (let i = 0; i < baseItems.length; i++) {
        diffMap.set(getKey(baseItems[i], i), i);
      }
      for (let iter = 0; iter < iterations; iter++) {
        for (const [key, idx] of diffMap) {
          diffMap.set(key, idx + prependCount);
        }
        for (let i = 0; i < prependCount; i++) {
          diffMap.set(`new-${iter}-${i}`, i);
        }
      }
      const diffUpdateTime = performance.now() - start2;

      console.log(`\nDifferential update (${baseItems.length} items, prepend ${prependCount}, ${iterations} iterations):`);
      console.log(`  Full rebuild:      ${fullRebuildTime.toFixed(2)}ms`);
      console.log(`  Differential:      ${diffUpdateTime.toFixed(2)}ms`);
      console.log(`  Ratio:             ${(fullRebuildTime / diffUpdateTime).toFixed(2)}x`);
    });
  });

  describe('Positions differential update (A)', () => {
    it('prepend with shift vs full recalculation', () => {
      const baseCount = 10000;
      const prependCount = 10;
      const iterations = 100;
      const estimatedHeight = 150;

      const baseItems = generateMockItems(baseCount);
      const heights = generateMockHeights(baseItems, getKey);
      const basePositions = calculatePositions(baseItems, heights, getKey, estimatedHeight);

      let fullRecalcTime: number;
      {
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
          const newItems = [...generateMockItems(prependCount, `prepend-${i}-`), ...baseItems];
          const newHeights = new Map(heights);
          newItems.slice(0, prependCount).forEach((item, idx) => {
            newHeights.set(getKey(item, idx), estimatedHeight + Math.random() * 50);
          });
          calculatePositions(newItems, newHeights, getKey, estimatedHeight);
        }
        fullRecalcTime = performance.now() - start;
      }

      let shiftTime: number;
      {
        const start = performance.now();
        for (let i = 0; i < iterations; i++) {
          const newItems = [...generateMockItems(prependCount, `prepend-${i}-`), ...baseItems];
          const newHeights = new Map(heights);
          newItems.slice(0, prependCount).forEach((item, idx) => {
            newHeights.set(getKey(item, idx), estimatedHeight + Math.random() * 50);
          });

          let prependHeight = 0;
          for (let j = 0; j < prependCount; j++) {
            prependHeight += newHeights.get(getKey(newItems[j], j)) ?? estimatedHeight;
          }

          const newPositions = new Array(newItems.length);
          let cumulative = 0;
          for (let j = 0; j < prependCount; j++) {
            newPositions[j] = cumulative;
            cumulative += newHeights.get(getKey(newItems[j], j)) ?? estimatedHeight;
          }
          for (let j = 0; j < basePositions.length; j++) {
            newPositions[prependCount + j] = basePositions[j] + prependHeight;
          }
        }
        shiftTime = performance.now() - start;
      }

      const speedup = fullRecalcTime / shiftTime;
      console.log(`\nPositions prepend optimization (${baseCount} items, prepend ${prependCount}, ${iterations} iterations):`);
      console.log(`  Full recalculation: ${fullRecalcTime.toFixed(2)}ms`);
      console.log(`  Shift existing:     ${shiftTime.toFixed(2)}ms`);
      console.log(`  Speedup:            ${speedup.toFixed(2)}x`);

      expect(speedup).toBeGreaterThan(1.1);
    });
  });

  describe('Heights cleanup simulation', () => {
    it('cleanup frequency impact', () => {
      const totalItems = 10000;
      const visibleItems = 20;
      const scrollSteps = 100;
      const heights1 = new Map<string, number>();
      for (let step = 0; step < scrollSteps; step++) {
        const startIdx = Math.floor((step / scrollSteps) * (totalItems - visibleItems));
        for (let i = 0; i < visibleItems; i++) {
          heights1.set(`item-${startIdx + i}`, 150 + Math.random() * 50);
        }
      }
      const sizeWithoutCleanup = heights1.size;

      const maxHeightsSize = visibleItems * 3;
      const heights2 = new Map<string, number>();
      for (let step = 0; step < scrollSteps; step++) {
        const startIdx = Math.floor((step / scrollSteps) * (totalItems - visibleItems));
        for (let i = 0; i < visibleItems; i++) {
          heights2.set(`item-${startIdx + i}`, 150 + Math.random() * 50);
        }
        if (heights2.size > maxHeightsSize) {
          const keysToDelete: string[] = [];
          let count = 0;
          for (const key of heights2.keys()) {
            if (count++ < heights2.size - maxHeightsSize) {
              keysToDelete.push(key);
            }
          }
          keysToDelete.forEach(k => heights2.delete(k));
        }
      }
      const sizeWithCleanup = heights2.size;

      console.log(`\nHeights cleanup simulation (${totalItems} total, ${visibleItems} visible, ${scrollSteps} steps):`);
      console.log(`  Without cleanup: ${sizeWithoutCleanup} entries`);
      console.log(`  With cleanup:    ${sizeWithCleanup} entries (max: ${maxHeightsSize})`);
      console.log(`  Memory reduction: ${((1 - sizeWithCleanup / sizeWithoutCleanup) * 100).toFixed(1)}%`);

      expect(sizeWithCleanup).toBeLessThanOrEqual(maxHeightsSize);
    });
  });
});

describe('Correctness Tests', () => {
  describe('binarySearchStart', () => {
    it('finds correct start index', () => {
      const positions = [0, 100, 200, 300, 400, 500];

      expect(binarySearchStart(positions, 0)).toBe(0);
      expect(binarySearchStart(positions, 50)).toBe(0);
      expect(binarySearchStart(positions, 100)).toBe(0);
      expect(binarySearchStart(positions, 150)).toBe(1);
      expect(binarySearchStart(positions, 250)).toBe(2);
      expect(binarySearchStart(positions, 500)).toBe(4);
      expect(binarySearchStart(positions, 600)).toBe(5);
    });

    it('handles empty array', () => {
      expect(binarySearchStart([], 100)).toBe(0);
    });
  });

  describe('binarySearchEnd', () => {
    it('finds correct end index', () => {
      const items = generateMockItems(6);
      const heights = new Map<string, number>();
      items.forEach((item, i) => heights.set(item.id, 100));
      const positions = [0, 100, 200, 300, 400, 500];

      expect(binarySearchEnd(positions, heights, items, getKey, 250, 100)).toBe(3);
      expect(binarySearchEnd(positions, heights, items, getKey, 100, 100)).toBe(2);
      expect(binarySearchEnd(positions, heights, items, getKey, 600, 100)).toBe(6);
    });
  });

  describe('calculatePositions', () => {
    it('calculates cumulative positions correctly', () => {
      const items = generateMockItems(5);
      const heights = new Map<string, number>();
      heights.set('item-0', 100);
      heights.set('item-1', 150);
      heights.set('item-2', 200);
      heights.set('item-3', 100);
      heights.set('item-4', 150);

      const positions = calculatePositions(items, heights, getKey, 100);

      expect(positions).toEqual([0, 100, 250, 450, 550]);
    });

    it('uses default height for missing entries', () => {
      const items = generateMockItems(3);
      const heights = new Map<string, number>();
      heights.set('item-0', 100);
      heights.set('item-2', 100);

      const positions = calculatePositions(items, heights, getKey, 150);

      expect(positions).toEqual([0, 100, 250]);
    });
  });

  describe('calculateTotalHeight', () => {
    it('calculates total height correctly', () => {
      const items = generateMockItems(3);
      const heights = new Map<string, number>();
      heights.set('item-0', 100);
      heights.set('item-1', 150);
      heights.set('item-2', 200);

      const positions = calculatePositions(items, heights, getKey, 100);
      const total = calculateTotalHeight(items, positions, heights, getKey, 100);

      expect(total).toBe(450);
    });
  });
});
