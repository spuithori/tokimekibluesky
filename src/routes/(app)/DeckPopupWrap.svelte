<script lang="ts">
  import DeckRow from "./DeckRow.svelte";
  import type {DragOptions} from "@neodrag/svelte";
  import { draggable } from "@neodrag/svelte";

  interface Props {
    column: any;
    index?: number;
    unique?: any;
  }

  let { column, index = 0, unique = Symbol() }: Props = $props();
  let el = $state();
  let isPopupEnable = $derived(column?.settings?.isPopup);

  let dragOptions: DragOptions = $state({
      disabled: true,
      defaultPosition: {
          x: column?.settings?.popupPosition?.x || 0,
          y: column?.settings?.popupPosition?.y || 0,
      },
      bounds: '.wrap',
      handle: '.deck-popup-handle',
      recomputeBounds: {
          dragStart: true,
          drag: false,
          dragEnd: false,
      },
      cancel: '.grabber'
  });

  $effect(() => {
      handlePopup(isPopupEnable);
  })

  function handlePopup() {
      if (isPopupEnable) {
          dragOptions.disabled = false;
      } else {
          dragOptions.disabled = true;
          dragOptions.position = {
              x: 300,
              y: 300,
          }
      }
  }

  function handleChangePosition(e) {
      const position = {
          ...column?.settings?.popupPosition,
          x: e.detail.offsetX,
          y: e.detail.offsetY,
      }
      column.settings = {...column.settings, popupPosition: position};

      el.style.setProperty('--popup-offset-x', `${e.detail.offsetX}px`);
      el.style.setProperty('--popup-offset-y', `${e.detail.offsetY}px`);
  }
</script>

<div
    class="deck-popup-wrap"
    bind:this={el}
    use:draggable={{
        ...dragOptions,
        onDrag: ({offsetX, offsetY}) => { dragOptions.position = { x: offsetX, y: offsetY }}
    }}
    onneodrag:end={handleChangePosition}
    style="--deck-popup-opacity: {column?.settings?.opacity || 100}"
    style:--popup-width={column?.settings?.popupPosition?.width}
    style:--popup-height={column?.settings?.popupPosition?.height}
>
  <div class="deck-popup-handle"></div>

  <DeckRow {column} {index} {unique}></DeckRow>
</div>

<style lang="postcss">
  .deck-popup-wrap {
      --popup-z-index: 1000;

      @media (min-width: 768px) {
          position: fixed;
          resize: both;
          z-index: var(--popup-z-index);
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

          &:focus {
              z-index: calc(var(--popup-z-index) + 1);
          }
      }

      @media (max-width: 767px) {
          transform: none !important;
          opacity: 1 !important;
      }
  }

  .deck-popup-handle {
      @media (min-width: 768px) {
          position: absolute;
          z-index: 22;
          height: 24px;
          top: 14px;
          left: 8px;
          width: 4px;
          border-radius: 2px;
          background-color: var(--border-color-2);
          cursor: grab;
      }
  }
</style>