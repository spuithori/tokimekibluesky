import { test, expect, type Page, type CDPSession } from '@playwright/test';

/**
 * 実メモリ使用量ベンチマーク
 *
 * JSHeapUsedSize だけでなく、DOM ノード数・イベントリスナー数・
 * Layout/Recalculate コストを含めた包括的なメモリ比較を行う。
 *
 * 各ライブラリで 1000 件のリアルな Bluesky タイムラインデータを
 * 読み込み、全件スクロール後の状態を計測する。
 */

const BASE = process.env.BENCH_BASE_URL ?? '';
const LIBRARIES = [
  { name: 'ours',     url: `${BASE}/test/realistic-bench/ours`,     label: 'VirtualList (ours)' },
  { name: 'virtua',   url: `${BASE}/test/realistic-bench/virtua`,   label: 'virtua' },
  { name: 'tanstack', url: `${BASE}/test/realistic-bench/tanstack`, label: '@tanstack/svelte-virtual' },
] as const;

const ITEM_COUNT = 1000;
const SEED = 42;

// --- Types ---

interface MemoryMetrics {
  jsHeapUsed: number;
  jsHeapTotal: number;
  domNodes: number;
  eventListeners: number;
  renderedItems: number;
}

interface BenchmarkResult {
  library: string;
  baseline: MemoryMetrics;
  loaded: MemoryMetrics;
  afterScroll: MemoryMetrics;
  delta: {
    jsHeapUsed: number;
    jsHeapTotal: number;
    domNodes: number;
    eventListeners: number;
  };
  perItem: {
    jsHeapBytes: number;
    domNodes: number;
  };
  estimatedTotalKB: number;
}

// --- CDP Helpers ---

async function collectGarbage(cdp: CDPSession): Promise<void> {
  await cdp.send('HeapProfiler.collectGarbage');
  await new Promise(r => setTimeout(r, 300));
  await cdp.send('HeapProfiler.collectGarbage');
  await new Promise(r => setTimeout(r, 200));
}

async function getMetrics(cdp: CDPSession): Promise<Record<string, number>> {
  const result = await cdp.send('Performance.getMetrics');
  const map: Record<string, number> = {};
  for (const m of result.metrics) {
    map[m.name] = m.value;
  }
  return map;
}

async function getStableMetrics(cdp: CDPSession): Promise<MemoryMetrics> {
  await collectGarbage(cdp);
  const m1 = await getMetrics(cdp);
  await collectGarbage(cdp);
  const m2 = await getMetrics(cdp);

  return {
    jsHeapUsed: Math.min(m1['JSHeapUsedSize'] ?? 0, m2['JSHeapUsedSize'] ?? 0),
    jsHeapTotal: Math.min(m1['JSHeapTotalSize'] ?? 0, m2['JSHeapTotalSize'] ?? 0),
    domNodes: m2['Nodes'] ?? 0,
    eventListeners: m2['JSEventListeners'] ?? 0,
    renderedItems: 0,
  };
}

// DOM ノード 1 個あたりの推定メモリコスト (bytes)
// Chromium では約 0.3-0.5 KB/node (Blink 側のメモリ、V8 heap 外)
const ESTIMATED_DOM_NODE_COST = 400;

function estimateTotalMemory(delta: { jsHeapUsed: number; domNodes: number }): number {
  return (delta.jsHeapUsed + delta.domNodes * ESTIMATED_DOM_NODE_COST) / 1024;
}

// --- Page Helpers ---

async function api(page: Page, method: string, ...args: any[]): Promise<any> {
  return page.evaluate(
    ({ method, args }) => (window as any).__realisticBench[method](...args),
    { method, args }
  );
}

async function waitForRender(page: Page): Promise<void> {
  await api(page, 'waitForRender');
}

function formatMB(bytes: number): string {
  return (bytes / 1024 / 1024).toFixed(2);
}

function formatKB(bytes: number): string {
  return (bytes / 1024).toFixed(1);
}

// --- Tests ---

test.describe('Realistic Memory Benchmark (1000 items with rich content)', () => {
  test.describe.configure({ mode: 'serial' });

  const results: BenchmarkResult[] = [];

  for (const lib of LIBRARIES) {
    test(`Memory: ${lib.label}`, async ({ page, context }) => {
      test.setTimeout(120_000);

      const cdp = await context.newCDPSession(page);
      await cdp.send('HeapProfiler.enable');
      await cdp.send('Performance.enable');

      try {
        console.log(`\n--- ${lib.label} ---`);

        // 1. Navigate and measure baseline
        await page.goto(lib.url, { waitUntil: 'networkidle' });
        await page.waitForTimeout(1000);
        await waitForRender(page);

        const baseline = await getStableMetrics(cdp);
        baseline.renderedItems = await api(page, 'getRenderedItemCount');
        console.log(`  Baseline: heap=${formatMB(baseline.jsHeapUsed)}MB, DOM=${baseline.domNodes}, listeners=${baseline.eventListeners}`);

        // 2. Load 1000 items
        await api(page, 'loadFeed', ITEM_COUNT, SEED);
        await page.waitForTimeout(500);
        await waitForRender(page);

        const loaded = await getStableMetrics(cdp);
        loaded.renderedItems = await api(page, 'getRenderedItemCount');
        console.log(`  After load: heap=${formatMB(loaded.jsHeapUsed)}MB, DOM=${loaded.domNodes}, rendered=${loaded.renderedItems}, listeners=${loaded.eventListeners}`);

        // 3. Scroll through all items (trigger height measurements)
        const totalItems = await api(page, 'getFeedCount');
        const steps = Math.ceil(totalItems / 100);
        for (let i = 0; i < steps; i++) {
          const targetIndex = Math.min((i + 1) * 100, totalItems - 1);
          await api(page, 'scrollToIndex', targetIndex);
          await page.waitForTimeout(100);
        }

        // Scroll back to middle
        await api(page, 'scrollToIndex', 500);
        await page.waitForTimeout(500);
        await waitForRender(page);

        const afterScroll = await getStableMetrics(cdp);
        afterScroll.renderedItems = await api(page, 'getRenderedItemCount');
        console.log(`  After scroll: heap=${formatMB(afterScroll.jsHeapUsed)}MB, DOM=${afterScroll.domNodes}, rendered=${afterScroll.renderedItems}, listeners=${afterScroll.eventListeners}`);

        // 4. Calculate deltas (after scroll vs baseline)
        const delta = {
          jsHeapUsed: afterScroll.jsHeapUsed - baseline.jsHeapUsed,
          jsHeapTotal: afterScroll.jsHeapTotal - baseline.jsHeapTotal,
          domNodes: afterScroll.domNodes - baseline.domNodes,
          eventListeners: afterScroll.eventListeners - baseline.eventListeners,
        };

        const perItem = {
          jsHeapBytes: Math.round(delta.jsHeapUsed / ITEM_COUNT),
          domNodes: Number((delta.domNodes / afterScroll.renderedItems).toFixed(1)),
        };

        const estimatedTotalKB = estimateTotalMemory(delta);

        console.log(`  Delta: heap=${formatKB(delta.jsHeapUsed)}KB, DOM=${delta.domNodes}, listeners=${delta.eventListeners}`);
        console.log(`  Per item: heap=${perItem.jsHeapBytes}B, DOM/rendered=${perItem.domNodes}`);
        console.log(`  Estimated total memory: ${estimatedTotalKB.toFixed(1)}KB (heap + DOM*${ESTIMATED_DOM_NODE_COST}B)`);

        results.push({
          library: lib.label,
          baseline,
          loaded,
          afterScroll,
          delta,
          perItem,
          estimatedTotalKB,
        });
      } finally {
        try {
          await cdp.send('HeapProfiler.disable');
          await cdp.send('Performance.disable');
          await cdp.detach();
        } catch { /* ignore */ }
      }
    });
  }

  test('Comparison table', async () => {
    if (results.length === 0) {
      console.log('\n  No results collected.');
      return;
    }

    const pad = (s: string, n: number) => s.padStart(n);

    console.log('\n' + '='.repeat(120));
    console.log('  REALISTIC MEMORY BENCHMARK — 1000 Bluesky Timeline Items');
    console.log('='.repeat(120));

    // Table 1: Raw metrics
    console.log('\n  [1] Raw Metrics (after loading 1000 items + scroll-through)');
    const h1 = [
      'Library'.padEnd(28),
      pad('Heap(MB)', 10),
      pad('HeapΔ(KB)', 11),
      pad('DOM', 6),
      pad('DOMΔ', 6),
      pad('Listeners', 10),
      pad('ListenersΔ', 11),
      pad('Rendered', 9),
    ].join(' | ');
    console.log('  ' + h1);
    console.log('  ' + h1.replace(/[^|]/g, '-'));

    for (const r of results) {
      const row = [
        r.library.padEnd(28),
        pad(formatMB(r.afterScroll.jsHeapUsed), 10),
        pad(formatKB(r.delta.jsHeapUsed), 11),
        pad(String(r.afterScroll.domNodes), 6),
        pad(String(r.delta.domNodes), 6),
        pad(String(r.afterScroll.eventListeners), 10),
        pad(String(r.delta.eventListeners), 11),
        pad(String(r.afterScroll.renderedItems), 9),
      ].join(' | ');
      console.log('  ' + row);
    }

    // Table 2: Per-item overhead
    console.log('\n  [2] Per-Item Overhead');
    const h2 = [
      'Library'.padEnd(28),
      pad('Heap/item(B)', 13),
      pad('DOM/rendered', 13),
      pad('Est.Total(KB)', 15),
    ].join(' | ');
    console.log('  ' + h2);
    console.log('  ' + h2.replace(/[^|]/g, '-'));

    for (const r of results) {
      const row = [
        r.library.padEnd(28),
        pad(String(r.perItem.jsHeapBytes), 13),
        pad(String(r.perItem.domNodes), 13),
        pad(r.estimatedTotalKB.toFixed(1), 15),
      ].join(' | ');
      console.log('  ' + row);
    }

    // Table 3: Comparison (vs ours)
    if (results.length > 1) {
      const ours = results[0];
      console.log('\n  [3] Comparison vs VirtualList (ours)');
      const h3 = [
        'Library'.padEnd(28),
        pad('HeapΔ vs ours', 14),
        pad('DOMΔ vs ours', 13),
        pad('EstMemΔ vs ours', 16),
      ].join(' | ');
      console.log('  ' + h3);
      console.log('  ' + h3.replace(/[^|]/g, '-'));

      for (const r of results) {
        const heapDiff = r.delta.jsHeapUsed - ours.delta.jsHeapUsed;
        const domDiff = r.delta.domNodes - ours.delta.domNodes;
        const estDiff = r.estimatedTotalKB - ours.estimatedTotalKB;

        const heapPct = ours.delta.jsHeapUsed > 0
          ? ((heapDiff / ours.delta.jsHeapUsed) * 100).toFixed(0) + '%'
          : 'N/A';
        const domPct = ours.delta.domNodes > 0
          ? ((domDiff / ours.delta.domNodes) * 100).toFixed(0) + '%'
          : 'N/A';
        const estPct = ours.estimatedTotalKB > 0
          ? ((estDiff / ours.estimatedTotalKB) * 100).toFixed(0) + '%'
          : 'N/A';

        const row = [
          r.library.padEnd(28),
          pad(`${heapDiff > 0 ? '+' : ''}${formatKB(heapDiff)} (${heapPct})`, 14),
          pad(`${domDiff > 0 ? '+' : ''}${domDiff} (${domPct})`, 13),
          pad(`${estDiff > 0 ? '+' : ''}${estDiff.toFixed(1)} (${estPct})`, 16),
        ].join(' | ');
        console.log('  ' + row);
      }
    }

    console.log('\n' + '='.repeat(120));

    // Assertions: our library should work
    const ours = results.find(r => r.library.includes('ours'));
    if (ours) {
      // Rendered items should be bounded (virtual scroll working)
      expect(ours.afterScroll.renderedItems).toBeLessThan(100);
      // Heap should be reasonable for 1000 items
      expect(ours.delta.jsHeapUsed).toBeLessThan(20 * 1024 * 1024); // < 20MB
    }
  });
});
