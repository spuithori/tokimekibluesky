<script lang="ts">
  import { WindowVirtualizer } from 'virtua/svelte';
  import { onMount } from 'svelte';
  import { generateItems, TOP_MARGIN, type TestItem } from '../benchmark-shared';

  let items = $state.raw<TestItem[]>([]);
  let nextId = $state(0);
  let shift = $state(false);
  let virtualizerRef: ReturnType<typeof WindowVirtualizer> | undefined = $state();
  let savedIndex = 0;

  onMount(() => {
    items = generateItems(200, 0);
    nextId = 200;

    (window as any).__benchmarkTest = {
      prepend(count: number) {
        const newItems = generateItems(count, nextId);
        nextId += count;
        shift = true;
        items = [...newItems.reverse(), ...items];
        requestAnimationFrame(() => {
          shift = false;
        });
      },

      append(count: number) {
        const newItems = generateItems(count, nextId);
        nextId += count;
        items = [...items, ...newItems];
      },

      reset(count: number) {
        shift = false;
        items = generateItems(count, 0);
        nextId = count;
        window.scrollTo(0, 0);
      },

      getItemCount(): number {
        return items.length;
      },

      scrollToIndex(index: number) {
        virtualizerRef?.scrollToIndex(index);
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
        return 'virtua';
      },

      isScrollStable(): boolean {
        return true;
      },

      changeItemHeightDOM(testId: string, newHeight: number) {
        const el = document.querySelector(`[data-testid="${testId}"]`) as HTMLElement;
        if (el) el.style.minHeight = newHeight + 'px';
      },

      saveState() {
        // virtua has no getScrollState() — save current visible index
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
        // virtua can only scrollToIndex — no pixel-level restore
        virtualizerRef?.scrollToIndex(savedIndex);
      },
    };

    return () => {
      delete (window as any).__benchmarkTest;
    };
  });
</script>

<div class="timeline" data-testid="timeline-content">
  <WindowVirtualizer
    data={items}
    getKey={(item) => item.id}
    {shift}
    bind:this={virtualizerRef}
  >
    {#snippet children(item: TestItem, index: number)}
      <div
        class="benchmark-item"
        data-testid={item.id}
        data-index={index}
        style:min-height="{item.height}px"
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
    {/snippet}
  </WindowVirtualizer>
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
