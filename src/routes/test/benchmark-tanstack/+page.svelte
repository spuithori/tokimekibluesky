<script lang="ts">
  import { createWindowVirtualizer } from '@tanstack/svelte-virtual';
  import { onMount } from 'svelte';
  import { generateItems, TOP_MARGIN, type TestItem } from '../benchmark-shared';

  let items = $state.raw<TestItem[]>(generateItems(200, 0));
  let nextId = $state(200);
  let savedIndex = 0;

  const virtualizer = createWindowVirtualizer({
    get count() { return items.length; },
    estimateSize: (index: number) => {
      if (index < items.length) {
        return items[index].height;
      }
      return 150;
    },
    overscan: 10,
    scrollMargin: TOP_MARGIN,
    getItemKey: (index: number) => {
      if (index < items.length) {
        return items[index].id;
      }
      return index;
    },
  });

  onMount(() => {
    (window as any).__benchmarkTest = {
      prepend(count: number) {
        const newItems = generateItems(count, nextId);
        nextId += count;
        const scrollTopBefore = window.scrollY;
        const reversed = newItems.reverse();

        const estimatedShift = reversed.reduce((sum, item) => sum + item.height, 0);
        items = [...reversed, ...items];

        requestAnimationFrame(() => {
          window.scrollTo(0, scrollTopBefore + estimatedShift);
        });
      },

      append(count: number) {
        const newItems = generateItems(count, nextId);
        nextId += count;
        items = [...items, ...newItems];
      },

      reset(count: number) {
        items = generateItems(count, 0);
        nextId = count;
        window.scrollTo(0, 0);
      },

      getItemCount(): number {
        return items.length;
      },

      scrollToIndex(index: number) {
        $virtualizer.scrollToIndex(index, { align: 'start' });
      },

      getScrollTop(): number {
        return window.scrollY;
      },

      getItemVisualY(testId: string): number | null {
        const el = document.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
        if (!el) return null;
        return el.getBoundingClientRect().top;
      },

      getVisibleItemIds(): string[] {
        const results: string[] = [];
        const allItems = document.querySelectorAll('.benchmark-item');
        for (const el of allItems) {
          const rect = el.getBoundingClientRect();
          if (rect.bottom > 0 && rect.top < window.innerHeight) {
            results.push(el.getAttribute('data-testid') ?? '');
          }
        }
        return results;
      },

      getRenderedItemCount(): number {
        return document.querySelectorAll('.benchmark-item').length;
      },

      getLibraryName(): string {
        return '@tanstack/svelte-virtual';
      },

      isScrollStable(): boolean {
        return !$virtualizer.isScrolling;
      },

      changeItemHeightDOM(testId: string, newHeight: number) {
        const el = document.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
        if (el) el.style.minHeight = newHeight + 'px';
      },

      saveState() {
        // tanstack has no getScrollState() — save current visible index
        const allItems = document.querySelectorAll('.benchmark-item');
        for (const el of allItems) {
          const rect = el.getBoundingClientRect();
          if (rect.top >= TOP_MARGIN - 10) {
            const testId = el.getAttribute('data-testid') ?? '';
            const idx = items.findIndex(it => it.id === testId);
            if (idx >= 0) savedIndex = idx;
            break;
          }
        }
      },

      restoreState() {
        // tanstack can only scrollToIndex — no pixel-level restore
        $virtualizer.scrollToIndex(savedIndex, { align: 'start' });
      },
    };

    return () => {
      delete (window as any).__benchmarkTest;
    };
  });
</script>

<div class="timeline" data-testid="timeline-content">
  <div
    style="position: relative; width: 100%; height: {$virtualizer.getTotalSize()}px;"
  >
    {#each $virtualizer.getVirtualItems() as virtualItem (virtualItem.key)}
      {@const item = items[virtualItem.index]}
      {#if item}
        <div
          class="benchmark-item"
          data-testid={item.id}
          data-index={virtualItem.index}
          style="
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            min-height: {item.height}px;
            background-color: {item.color};
            transform: translateY({virtualItem.start - $virtualizer.options.scrollMargin}px);
          "
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
      {/if}
    {/each}
  </div>
</div>

<style>
  .benchmark-item {
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
