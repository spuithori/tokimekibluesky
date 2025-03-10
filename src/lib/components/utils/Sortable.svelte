<script lang="ts">
  import {draggable, type DragOptions} from "@neodrag/svelte";
  import {GripVertical} from "lucide-svelte";
  import { pauseColumn } from "$lib/stores";

  let { handle = '.grab-handle', items, onsort, content } = $props();
  let dragOptions: DragOptions = $state({
    axis: 'y',
    handle: handle,
    position: {
      x: 0,
      y: 0,
    },
    recomputeBounds: {
      dragStart: true,
      drag: true,
      dragEnd: true,
    },
    cancel: '.grabber',
    bounds: 'parent',
  });
  let isDragging = $state(false);
  let reorderIndex;
  let els: HTMLElement[] | [] = $state([]);

  function handleDragStart(e, index) {
    isDragging = true;
    reorderIndex = index;
    $pauseColumn = true;
  }

  function handleDragEnd(e, index) {
    $pauseColumn = false;

    dragOptions.position = {
      x: 0,
      y: 0,
    }

    resetTransform();
    onsort(moveElement(items, index, reorderIndex));
    isDragging = false;
  }

  function handleDragging(e, index) {
    if (!e.detail.rootNode) {
      return false;
    }
    const x = els[index].getBoundingClientRect().left;
    const y = els[index].getBoundingClientRect().top;

    if (Math.sign(e.detail.offsetY) === 1) {
      const prevItem = els[reorderIndex];
      const nextItem = els[reorderIndex + 1];

      if (reorderIndex < index) {
        reorderIndex = index;
        resetTransform();
      }

      if (Math.abs(y) > nextItem?.getBoundingClientRect().top) {
        nextItem.style.transform = `translate3d(0, ${els[index].getBoundingClientRect().height * -1 - 8}px, 0)`;
        reorderIndex = reorderIndex + 1;
      }

      if (Math.abs(y) < prevItem.getBoundingClientRect().top) {
        prevItem.style.transform = 'translate3d(0, 0, 0)';
        reorderIndex = reorderIndex - 1;
      }
    } else if (Math.sign(e.detail.offsetY) === -1) {
      const prevItem = els[reorderIndex - 1];
      const nextItem = els[reorderIndex];

      if (reorderIndex > index) {
        reorderIndex = index;
        resetTransform();
      }

      if (Math.abs(y) < prevItem?.getBoundingClientRect().top) {
        prevItem.style.transform = `translate3d(0, ${els[index].getBoundingClientRect().height + 8}px, 0)`;
        reorderIndex = reorderIndex - 1;
      }

      if (Math.abs(y) > nextItem.getBoundingClientRect().top) {
        nextItem.style.transform = 'translate3d(0, 0, 0)';
        reorderIndex = reorderIndex + 1;
      }
    } else {
      reorderIndex = index;
      resetTransform();
    }
  }

  function resetTransform() {
    els.forEach((el) => {
      if (el) {
        el.style.transform = 'translate3d(0, 0, 0)';
      }
    });
  }

  function moveElement(arr, fromIndex, toIndex) {
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
      class:dragging={isDragging}
      use:draggable={dragOptions}
      onneodrag:start={(e) => {handleDragStart(e, index)}}
      onneodrag:end={(e) => {handleDragEnd(e, index)}}
      onneodrag={(e) => {handleDragging(e, index)}}
      bind:this={els[index]}
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
  }
</style>