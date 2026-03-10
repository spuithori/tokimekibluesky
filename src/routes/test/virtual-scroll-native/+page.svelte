<script lang="ts">
  import { onMount } from 'svelte';

  interface TestItem {
    id: string;
    height: number;
    label: string;
    color: string;
    bodyLines: number;
  }

  let items = $state<TestItem[]>([]);
  let scrollContainer = $state<HTMLElement | null>(null);
  let nextId = $state(0);

  function seededRandom(seed: number): number {
    const x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x);
  }

  function getItemHeight(id: number): number {
    const r = seededRandom(id);
    if (r < 0.3) return 72 + Math.floor(seededRandom(id + 1000) * 40);
    if (r < 0.6) return 120 + Math.floor(seededRandom(id + 2000) * 60);
    if (r < 0.85) return 200 + Math.floor(seededRandom(id + 3000) * 80);
    return 280 + Math.floor(seededRandom(id + 4000) * 40);
  }

  function getItemColor(id: number): string {
    const hue = Math.floor(seededRandom(id + 5000) * 360);
    const sat = 40 + Math.floor(seededRandom(id + 6000) * 30);
    const light = 82 + Math.floor(seededRandom(id + 7000) * 12);
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  }

  function getBodyLines(id: number): number {
    return 1 + Math.floor(seededRandom(id + 8000) * 4);
  }

  function makeItem(id: number): TestItem {
    return {
      id: `item-${id}`,
      height: getItemHeight(id),
      color: getItemColor(id),
      label: `Item ${id}`,
      bodyLines: getBodyLines(id),
    };
  }

  function generateItems(count: number, startId: number): TestItem[] {
    const result: TestItem[] = [];
    for (let i = 0; i < count; i++) {
      result.push(makeItem(startId + i));
    }
    return result;
  }

  onMount(() => {
    items = generateItems(200, 0);
    nextId = 200;

    (window as any).__nativeScrollTest = {
      prepend(count: number) {
        const newItems = generateItems(count, nextId);
        nextId += count;
        items = [...newItems.reverse(), ...items];
      },

      prependOne() {
        const item = makeItem(nextId);
        nextId += 1;
        items = [item, ...items];
      },

      append(count: number) {
        const newItems = generateItems(count, nextId);
        nextId += count;
        items = [...items, ...newItems];
      },

      changeItemHeight(id: string, newHeight: number) {
        items = items.map(item =>
          item.id === id ? { ...item, height: newHeight } : item
        );
      },

      changeHeightsAbove(belowIndex: number, delta: number) {
        items = items.map((item, i) =>
          i < belowIndex ? { ...item, height: item.height + delta } : item
        );
      },

      getScrollTop() {
        return scrollContainer?.scrollTop ?? 0;
      },

      setScrollTop(value: number) {
        if (scrollContainer) scrollContainer.scrollTop = value;
      },

      getItemCount() {
        return items.length;
      },

      changeHeightsBelow(aboveIndex: number, delta: number) {
        items = items.map((item, i) =>
          i > aboveIndex ? { ...item, height: Math.max(1, item.height + delta) } : item
        );
      },

      changeMultipleHeights(indices: number[], delta: number) {
        const indexSet = new Set(indices);
        items = items.map((item, i) =>
          indexSet.has(i) ? { ...item, height: Math.max(1, item.height + delta) } : item
        );
      },

      getVisibleItemIds() {
        if (!scrollContainer) return [];
        const containerRect = scrollContainer.getBoundingClientRect();
        const ids: string[] = [];
        const els = scrollContainer.querySelectorAll('[data-testid^="item-"]');
        for (const el of els) {
          const rect = el.getBoundingClientRect();
          if (rect.bottom > containerRect.top && rect.top < containerRect.bottom) {
            ids.push(el.getAttribute('data-testid')!);
          }
        }
        return ids;
      },

      getItemPosition(testId: string) {
        if (!scrollContainer) return null;
        const containerRect = scrollContainer.getBoundingClientRect();
        const el = scrollContainer.querySelector(`[data-testid="${testId}"]`);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { relativeY: rect.top - containerRect.top, height: rect.height };
      },

      getRenderedItemCount() {
        return document.querySelectorAll('[data-testid^="item-"]').length;
      },

      changeItemHeightDOM(id: string, extraHeight: number): void {
        const el = scrollContainer?.querySelector(`[data-testid="${id}"]`) as HTMLElement | null;
        if (el) {
          el.style.setProperty('height', 'auto', 'important');
          el.style.minHeight = '0';
          const spacer = document.createElement('div');
          spacer.style.height = `${extraHeight}px`;
          spacer.className = 'dom-injected-spacer';
          el.appendChild(spacer);
        }
      },

      scrollToItem(id: string) {
        const el = scrollContainer?.querySelector(`[data-testid="${id}"]`);
        if (el && scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const itemRect = el.getBoundingClientRect();
          scrollContainer.scrollTop += itemRect.top - containerRect.top;
        }
      },
    };

    return () => {
      delete (window as any).__nativeScrollTest;
    };
  });
</script>

<div
  class="scroll-container"
  bind:this={scrollContainer}
  data-testid="scroll-container"
>
  {#each items as item, index (item.id)}
    <div
      class="test-item"
      data-testid={item.id}
      data-index={index}
      style:height="{item.height}px"
      style:background-color={item.color}
    >
      <div class="item-content">
        <div class="item-header">
          <span class="item-label">{item.label}</span>
          <span class="item-id">{item.id}</span>
          <span class="item-meta">{item.height}px</span>
        </div>
        {#each Array(item.bodyLines) as _, line}
          <div class="item-body-line">
            Body line {line + 1} of {item.id} — lorem ipsum dolor sit amet
          </div>
        {/each}
      </div>
    </div>
  {/each}
</div>

<style>
  .scroll-container {
    width: 400px;
    height: 600px;
    overflow-y: auto;
    border: 2px solid #333;
    margin: 20px auto;
    background: #fff;
  }

  .test-item {
    display: flex;
    align-items: flex-start;
    justify-content: center;
    border-bottom: 1px solid #999;
    box-sizing: border-box;
    font-family: monospace;
    font-size: 13px;
    padding: 8px 12px;
  }

  .item-content {
    width: 100%;
  }

  .item-header {
    display: flex;
    gap: 8px;
    align-items: baseline;
    margin-bottom: 4px;
  }

  .item-label {
    font-weight: bold;
    font-size: 15px;
  }

  .item-id {
    color: #444;
    font-size: 12px;
  }

  .item-meta {
    color: #888;
    font-size: 11px;
    margin-left: auto;
  }

  .item-body-line {
    color: #555;
    font-size: 12px;
    line-height: 1.4;
  }
</style>
