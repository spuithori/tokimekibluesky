import { test, expect, type Page, type CDPSession } from '@playwright/test';

// --- Library definitions ---

const BASE = process.env.BENCH_BASE_URL ?? '';
const LIBRARIES = [
  { name: 'ours',     url: `${BASE}/test/benchmark-ours`,     label: 'VirtualList (ours)' },
  { name: 'virtua',   url: `${BASE}/test/benchmark-virtua`,   label: 'virtua' },
  { name: 'tanstack', url: `${BASE}/test/benchmark-tanstack`,  label: '@tanstack/svelte-virtual' },
] as const;

const RUNS = 3;
const TOP_MARGIN = 108;

// --- Types ---

interface BenchmarkResult {
  library: string;
  initRender: number;
  prependLatency: number;
  scrollFPS: number;
  heapMB: number;
  domNodes: number;
  renderedItems: number;
  anchorDrift: number;
  scrollToLatency: number;
  scrollToAccuracy: number;
  scrollRestoreAccuracy: number;
  accumulatedDrift: number;
  heightChangeDrift: number;
  scrollToSettleTime: number;
  restoreSettleTime: number;
}

// --- CDP Helpers ---

async function collectGarbage(cdp: CDPSession): Promise<void> {
  await cdp.send('HeapProfiler.collectGarbage');
  await new Promise(r => setTimeout(r, 300));
  await cdp.send('HeapProfiler.collectGarbage');
  await new Promise(r => setTimeout(r, 200));
}

async function getHeapUsed(cdp: CDPSession): Promise<number> {
  const metrics = await cdp.send('Performance.getMetrics');
  const metric = metrics.metrics.find((m: any) => m.name === 'JSHeapUsedSize');
  return metric?.value ?? 0;
}

async function getDOMNodeCount(cdp: CDPSession): Promise<number> {
  const metrics = await cdp.send('Performance.getMetrics');
  const metric = metrics.metrics.find((m: any) => m.name === 'Nodes');
  return metric?.value ?? 0;
}

async function getStableHeap(cdp: CDPSession): Promise<number> {
  await collectGarbage(cdp);
  const h1 = await getHeapUsed(cdp);
  await collectGarbage(cdp);
  const h2 = await getHeapUsed(cdp);
  return Math.min(h1, h2);
}

async function getHeapBreakdown(cdp: CDPSession): Promise<void> {
  await collectGarbage(cdp);
  // Take heap snapshot and analyze by category
  const chunks: string[] = [];
  cdp.on('HeapProfiler.addHeapSnapshotChunk', (params: any) => {
    chunks.push(params.chunk);
  });
  await cdp.send('HeapProfiler.takeHeapSnapshot', { reportProgress: false } as any);
  const snapshot = JSON.parse(chunks.join(''));

  // Parse V8 heap snapshot format
  const nodeFields = snapshot.snapshot.meta.node_fields;
  const nodeTypes = snapshot.snapshot.meta.node_types;
  const nodes = snapshot.nodes;
  const strings = snapshot.strings;

  const typeIdx = nodeFields.indexOf('type');
  const nameIdx = nodeFields.indexOf('name');
  const selfSizeIdx = nodeFields.indexOf('self_size');
  const fieldCount = nodeFields.length;

  // Aggregate by type
  const byType = new Map<string, { count: number; size: number }>();
  const typeStrings = nodeTypes[0];

  for (let i = 0; i < nodes.length; i += fieldCount) {
    const typeId = nodes[i + typeIdx];
    const selfSize = nodes[i + selfSizeIdx];
    const typeName = typeStrings[typeId] || 'unknown';

    const entry = byType.get(typeName) || { count: 0, size: 0 };
    entry.count++;
    entry.size += selfSize;
    byType.set(typeName, entry);
  }

  // Sort by size descending
  const sorted = [...byType.entries()].sort((a, b) => b[1].size - a[1].size);
  console.log('    [heap-breakdown]');
  for (const [type, { count, size }] of sorted.slice(0, 10)) {
    console.log(`      ${type}: ${(size / 1024).toFixed(1)}KB (${count} objects)`);
  }

  // Detailed breakdown for top categories: show named objects
  for (const category of ['native', 'code', 'string']) {
    const catIdx = typeStrings.indexOf(category);
    if (catIdx === -1) continue;
    const named = new Map<string, { count: number; size: number }>();
    for (let i = 0; i < nodes.length; i += fieldCount) {
      if (nodes[i + typeIdx] !== catIdx) continue;
      const selfSize = nodes[i + selfSizeIdx];
      const name = strings[nodes[i + nameIdx]] || '(unnamed)';
      const entry = named.get(name) || { count: 0, size: 0 };
      entry.count++;
      entry.size += selfSize;
      named.set(name, entry);
    }
    const topNamed = [...named.entries()].sort((a, b) => b[1].size - a[1].size).slice(0, 15);
    console.log(`    [${category}-detail]`);
    for (const [name, { count, size }] of topNamed) {
      console.log(`      ${name}: ${(size / 1024).toFixed(1)}KB (${count})`);
    }
  }
}

// --- Page Helpers ---

async function api(page: Page, method: string, ...args: any[]): Promise<any> {
  return page.evaluate(
    ({ method, args }) => (window as any).__benchmarkTest[method](...args),
    { method, args }
  );
}

async function waitForStable(page: Page, timeout = 2000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const stable = await api(page, 'isScrollStable');
    if (stable) {
      await page.waitForTimeout(50);
      const stillStable = await api(page, 'isScrollStable');
      if (stillStable) return;
    }
    await page.waitForTimeout(16);
  }
}

async function waitForRender(page: Page): Promise<void> {
  await page.evaluate(() =>
    new Promise<void>(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    )
  );
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

// --- Benchmark functions ---

async function measureInitialRender(page: Page, url: string): Promise<number> {
  const times: number[] = [];
  for (let run = 0; run < RUNS; run++) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.benchmark-item', { timeout: 10000 });
    await page.waitForTimeout(500);

    const time = await page.evaluate(async () => {
      const api = (window as any).__benchmarkTest;
      api.reset(0);
      // Wait for empty state to settle
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      await new Promise(r => setTimeout(r, 200));

      const start = performance.now();
      api.reset(200);
      // Wait for layout to complete (multiple rAF to ensure reflow)
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => {
        requestAnimationFrame(() => r());
      })));
      return performance.now() - start;
    });
    times.push(time);
  }
  return median(times);
}

async function measurePrependLatency(page: Page, url: string): Promise<{ latency: number; drift: number }> {
  const latencies: number[] = [];
  const drifts: number[] = [];

  for (let run = 0; run < RUNS; run++) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.benchmark-item');
    await page.waitForTimeout(500);

    // Scroll to middle
    await api(page, 'scrollToIndex', 50);
    await page.waitForTimeout(500);
    await waitForRender(page);

    // Record anchor item position
    const anchorId = await page.evaluate(() => {
      const items = document.querySelectorAll('.benchmark-item');
      for (const el of items) {
        const rect = el.getBoundingClientRect();
        if (rect.top >= 0 && rect.top < window.innerHeight) {
          return el.getAttribute('data-testid');
        }
      }
      return null;
    });

    const anchorYBefore = anchorId
      ? await api(page, 'getItemVisualY', anchorId)
      : null;

    // Measure prepend
    const latency = await page.evaluate(async () => {
      const api = (window as any).__benchmarkTest;
      const start = Date.now();
      api.prepend(20);
      // Wait for render + stabilize
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      await new Promise(r => setTimeout(r, 200));
      return Date.now() - start;
    });
    latencies.push(latency);

    // Measure drift
    if (anchorId && anchorYBefore !== null) {
      await waitForStable(page);
      const anchorYAfter = await api(page, 'getItemVisualY', anchorId);
      if (anchorYAfter !== null) {
        drifts.push(Math.abs(anchorYAfter - anchorYBefore));
      }
    }
  }

  return {
    latency: median(latencies),
    drift: drifts.length > 0 ? median(drifts) : -1,
  };
}

async function measureScrollFPS(page: Page, url: string): Promise<number> {
  const fpsValues: number[] = [];

  for (let run = 0; run < RUNS; run++) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.benchmark-item');
    await page.waitForTimeout(500);

    const fps = await page.evaluate(async () => {
      const frameTimes: number[] = [];
      let lastTime = performance.now();
      let animating = true;

      function measureFrame() {
        if (!animating) return;
        const now = performance.now();
        frameTimes.push(now - lastTime);
        lastTime = now;
        requestAnimationFrame(measureFrame);
      }
      requestAnimationFrame(measureFrame);

      // Scroll 5000px over 2 seconds
      const startScroll = window.scrollY;
      const targetScroll = startScroll + 5000;
      const duration = 2000;
      const startTime = performance.now();

      while (performance.now() - startTime < duration) {
        const progress = (performance.now() - startTime) / duration;
        window.scrollTo(0, startScroll + (targetScroll - startScroll) * Math.min(progress, 1));
        await new Promise(r => requestAnimationFrame(r));
      }

      animating = false;
      await new Promise(r => setTimeout(r, 100));

      if (frameTimes.length === 0) return 0;
      const avgFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
      return Math.round((1000 / avgFrameTime) * 10) / 10;
    });
    fpsValues.push(fps);
  }

  return median(fpsValues);
}

async function measureHeapAndDOM(
  page: Page,
  url: string,
  cdp: CDPSession
): Promise<{ heapMB: number; domNodes: number; renderedItems: number }> {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForSelector('.benchmark-item');
  await page.waitForTimeout(500);

  // Scroll to middle
  await api(page, 'scrollToIndex', 50);
  await page.waitForTimeout(300);
  await waitForRender(page);

  // 10 rounds of 100-item prepend
  for (let i = 0; i < 10; i++) {
    await api(page, 'prepend', 100);
    await page.waitForTimeout(300);
    await waitForRender(page);
  }

  await page.waitForTimeout(500);
  await waitForRender(page);

  // Debug: print internal diagnostics for our library
  try {
    const diag = await api(page, 'getDiagnostics');
    const cacheSize = await api(page, 'getHeightCacheSize');
    if (diag) {
      console.log(`    [diag] tree: ${diag.length} items, measured: ${diag.measuredCount}, avg: ${diag.averageHeight?.toFixed(1)}, heightCache: ${cacheSize}`);
      console.log(`    [diag] pending: ${diag.pendingSize}, itemRefs: ${diag.itemRefsSize}, observed: ${diag.observedSize}, keyToIdx: ${diag.keyToIndexCached}, treeBytes: ${diag.treeCapacityBytes}`);
    }
  } catch { /* not all libraries have diagnostics */ }

  await getHeapBreakdown(cdp);
  const heapBytes = await getStableHeap(cdp);
  const domNodes = await getDOMNodeCount(cdp);
  const renderedItems = await api(page, 'getRenderedItemCount');

  return {
    heapMB: Number((heapBytes / 1024 / 1024).toFixed(2)),
    domNodes,
    renderedItems,
  };
}

async function measureScrollToIndex(page: Page, url: string): Promise<{ latency: number; accuracy: number }> {
  const latencies: number[] = [];
  const accuracies: number[] = [];

  for (let run = 0; run < RUNS; run++) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.benchmark-item');
    await page.waitForTimeout(500);

    const latency = await page.evaluate(async () => {
      const api = (window as any).__benchmarkTest;
      const start = Date.now();
      api.scrollToIndex(100);
      await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())));
      await new Promise(r => setTimeout(r, 200));
      return Date.now() - start;
    });
    latencies.push(latency);

    await waitForStable(page);
    await waitForRender(page);
    await page.waitForTimeout(300);

    // Measure accuracy: item should be near the top of the visible area (below sticky headers)
    const targetY = await api(page, 'getItemVisualY', 'item-100');
    if (targetY !== null) {
      // For window scroll, the item should appear near TOP_MARGIN (108px) from viewport top
      // But some libraries may position differently, so we measure distance from TOP_MARGIN
      accuracies.push(Math.abs(targetY - TOP_MARGIN));
    }
  }

  return {
    latency: median(latencies),
    accuracy: accuracies.length > 0 ? median(accuracies) : -1,
  };
}

async function measureScrollRestoration(page: Page, url: string): Promise<number> {
  const accuracies: number[] = [];

  for (let run = 0; run < RUNS; run++) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.benchmark-item', { timeout: 10000 });
    await page.waitForTimeout(500);

    // 1. Scroll to item 50
    await api(page, 'scrollToIndex', 50);
    await page.waitForTimeout(500);
    await waitForStable(page);
    await waitForRender(page);

    // 2. Record baseline Y of item-50
    const baselineY = await api(page, 'getItemVisualY', 'item-50');
    if (baselineY === null) continue;

    // 3. Save state (each library uses its best available API)
    await api(page, 'saveState');

    // 4. Simulate "page leave": clear items + scroll to top
    await api(page, 'reset', 0);
    await page.waitForTimeout(200);
    await waitForRender(page);

    // 5. Simulate "page return": restore items + restore scroll
    await api(page, 'reset', 200);
    await page.waitForSelector('.benchmark-item', { timeout: 5000 });
    await page.waitForTimeout(100);
    await waitForRender(page);

    await api(page, 'restoreState');
    await page.waitForTimeout(500);
    await waitForStable(page);
    await waitForRender(page);
    await page.waitForTimeout(300);

    // 6. Measure restored Y of item-50
    const restoredY = await api(page, 'getItemVisualY', 'item-50');
    if (restoredY !== null) {
      accuracies.push(Math.abs(restoredY - baselineY));
    }
  }

  return accuracies.length > 0 ? median(accuracies) : -1;
}

async function measureAccumulatedDrift(page: Page, url: string): Promise<number> {
  const driftValues: number[] = [];

  for (let run = 0; run < RUNS; run++) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.benchmark-item', { timeout: 10000 });
    await page.waitForTimeout(500);

    // 1. Scroll to item 50
    await api(page, 'scrollToIndex', 50);
    await page.waitForTimeout(500);
    await waitForStable(page);
    await waitForRender(page);

    let totalDrift = 0;

    // 2. 10 consecutive prepends of 20 items each
    for (let i = 0; i < 10; i++) {
      // Find current anchor item
      const anchorId = await page.evaluate(() => {
        const items = document.querySelectorAll('.benchmark-item');
        for (const el of items) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= 0 && rect.top < window.innerHeight) {
            return el.getAttribute('data-testid');
          }
        }
        return null;
      });

      const anchorYBefore = anchorId
        ? await api(page, 'getItemVisualY', anchorId)
        : null;

      // Prepend 20 items
      await api(page, 'prepend', 20);
      await page.waitForTimeout(300);
      await waitForStable(page);
      await waitForRender(page);

      // Measure drift
      if (anchorId && anchorYBefore !== null) {
        const anchorYAfter = await api(page, 'getItemVisualY', anchorId);
        if (anchorYAfter !== null) {
          totalDrift += Math.abs(anchorYAfter - anchorYBefore);
        }
      }
    }

    driftValues.push(totalDrift);
  }

  return driftValues.length > 0 ? median(driftValues) : -1;
}

async function measureHeightChangeDrift(page: Page, url: string): Promise<number> {
  const driftValues: number[] = [];

  for (let run = 0; run < RUNS; run++) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.benchmark-item', { timeout: 10000 });
    await page.waitForTimeout(500);

    // 1. Scroll to item 50
    await api(page, 'scrollToIndex', 50);
    await page.waitForTimeout(500);
    await waitForStable(page);
    await waitForRender(page);

    // 2. Find an anchor item in the lower half of the viewport
    const anchorId = await page.evaluate(() => {
      const midY = window.innerHeight * 0.6;
      const items = document.querySelectorAll('.benchmark-item');
      let best: { id: string; dist: number } | null = null;
      for (const el of items) {
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top - midY);
        if (rect.top > 0 && rect.bottom < window.innerHeight && (!best || dist < best.dist)) {
          best = { id: el.getAttribute('data-testid') ?? '', dist };
        }
      }
      return best?.id ?? null;
    });
    if (!anchorId) continue;

    const anchorYBefore = await api(page, 'getItemVisualY', anchorId);
    if (anchorYBefore === null) continue;

    // 3. Find items ABOVE the anchor in the viewport, and increase their heights
    const upperItemIds = await page.evaluate((anchorTestId: string) => {
      const items = document.querySelectorAll('.benchmark-item');
      const ids: string[] = [];
      for (const el of items) {
        const testId = el.getAttribute('data-testid') ?? '';
        if (testId === anchorTestId) break;
        const rect = el.getBoundingClientRect();
        if (rect.top >= 0 && rect.bottom <= window.innerHeight) {
          ids.push(testId);
        }
      }
      return ids;
    }, anchorId);

    // 4. Increase each upper item's height by +200px
    for (const id of upperItemIds) {
      await api(page, 'changeItemHeightDOM', id, 200);
    }

    // 5. Wait for ResizeObserver + any compensation to take effect
    await page.waitForTimeout(500);
    await waitForStable(page);
    await waitForRender(page);
    await page.waitForTimeout(200);

    // 6. Measure anchor drift
    const anchorYAfter = await api(page, 'getItemVisualY', anchorId);
    if (anchorYAfter !== null) {
      driftValues.push(Math.abs(anchorYAfter - anchorYBefore));
    }
  }

  return driftValues.length > 0 ? median(driftValues) : -1;
}

async function measureScrollToSettleTime(page: Page, url: string): Promise<number> {
  const times: number[] = [];

  for (let run = 0; run < RUNS; run++) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.benchmark-item', { timeout: 10000 });
    await page.waitForTimeout(500);

    const settleTime = await page.evaluate(async () => {
      const api = (window as any).__benchmarkTest;
      const targetId = 'item-100';
      const start = performance.now();

      api.scrollToIndex(100);

      // Record position on each frame until stable
      const frames: { time: number; y: number | null }[] = [];
      let stableCount = 0;

      while (stableCount < 3) {
        await new Promise<void>(r => requestAnimationFrame(r));
        const el = document.querySelector(`[data-testid="${targetId}"]`) as HTMLElement;
        const y = el ? el.getBoundingClientRect().top : null;
        frames.push({ time: performance.now() - start, y });

        if (frames.length >= 2) {
          const prev = frames[frames.length - 2];
          if (y !== null && prev.y !== null && Math.abs(y - prev.y) < 1) {
            stableCount++;
          } else {
            stableCount = 0;
          }
        }
        if (performance.now() - start > 5000) break;
      }

      // Find the first frame that reached the final position
      if (frames.length === 0) return 0;
      const finalY = frames[frames.length - 1].y;
      if (finalY === null) return frames[frames.length - 1].time;
      for (const f of frames) {
        if (f.y !== null && Math.abs(f.y - finalY) < 2) {
          return f.time;
        }
      }
      return frames[frames.length - 1].time;
    });
    times.push(settleTime);
  }

  return median(times);
}

async function measureRestoreSettleTime(page: Page, url: string): Promise<number> {
  const times: number[] = [];

  for (let run = 0; run < RUNS; run++) {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForSelector('.benchmark-item', { timeout: 10000 });
    await page.waitForTimeout(500);

    // Scroll to item 50
    await api(page, 'scrollToIndex', 50);
    await page.waitForTimeout(500);
    await waitForStable(page);
    await waitForRender(page);

    // Save state
    await api(page, 'saveState');

    // Record anchor item for tracking
    const anchorId = await page.evaluate(() => {
      const items = document.querySelectorAll('.benchmark-item');
      for (const el of items) {
        const rect = el.getBoundingClientRect();
        if (rect.top >= 0 && rect.top < window.innerHeight) {
          return el.getAttribute('data-testid');
        }
      }
      return null;
    });

    // Simulate page leave
    await api(page, 'reset', 0);
    await page.waitForTimeout(200);
    await waitForRender(page);

    // Restore items
    await api(page, 'reset', 200);
    await page.waitForSelector('.benchmark-item', { timeout: 5000 });
    await page.waitForTimeout(100);
    await waitForRender(page);

    const settleTime = await page.evaluate(async (trackId: string | null) => {
      const api = (window as any).__benchmarkTest;
      const start = performance.now();

      api.restoreState();

      // Record position on each frame until stable
      const frames: { time: number; scrollY: number; anchorY: number | null }[] = [];
      let stableCount = 0;

      while (stableCount < 3) {
        await new Promise<void>(r => requestAnimationFrame(r));
        const scrollY = window.scrollY;
        let anchorY: number | null = null;
        if (trackId) {
          const el = document.querySelector(`[data-testid="${trackId}"]`) as HTMLElement;
          if (el) anchorY = el.getBoundingClientRect().top;
        }
        frames.push({ time: performance.now() - start, scrollY, anchorY });

        if (frames.length >= 2) {
          const prev = frames[frames.length - 2];
          const scrollStable = Math.abs(scrollY - prev.scrollY) < 1;
          const anchorStable = anchorY === null || prev.anchorY === null ||
            Math.abs(anchorY - prev.anchorY) < 1;
          if (scrollStable && anchorStable) {
            stableCount++;
          } else {
            stableCount = 0;
          }
        }
        if (performance.now() - start > 5000) break;
      }

      // Find the first frame that reached the final scroll position
      if (frames.length === 0) return 0;
      const finalScrollY = frames[frames.length - 1].scrollY;
      for (const f of frames) {
        if (Math.abs(f.scrollY - finalScrollY) < 2) {
          return f.time;
        }
      }
      return frames[frames.length - 1].time;
    }, anchorId);
    times.push(settleTime);
  }

  return median(times);
}

// --- Tests ---

test.describe('Virtual List Library Benchmark Comparison', () => {
  test.describe.configure({ mode: 'serial' });

  const results: BenchmarkResult[] = [];
  let cdp: CDPSession;

  for (const lib of LIBRARIES) {
    test(`Benchmark: ${lib.label}`, async ({ page, context }) => {
      test.setTimeout(180_000);

      cdp = await context.newCDPSession(page);
      await cdp.send('HeapProfiler.enable');
      await cdp.send('Performance.enable');

      try {
        console.log(`\n--- Benchmarking: ${lib.label} ---`);

        // 1. Initial Render
        console.log('  Measuring initial render...');
        const initRender = await measureInitialRender(page, lib.url);
        console.log(`  Init render: ${initRender.toFixed(1)}ms`);

        // 2. Prepend Latency + Anchor Drift
        console.log('  Measuring prepend latency...');
        const { latency: prependLatency, drift: anchorDrift } = await measurePrependLatency(page, lib.url);
        console.log(`  Prepend latency: ${prependLatency.toFixed(1)}ms, drift: ${anchorDrift.toFixed(1)}px`);

        // 3. Scroll FPS
        console.log('  Measuring scroll FPS...');
        const scrollFPS = await measureScrollFPS(page, lib.url);
        console.log(`  Scroll FPS: ${scrollFPS}`);

        // 4. Heap + DOM + Rendered Items
        console.log('  Measuring heap & DOM...');
        const { heapMB, domNodes, renderedItems } = await measureHeapAndDOM(page, lib.url, cdp);
        console.log(`  Heap: ${heapMB}MB, DOM: ${domNodes}, Rendered: ${renderedItems}`);

        // 5. scrollToIndex Latency + Accuracy
        console.log('  Measuring scrollToIndex...');
        const { latency: scrollToLatency, accuracy: scrollToAccuracy } = await measureScrollToIndex(page, lib.url);
        console.log(`  scrollToIndex: ${scrollToLatency.toFixed(1)}ms, accuracy: ${scrollToAccuracy.toFixed(1)}px`);

        // 6. Scroll Restoration Accuracy
        console.log('  Measuring scroll restoration...');
        const scrollRestoreAccuracy = await measureScrollRestoration(page, lib.url);
        console.log(`  Scroll restore accuracy: ${scrollRestoreAccuracy.toFixed(1)}px`);

        // 7. Accumulated Prepend Drift
        console.log('  Measuring accumulated drift...');
        const accumulatedDrift = await measureAccumulatedDrift(page, lib.url);
        console.log(`  Accumulated drift: ${accumulatedDrift.toFixed(1)}px`);

        // 8. Height Change Drift (resize compensation)
        console.log('  Measuring height change drift...');
        const heightChangeDrift = await measureHeightChangeDrift(page, lib.url);
        console.log(`  Height change drift: ${heightChangeDrift.toFixed(1)}px`);

        // 9. scrollToIndex Settle Time
        console.log('  Measuring scrollToIndex settle time...');
        const scrollToSettleTime = await measureScrollToSettleTime(page, lib.url);
        console.log(`  scrollToIndex settle: ${scrollToSettleTime.toFixed(1)}ms`);

        // 10. Restore Settle Time
        console.log('  Measuring restore settle time...');
        const restoreSettleTime = await measureRestoreSettleTime(page, lib.url);
        console.log(`  Restore settle: ${restoreSettleTime.toFixed(1)}ms`);

        const result: BenchmarkResult = {
          library: lib.label,
          initRender,
          prependLatency,
          scrollFPS,
          heapMB,
          domNodes,
          renderedItems,
          anchorDrift,
          scrollToLatency,
          scrollToAccuracy,
          scrollRestoreAccuracy,
          accumulatedDrift,
          heightChangeDrift,
          scrollToSettleTime,
          restoreSettleTime,
        };

        results.push(result);

        // Store in test annotations for retrieval
        test.info().annotations.push({
          type: 'benchmark_result',
          description: JSON.stringify(result),
        });
      } finally {
        try {
          await cdp.send('HeapProfiler.disable');
          await cdp.send('Performance.disable');
          await cdp.detach();
        } catch {
          // ignore detach errors
        }
      }
    });
  }

  test('Print comparison table', async () => {
    // Collect results from annotations of previous tests
    // Since tests run sequentially in same file, we can use the shared results array
    if (results.length === 0) {
      console.log('\n  No benchmark results collected. Run all library benchmarks first.');
      return;
    }

    const pad = (s: string, n: number) => s.padStart(n);
    const header = [
      'Library'.padEnd(28),
      pad('Init(ms)', 10),
      pad('Prepend(ms)', 12),
      pad('FPS', 6),
      pad('Heap(MB)', 10),
      pad('DOM', 6),
      pad('Rendered', 9),
      pad('Drift(px)', 10),
      pad('ScrollTo(ms)', 13),
      pad('Accuracy(px)', 13),
      pad('Restore(px)', 12),
      pad('AccumDrift(px)', 15),
      pad('HtDrift(px)', 12),
      pad('SToSettle(ms)', 14),
      pad('RestSettle(ms)', 15),
    ].join(' | ');

    const separator = header.replace(/[^|]/g, '-');

    console.log('\n============================================================');
    console.log('  VIRTUAL LIST LIBRARY BENCHMARK COMPARISON');
    console.log('============================================================');
    console.log(header);
    console.log(separator);

    for (const r of results) {
      const row = [
        r.library.padEnd(28),
        pad(r.initRender.toFixed(1), 10),
        pad(r.prependLatency.toFixed(1), 12),
        pad(String(r.scrollFPS), 6),
        pad(String(r.heapMB), 10),
        pad(String(r.domNodes), 6),
        pad(String(r.renderedItems), 9),
        pad(r.anchorDrift.toFixed(1), 10),
        pad(r.scrollToLatency.toFixed(1), 13),
        pad(r.scrollToAccuracy.toFixed(1), 13),
        pad(r.scrollRestoreAccuracy.toFixed(1), 12),
        pad(r.accumulatedDrift.toFixed(1), 15),
        pad(r.heightChangeDrift.toFixed(1), 12),
        pad(r.scrollToSettleTime.toFixed(1), 14),
        pad(r.restoreSettleTime.toFixed(1), 15),
      ].join(' | ');
      console.log(row);
    }

    console.log('============================================================\n');
  });
});
