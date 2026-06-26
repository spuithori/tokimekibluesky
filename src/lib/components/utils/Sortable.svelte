<script lang="ts">
  import { sortable } from "$lib/attachments/sortable.svelte";
  import {GripVertical} from "lucide-svelte";
  import { pauseColumn } from "$lib/stores";

  let { handle = '.grab-handle', items, onsort, content, onDragStart, onDragEnd } = $props();

  function moveElement<T>(arr: T[], fromIndex: number, toIndex: number): T[] {
    const result = [...arr];
    const element = result.splice(fromIndex, 1)[0];
    result.splice(toIndex, 0, element);
    return result;
  }
</script>

<div class="sortable-list">
  {#each items as item, index (item)}
    <div
      class="sortable-list__item"
      {@attach sortable(() => ({
        axis: 'y',
        participantSelector: '.sortable-list__item',
        handle,
        onReorder: (from, to) => onsort(moveElement(items, from, to)),
        onDragStart: () => { $pauseColumn = true; onDragStart?.(); },
        onDragEnd: () => { $pauseColumn = false; onDragEnd?.(); },
      }))}
    >
      <div class="grab-handle">
        <GripVertical size="20" color="var(--border-color-1)"></GripVertical>
      </div>

      {@render content?.(item, index)}
    </div>
  {/each}
</div>

<style lang="postcss">
  .sortable-list {
      display: grid;
      gap: 8px;
      padding: 8px 0;
      margin: -8px 0;
      user-select: none;

      &__item {
          position: relative;

          &:global(.dragging) {
              z-index: 10;
              box-shadow: 0 8px 24px rgba(0, 0, 0, .18);
          }
      }
  }

  .grab-handle {
      position: absolute;
      left: 4px;
      top: 0;
      bottom: 0;
      display: grid;
      place-content: center;
      z-index: 1;
      cursor: grab;
      touch-action: none;
  }
</style>
