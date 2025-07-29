<script lang="ts">
  import DeckRow from "./DeckRow.svelte";
  import { draggable, bounds, ControlFrom, BoundsFrom, events, controls, position, disabled, touchAction } from '@neodrag/svelte';

  interface Props {
    column: any;
    index?: number;
  }

  let { column, index = 0 }: Props = $props();
  let el = $state();
  let unique = $state(Symbol());
  let isPopupEnable = $derived(column?.settings?.isPopup);

  $effect(() => {
      //handlePopup(isPopupEnable);
  })

  /* function handlePopup() {
      if (isPopupEnable) {
          dragOptions.disabled = false;
      } else {
          dragOptions.disabled = true;
          dragOptions.position = {
              x: 300,
              y: 300,
          }
      }
  } */

  function handleChangePosition(data) {
      const position = {
          ...column?.settings?.popupPosition,
          x: data.offset.x,
          y: data.offset.y,
      }
      column.settings = {...column.settings, popupPosition: position};

      el.style.setProperty('--popup-offset-x', `${data.offset.x}px`);
      el.style.setProperty('--popup-offset-y', `${data.offset.y}px`);
  }
</script>

<div
    class="deck-popup-wrap"
    bind:this={el}
    {@attach draggable(() => [
      bounds(BoundsFrom.selector('.wrap')),
      controls({ allow: ControlFrom.selector('.deck-popup-handle') }),
      events({
        // onDrag: ({ offset }) => { dragOptions.position = { x: offset.X, y: offset.y }},
        onDragEnd: handleChangePosition,
      }),
      position({ default: { x: column?.settings?.popupPosition?.x || 0, y: column?.settings?.popupPosition?.y || 0, } }),
      touchAction('manipulation'),
    ])}
    style="--deck-popup-opacity: {column?.settings?.opacity || 100}"
    style:--popup-width={column?.settings?.popupPosition?.width}
    style:--popup-height={column?.settings?.popupPosition?.height}
>
  <div class="deck-popup-handle"></div>

  <DeckRow {index}></DeckRow>
</div>

<style lang="postcss">
  .deck-popup-wrap {
      --popup-z-index: 1002;

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