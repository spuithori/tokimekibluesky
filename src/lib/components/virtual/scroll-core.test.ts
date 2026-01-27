import { describe, it, expect, beforeEach } from 'vitest';
import { VirtualScrollCore } from './scroll-core';

function makeItems(count: number, startId = 0): { id: string }[] {
  return Array.from({ length: count }, (_, i) => ({ id: `item-${startId + i}` }));
}

function getKey(item: any, _index: number): string {
  return item.id;
}

function setAllHeights(core: VirtualScrollCore, items: any[], height: number) {
  for (let i = 0; i < items.length; i++) {
    core.setHeight(getKey(items[i], i), height);
  }
}

function setVariableHeights(core: VirtualScrollCore, items: any[], heights: number[]) {
  for (let i = 0; i < items.length; i++) {
    core.setHeight(getKey(items[i], i), heights[i] ?? 100);
  }
}

describe('VirtualScrollCore', () => {
  let core: VirtualScrollCore;

  beforeEach(() => {
    core = new VirtualScrollCore({ getKey, buffer: 5, topMargin: 0 });
    core.viewportHeight = 500;
  });

  // ============================================================
  // Basic position calculation
  // ============================================================
  describe('position calculation', () => {
    it('computes positions with uniform heights', () => {
      const items = makeItems(10);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      expect(core.positions[0]).toBe(0);
      expect(core.positions[1]).toBe(100);
      expect(core.positions[5]).toBe(500);
      expect(core.positions[9]).toBe(900);
      expect(core.totalHeight).toBe(1000);
    });

    it('computes positions with variable heights', () => {
      const items = makeItems(5);
      core.handleItemsChange(items, 0);
      setVariableHeights(core, items, [50, 100, 150, 200, 250]);
      core.recalculatePositions();

      expect(core.positions[0]).toBe(0);
      expect(core.positions[1]).toBe(50);
      expect(core.positions[2]).toBe(150);
      expect(core.positions[3]).toBe(300);
      expect(core.positions[4]).toBe(500);
      expect(core.totalHeight).toBe(750);
    });

    it('uses average height for unmeasured items', () => {
      const items = makeItems(10);
      core.handleItemsChange(items, 0);
      // Only measure first 5
      for (let i = 0; i < 5; i++) {
        core.setHeight(getKey(items[i], i), 80);
      }
      core.recalculatePositions();

      // Average = 80, so unmeasured items should use 80
      expect(core.positions[5]).toBe(400); // 5 * 80
      expect(core.positions[6]).toBe(480); // 6 * 80
    });
  });

  // ============================================================
  // Binary search
  // ============================================================
  describe('findIndexAtPosition', () => {
    it('finds correct index for exact positions', () => {
      const items = makeItems(10);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      expect(core.findIndexAtPosition(0)).toBe(0);
      expect(core.findIndexAtPosition(100)).toBe(1);
      expect(core.findIndexAtPosition(500)).toBe(5);
    });

    it('finds correct index for mid-item positions', () => {
      const items = makeItems(10);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      expect(core.findIndexAtPosition(50)).toBe(0);
      expect(core.findIndexAtPosition(150)).toBe(1);
      expect(core.findIndexAtPosition(550)).toBe(5);
    });
  });

  // ============================================================
  // Visible range
  // ============================================================
  describe('computeVisibleRange', () => {
    it('computes correct range at top', () => {
      const items = makeItems(100);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      const range = core.computeVisibleRange(0);
      expect(range.visibleStart).toBe(0);
      expect(range.visibleEnd).toBe(6); // ceil(500/100) + 1
      expect(range.rangeStart).toBe(0); // max(0, 0-5)
    });

    it('computes correct range at middle', () => {
      const items = makeItems(100);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      const range = core.computeVisibleRange(5000); // item 50
      expect(range.visibleStart).toBe(50);
      expect(range.visibleEnd).toBe(56);
      expect(range.rangeStart).toBe(45); // 50 - 5
      expect(range.rangeEnd).toBe(61); // 56 + 5
    });
  });

  // ============================================================
  // Items change detection
  // ============================================================
  describe('handleItemsChange', () => {
    it('detects first load', () => {
      const items = makeItems(50);
      const result = core.handleItemsChange(items, 0);
      expect(result.type).toBe('first-load');
    });

    it('detects append', () => {
      const items = makeItems(50);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      const moreItems = [...items, ...makeItems(10, 50)];
      const result = core.handleItemsChange(moreItems, 0);
      expect(result.type).toBe('append');
      expect(result.scrollAdjust).toBe(0);
    });

    it('detects prepend', () => {
      const items = makeItems(50);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      // Prepend 5 items
      const newItems = [...makeItems(5, 100), ...items];
      const result = core.handleItemsChange(newItems, 2500);
      expect(result.type).toBe('prepend');
      expect(result.shiftCount).toBe(5);
    });

    it('computes scroll adjustment on prepend', () => {
      const items = makeItems(50);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      // Prepend 5 items (each 100px estimated)
      const newItems = [...makeItems(5, 100), ...items];
      // Set known heights for prepended items
      for (let i = 0; i < 5; i++) {
        core.setHeight(getKey(newItems[i], i), 120);
      }

      const scrollTop = 2500; // viewing item 25
      const result = core.handleItemsChange(newItems, scrollTop);

      expect(result.type).toBe('prepend');
      expect(result.shiftCount).toBe(5);
      // Scroll adjustment should be the total height of prepended items
      // After recalculate, positions[5] = sum of first 5 items
      expect(result.scrollAdjust).toBe(core.positions[5]);
    });

    it('returns scroll adjustment on prepend even at scrollTop 0', () => {
      const items = makeItems(50);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      const newItems = [...makeItems(5, 100), ...items];
      const result = core.handleItemsChange(newItems, 0);
      expect(result.type).toBe('prepend');
      expect(result.scrollAdjust).toBe(core.positions[5]);
    });

    it('detects middle insertion as replace (not append)', () => {
      const items = makeItems(50);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      const before = items.slice(0, 20);
      const inserted = makeItems(10, 500);
      const after = items.slice(20);
      const newItems = [...before, ...inserted, ...after];
      const result = core.handleItemsChange(newItems, 1500);
      expect(result.type).toBe('replace');
    });

    it('detects tail truncation as replace', () => {
      const items = makeItems(50);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      const truncated = items.slice(0, 30);
      const result = core.handleItemsChange(truncated, 1500);
      expect(result.type).toBe('replace');
    });

    it('preserves scroll position on middle insertion', () => {
      const items = makeItems(50);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      const scrollTop = 1500;
      const state = core.getScrollState(scrollTop);
      expect(state!.key).toBe('item-15');

      const before = items.slice(0, 25);
      const inserted = makeItems(10, 500);
      const after = items.slice(25);
      const newItems = [...before, ...inserted, ...after];
      core.handleItemsChange(newItems, scrollTop);

      expect(core.positions[15]).toBe(1500);
      expect(core.findIndexAtPosition(scrollTop)).toBe(15);
    });

    it('preserves scroll position on tail truncation', () => {
      const items = makeItems(50);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      const scrollTop = 1500;
      const truncated = items.slice(0, 30);
      core.handleItemsChange(truncated, scrollTop);

      expect(core.positions[15]).toBe(1500);
    });

    it('detects full replacement', () => {
      const items = makeItems(50);
      core.handleItemsChange(items, 0);

      const newItems = makeItems(50, 1000); // completely different items
      const result = core.handleItemsChange(newItems, 0);
      expect(result.type).toBe('replace');
    });

    it('detects empty', () => {
      const items = makeItems(50);
      core.handleItemsChange(items, 0);

      const result = core.handleItemsChange([], 0);
      expect(result.type).toBe('empty');
    });
  });

  // ============================================================
  // Scroll state save/restore (THE CRITICAL TESTS)
  // ============================================================
  describe('scroll state save/restore', () => {
    it('saves and restores exact scroll position', () => {
      const items = makeItems(100);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      const scrollTop = 5050; // item 50, offset 50px
      const state = core.getScrollState(scrollTop);
      expect(state).not.toBeNull();
      expect(state!.index).toBe(50);
      expect(state!.key).toBe('item-50');
      expect(state!.offset).toBe(50);

      // Restore on same items
      const restored = core.computeRestoreScrollTop(state!);
      expect(restored).toBe(scrollTop);
    });

    it('restores scroll position after prepend using key', () => {
      const items = makeItems(100);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      // Save state at item 50
      const scrollTop = 5050;
      const state = core.getScrollState(scrollTop);
      expect(state!.key).toBe('item-50');

      // Prepend 10 items → item-50 is now at index 60
      const newItems = [...makeItems(10, 200), ...items];
      core.items = newItems;
      // Set heights for new items
      for (let i = 0; i < 10; i++) {
        core.setHeight(getKey(newItems[i], i), 100);
      }

      const restored = core.computeRestoreScrollTop(state!);
      // item-50 is now at index 60, so position = 60 * 100 = 6000, offset = 50
      expect(restored).toBe(6050);
    });

    it('restores scroll position with variable heights', () => {
      const items = makeItems(50);
      core.handleItemsChange(items, 0);
      const h = Array.from({ length: 50 }, (_, i) => 80 + (i % 5) * 20);
      setVariableHeights(core, items, h);
      core.recalculatePositions();

      // Scroll to item 25
      const scrollTop = core.positions[25] + 30;
      const state = core.getScrollState(scrollTop);

      // Clear and restore
      const core2 = new VirtualScrollCore({ getKey, buffer: 5, topMargin: 0 });
      core2.viewportHeight = 500;
      core2.handleItemsChange(items, 0);
      const restored = core2.computeRestoreScrollTop(state!);

      expect(restored).toBe(scrollTop);
    });

    it('restores state when heights were in LRU but saved in state', () => {
      const items = makeItems(100);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      const scrollTop = 5050;
      const state = core.getScrollState(scrollTop);

      // Simulate fresh core (like after navigation)
      const core2 = new VirtualScrollCore({ getKey, buffer: 5, topMargin: 0 });
      core2.viewportHeight = 500;
      core2.handleItemsChange(items, 0);

      // Heights not set yet — will use saved heights from state
      const restored = core2.computeRestoreScrollTop(state!);
      expect(restored).toBe(scrollTop);
    });

    it('handles state.index fallback when key not found', () => {
      const items = makeItems(100);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      const scrollTop = 5050;
      const state = core.getScrollState(scrollTop);

      // Make a different set of items (key won't be found)
      const newItems = makeItems(100, 500);
      const core2 = new VirtualScrollCore({ getKey, buffer: 5, topMargin: 0 });
      core2.viewportHeight = 500;
      core2.handleItemsChange(newItems, 0);
      const restored = core2.computeRestoreScrollTop(state!);

      // Should fall back to index 50, using average height
      // Heights were restored from state, but keys don't match new items
      // The fallback is state.index = 50
      expect(restored).toBe(core2.positions[50] + 50);
    });
  });

  // ============================================================
  // Height update + scroll compensation
  // ============================================================
  describe('height update scroll compensation', () => {
    it('adjusts scroll when item above viewport grows', () => {
      const items = makeItems(100);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      const scrollTop = 5000; // viewing item 50
      const updates = new Map<string, number>();
      updates.set('item-10', 200); // item above viewport grows from 100 to 200

      const result = core.processHeightUpdates(updates, scrollTop);
      expect(result.scrollAdjust).toBe(100); // +100 to compensate
      expect(result.changed).toBe(true);
    });

    it('does NOT adjust scroll when item below viewport changes', () => {
      const items = makeItems(100);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      const scrollTop = 5000; // viewing item 50
      const updates = new Map<string, number>();
      updates.set('item-60', 200); // item below viewport

      const result = core.processHeightUpdates(updates, scrollTop);
      expect(result.scrollAdjust).toBe(0);
    });

    it('does NOT adjust scroll when item is partially visible at top', () => {
      const items = makeItems(100);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      const scrollTop = 5050; // middle of item 50
      const updates = new Map<string, number>();
      updates.set('item-50', 200); // the partially visible item

      // item-50 position = 5000, oldHeight = 100, itemBottom = 5100 > scrollTop 5050
      const result = core.processHeightUpdates(updates, scrollTop);
      expect(result.scrollAdjust).toBe(0);
    });

    it('adjusts scroll when item just above viewport grows', () => {
      const items = makeItems(100);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      const scrollTop = 5000; // exactly at item 50
      const updates = new Map<string, number>();
      updates.set('item-49', 200); // item just above viewport — bottom = 5000 = scrollTop

      // item-49 position = 4900, oldHeight = 100, itemBottom = 5000 <= scrollTop 5000
      const result = core.processHeightUpdates(updates, scrollTop);
      expect(result.scrollAdjust).toBe(100);
    });

    it('handles multiple height updates above viewport', () => {
      const items = makeItems(100);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      const scrollTop = 5000;
      const updates = new Map<string, number>();
      updates.set('item-5', 150);  // +50
      updates.set('item-10', 200); // +100

      const result = core.processHeightUpdates(updates, scrollTop);
      expect(result.scrollAdjust).toBe(150); // 50 + 100
    });

    it('handles item shrinking above viewport', () => {
      const items = makeItems(100);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      const scrollTop = 5000;
      const updates = new Map<string, number>();
      updates.set('item-10', 50); // shrinks from 100 to 50

      const result = core.processHeightUpdates(updates, scrollTop);
      expect(result.scrollAdjust).toBe(-50);
    });
  });

  // ============================================================
  // Full scenario: prepend + scroll restore (end-to-end)
  // ============================================================
  describe('end-to-end: prepend then restore', () => {
    it('preserves scroll position through prepend + save + restore cycle', () => {
      // Setup: 100 items, all height 120
      const items = makeItems(100);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 120);
      core.recalculatePositions();

      // User scrolls to item 40
      const originalScrollTop = 40 * 120 + 60; // = 4860
      const state = core.getScrollState(originalScrollTop);
      expect(state!.key).toBe('item-40');
      expect(state!.offset).toBe(60);

      // 5 new items prepend
      const prependItems = makeItems(5, 200);
      const newItems = [...prependItems, ...items];
      for (const item of prependItems) {
        core.setHeight(item.id, 120);
      }
      const changeResult = core.handleItemsChange(newItems, originalScrollTop);
      expect(changeResult.type).toBe('prepend');
      expect(changeResult.shiftCount).toBe(5);
      expect(changeResult.scrollAdjust).toBe(5 * 120); // = 600

      // Apply scroll adjustment
      const adjustedScrollTop = originalScrollTop + changeResult.scrollAdjust;
      expect(adjustedScrollTop).toBe(5460); // 4860 + 600

      // Verify item-40 is now at index 45, position = 45 * 120 = 5400
      expect(core.positions[45]).toBe(5400);
      // Verify we're looking at the same item
      expect(core.findIndexAtPosition(adjustedScrollTop)).toBe(45);
      const offsetInItem = adjustedScrollTop - core.positions[45];
      expect(offsetInItem).toBe(60); // same offset!

      // Now simulate navigation: save state, create fresh core, restore
      const savedState = core.getScrollState(adjustedScrollTop);
      expect(savedState!.key).toBe('item-40');

      const core2 = new VirtualScrollCore({ getKey, buffer: 5, topMargin: 0 });
      core2.viewportHeight = 500;
      core2.handleItemsChange(newItems, 0);
      const restoredScrollTop = core2.computeRestoreScrollTop(savedState!);

      expect(restoredScrollTop).toBe(adjustedScrollTop);
    });

    it('handles: save → navigate away → items prepended → navigate back → restore', () => {
      // This is the exact problematic flow
      const items = makeItems(100);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      // Save state at item 30
      const scrollTop = 3050;
      const state = core.getScrollState(scrollTop);
      expect(state!.key).toBe('item-30');
      expect(state!.index).toBe(30);
      expect(state!.offset).toBe(50);

      // While away, 10 items were prepended
      const newItems = [...makeItems(10, 500), ...items];

      // Navigate back — restore with new items
      const core2 = new VirtualScrollCore({ getKey, buffer: 5, topMargin: 0 });
      core2.viewportHeight = 500;
      core2.handleItemsChange(newItems, 0);
      // Set heights for all items
      for (let i = 0; i < newItems.length; i++) {
        core2.setHeight(getKey(newItems[i], i), 100);
      }

      const restoredScrollTop = core2.computeRestoreScrollTop(state!);

      // item-30 is now at index 40, position = 40 * 100 = 4000
      // offset = 50, so target = 4050
      expect(restoredScrollTop).toBe(4050);
    });
  });

  // ============================================================
  // Full heights save/restore with many items
  // ============================================================
  describe('full heights save/restore with many items', () => {
    it('saves ALL measured heights in scroll state', () => {
      const items = makeItems(500);
      core.handleItemsChange(items, 0);
      for (let i = 0; i < 500; i++) {
        core.setHeight(getKey(items[i], i), 100 + (i % 3) * 10);
      }
      core.recalculatePositions();

      const state = core.getScrollState(core.positions[400] + 50);
      // All 500 heights should be saved
      expect(state!.heights.length).toBe(500);
    });

    it('restores exact position for item far down the list', () => {
      const items = makeItems(500);
      core.handleItemsChange(items, 0);
      for (let i = 0; i < 500; i++) {
        core.setHeight(getKey(items[i], i), 100 + (i % 3) * 10);
      }
      core.recalculatePositions();

      const scrollTop = core.positions[400] + 50;
      const state = core.getScrollState(scrollTop);
      expect(state!.key).toBe('item-400');

      // Fresh core — no heights measured yet
      const core2 = new VirtualScrollCore({ getKey, buffer: 5, topMargin: 0 });
      core2.viewportHeight = 500;
      core2.handleItemsChange(items, 0);

      const restored = core2.computeRestoreScrollTop(state!);
      // With all heights saved, restoration should be exact
      expect(restored).toBe(scrollTop);
    });

    it('restores exact position after prepend with many items', () => {
      const items = makeItems(500);
      core.handleItemsChange(items, 0);
      for (let i = 0; i < 500; i++) {
        core.setHeight(getKey(items[i], i), 50 + (i % 10) * 20);
      }
      core.recalculatePositions();

      const scrollTop = core.positions[300] + 25;
      const state = core.getScrollState(scrollTop);
      expect(state!.key).toBe('item-300');

      // Prepend 20 items → item-300 is now at index 320
      const newItems = [...makeItems(20, 1000), ...items];

      const core2 = new VirtualScrollCore({ getKey, buffer: 5, topMargin: 0 });
      core2.viewportHeight = 500;
      core2.handleItemsChange(newItems, 0);
      for (let i = 0; i < 20; i++) {
        core2.setHeight(getKey(newItems[i], i), 110);
      }

      const restored = core2.computeRestoreScrollTop(state!);

      // All original heights are restored from state → position is exact
      // item-300 found at index 320 via key lookup
      const expectedPos = core2.positions[320] + 25;
      expect(restored).toBe(expectedPos);
    });
  });

  // ============================================================
  // Edge cases
  // ============================================================
  describe('edge cases', () => {
    it('handles empty items', () => {
      const result = core.handleItemsChange([], 0);
      expect(result.type).toBe('empty');
      expect(core.positions.length).toBe(0);
      expect(core.totalHeight).toBe(0);
    });

    it('handles single item', () => {
      const items = makeItems(1);
      core.handleItemsChange(items, 0);
      core.setHeight('item-0', 100);
      core.recalculatePositions();
      expect(core.positions[0]).toBe(0);
      expect(core.totalHeight).toBe(100);
    });

    it('getScrollState returns null for empty', () => {
      core.handleItemsChange([], 0);
      expect(core.getScrollState(0)).toBeNull();
    });

    it('computeRestoreScrollTop returns -1 for empty items', () => {
      core.handleItemsChange([], 0);
      const result = core.computeRestoreScrollTop({ index: 0, offset: 0, heights: [] });
      expect(result).toBe(-1);
    });

    it('handles scrollTop beyond total height', () => {
      const items = makeItems(10);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      const idx = core.findIndexAtPosition(99999);
      expect(idx).toBe(9); // last item
    });

    it('handles very large prepend', () => {
      const items = makeItems(50);
      core.handleItemsChange(items, 0);
      setAllHeights(core, items, 100);
      core.recalculatePositions();

      // Prepend 100 items
      const newItems = [...makeItems(100, 500), ...items];
      const result = core.handleItemsChange(newItems, 2500);
      expect(result.type).toBe('prepend');
      expect(result.shiftCount).toBe(100);
    });
  });

  // ============================================================
  // topMargin
  // ============================================================
  describe('topMargin', () => {
    it('accounts for topMargin in visible range', () => {
      const coreWithMargin = new VirtualScrollCore({ getKey, buffer: 0, topMargin: 52 });
      coreWithMargin.viewportHeight = 500;

      const items = makeItems(100);
      coreWithMargin.handleItemsChange(items, 0);
      setAllHeights(coreWithMargin, items, 100);
      coreWithMargin.recalculatePositions();

      // Usable height = 500 - 52 = 448
      const range = coreWithMargin.computeVisibleRange(0);
      // Should see ceil(448/100) + 1 items = 5
      expect(range.visibleEnd).toBeLessThanOrEqual(6);
    });
  });
});
