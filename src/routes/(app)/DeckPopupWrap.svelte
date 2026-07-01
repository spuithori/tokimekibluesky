<script lang="ts">
  import DeckSlot from "./DeckSlot.svelte";
  import { draggable, type DragEventData } from "$lib/attachments/draggable.svelte";
  import { getColumnState } from "$lib/classes/columnState.svelte";
  import { animateLayout } from "$lib/animations/flip";
  import { detectTileAt } from "$lib/attachments/sortable.svelte";
  import { tilingDrag } from "$lib/classes/tilingDragState.svelte";
  import { untrack } from "svelte";
  import type { Attachment } from "svelte/attachments";
  import GripHorizontal from '@lucide/svelte/icons/grip-horizontal';
  import Grid2x2 from '@lucide/svelte/icons/grid-2x2';
  import X from '@lucide/svelte/icons/x';

  interface Props {
    index?: number;
  }

  let { index = 0 }: Props = $props();

  const columnState = getColumnState();
  const column = $derived(columnState.getSlotColumn(index) as any);
  const zIndex = $derived(1010 + Math.max(0, columnState.floatingOrder.indexOf(column?.id)));

  function dockToTile() {
      const col = column;
      if (!col) return;
      animateLayout(() => {
          col.settings = {...col.settings, isPopup: false};
      });
  }

  function closePopup() {
      if (!column) return;
      columnState.remove(column.id);
  }

  function handleChangePosition(data: DragEventData) {
      if (!column) return;
      const position = {
          ...column?.settings?.popupPosition,
          x: data.offset.x,
          y: data.offset.y,
      }
      column.settings = {...column.settings, popupPosition: position};

      data.rootNode.style.setProperty('--popup-offset-x', `${data.offset.x}px`);
      data.rootNode.style.setProperty('--popup-offset-y', `${data.offset.y}px`);
  }

  function handleDragStart() {
      tilingDrag.begin('__float__');
  }

  function handleDrag(data: DragEventData) {
      tilingDrag.setPreview(detectTileAt(data.event.clientX, data.event.clientY));
  }

  function handleDragEnd(data: DragEventData) {
      const col = column;
      if (!col) return;
      const drop = tilingDrag.preview;
      tilingDrag.end();
      if (drop?.kind === 'extract') {
          const id = col.id;
          animateLayout(() => {
              let i = drop.beforeId ? columnState.slotIndexOf(drop.beforeId) : columnState.slots.length;
              const srcIdx = columnState.slotIndexOf(id);
              if (srcIdx !== -1 && srcIdx < i) i -= 1;
              col.settings = {...col.settings, isPopup: false};
              columnState.moveLeafToSlot(id, i);
          });
      } else {
          handleChangePosition(data);
      }
  }

  const floatingStack: Attachment = () => {
      const id = untrack(() => column?.id);
      if (!id) return;
      untrack(() => {
          columnState.registerFloating(id);
          columnState.raiseFloating(id);
      });
      return () => untrack(() => columnState.unregisterFloating(id));
  };

  const persistResize: Attachment<HTMLElement> = (node) => {
      if (typeof ResizeObserver === 'undefined') return;
      let timer: ReturnType<typeof setTimeout>;
      const ro = new ResizeObserver(() => {
          clearTimeout(timer);
          timer = setTimeout(() => {
              if (!column) return;
              const width = node.offsetWidth;
              const height = node.offsetHeight;
              const p = column.settings?.popupPosition;
              if (p && p.width === width && p.height === height) return;
              column.settings = {...column.settings, popupPosition: {...column.settings?.popupPosition, width, height}};
          }, 160);
      });
      ro.observe(node);
      return () => { clearTimeout(timer); ro.disconnect(); };
  };
</script>

<div
    class="deck-popup-wrap"
    class:deck-popup-wrap--active={columnState.activeFloatingId === column?.id}
    onpointerdowncapture={() => column && columnState.raiseFloating(column.id)}
    style:--popup-z-index={zIndex}
    {@attach draggable(() => ({
      bounds: '.wrap',
      handle: '.deck-popup-titlebar__drag',
      defaultPosition: { x: column?.settings?.popupPosition?.x || 0, y: column?.settings?.popupPosition?.y || 0 },
      touchAction: 'manipulation',
      onDragStart: handleDragStart,
      onDrag: handleDrag,
      onDragEnd: handleDragEnd,
    }))}
    {@attach floatingStack}
    {@attach persistResize}
    style="--deck-popup-opacity: {column?.settings?.opacity || 100}"
    style:--popup-width={column?.settings?.popupPosition?.width}
    style:--popup-height={column?.settings?.popupPosition?.height}
>
  <div class="deck-popup-titlebar">
    <div class="deck-popup-titlebar__drag">
      <span class="deck-popup-titlebar__grip"><GripHorizontal size="16" color="var(--text-color-3)"></GripHorizontal></span>
    </div>
    <button class="deck-popup-titlebar__btn" aria-label="Tile" onclick={dockToTile}>
      <Grid2x2 size="15" color="var(--text-color-2)"></Grid2x2>
    </button>
    <button class="deck-popup-titlebar__btn" aria-label="Close" onclick={closePopup}>
      <X size="16" color="var(--text-color-2)"></X>
    </button>
  </div>

  <DeckSlot {index}></DeckSlot>
</div>

<style lang="postcss">
  .deck-popup-wrap {
      @media (min-width: 768px) {
          position: fixed;
          resize: both;
          box-sizing: border-box;
          padding-top: 30px;
          display: flex;
          flex-direction: column;
          z-index: var(--popup-z-index, 1010);
          min-width: 280px;
          min-height: 300px;
          height: calc(var(--popup-height, 400) * 1px);
          width: calc(var(--popup-width, 360) * 1px);
          max-width: calc(90% - var(--popup-offset-x, 0));
          max-height: calc(100vh - var(--popup-offset-y, 0));
          border-right: none;
          border-radius: 16px;
          box-shadow: 0 0 16px rgba(0, 0, 0, .3);
          overflow: hidden;
          opacity: calc(var(--deck-popup-opacity, 100) / 100);
          transition: box-shadow .15s ease;

          &--active {
              box-shadow: 0 0 0 1.5px color-mix(in srgb, var(--primary-color) 55%, transparent), 0 6px 28px rgba(0, 0, 0, .38);
          }
      }

      @media (max-width: 767px) {
          transform: none !important;
          opacity: 1 !important;
      }

      @media (prefers-reduced-motion: reduce) {
          transition: none;
      }
  }

  @media (min-width: 768px) {
      :global(.deck-popup-wrap > .deck-row-wrap) {
          flex: 1;
          min-height: 0;
          display: flex;
          flex-direction: column;
      }

      :global(.deck-popup-wrap .deck-row-slot) {
          flex: 1;
          min-height: 0;
      }
  }

  .deck-popup-titlebar {
      @media (max-width: 767px) {
          display: none;
      }

      @media (min-width: 768px) {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          z-index: 22;
          height: 30px;
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 0 5px 0 4px;
          background-color: var(--deck-heading-bg-color, var(--bg-color-2));
          border-bottom: 1px solid var(--deck-border-color, var(--border-color-1));
          border-radius: 16px 16px 0 0;
          user-select: none;
      }

      &__drag {
          flex: 1;
          min-width: 0;
          align-self: stretch;
          display: flex;
          align-items: center;
          cursor: grab;
          touch-action: none;
      }

      &__grip {
          display: grid;
          place-content: center;
          padding: 0 4px;
      }

      &__btn {
          display: grid;
          place-content: center;
          flex-shrink: 0;
          width: 26px;
          height: 26px;
          border-radius: var(--border-radius-2, 6px);

          &:hover {
              background-color: var(--bg-color-3);
          }
      }
  }
</style>
