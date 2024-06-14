<script lang="ts">
  import DeckRow from "./DeckRow.svelte";
  import type {DragOptions} from "@neodrag/svelte";
  import { draggable } from "@neodrag/svelte";
  import { columns } from "$lib/stores";

  export let column;
  export let index = 0;
  export let unique = Symbol();
  let el;

  let dragOptions: DragOptions = {
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
  };

  $: isPopupEnable = column?.settings?.isPopup;
  $: handlePopup(isPopupEnable);

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

  function resize(element) {
      const bottomRight = document.createElement('div');
      bottomRight.direction = 'southeast';
      bottomRight.classList.add('grabber');
      bottomRight.classList.add('bottom-right');

      const grabbers = [bottomRight];

      let active = null;
      let initialRect = null;
      let initialPos = null;

      grabbers.forEach(grabber => {
          element.appendChild(grabber);
          grabber.addEventListener('mousedown', onMousedown);
      })

      function onMousedown(event) {
          active = event.target;
          const rect = element.getBoundingClientRect();
          const parent = element.parentElement.getBoundingClientRect();

          initialRect = {
              width: rect.width,
              height: rect.height,
              left: rect.left - parent.left,
              right: parent.right - rect.right,
              top: rect.top - parent.top,
              bottom: parent.bottom - rect.bottom
          };
          initialPos = { x: event.pageX, y: event.pageY };
          active.classList.add('selected');
          dragOptions.disabled = true;
      }

      function onMouseup(event) {
          if (!active) {
              return;
          }
          dragOptions.disabled = false;

          const position = {
              ...column?.settings?.popupPosition,
              width: Number(element.style.getPropertyValue('--popup-width')),
              height: Number(element.style.getPropertyValue('--popup-height')),
          }
          $columns[index].settings = {...$columns[index].settings, popupPosition: position};

          active.classList.remove('selected');
          active = null;
          initialRect = null;
          initialPos = null;
      }

      function onMove(event) {
          if (!active) {
              return;
          }

          const direction = active.direction;
          let delta;

          if (direction.match('east')) {
              delta = event.pageX - initialPos.x;

              if (initialRect.width + delta < 280) {
                  element.style.setProperty('--popup-width', 280);
              } else {
                  element.style.setProperty('--popup-width', initialRect.width + delta);
              }
          }

          if (direction.match('west')) {
              delta = initialPos.x - event.pageX;

              if (initialRect.width + delta < 280) {
                  element.style.setProperty('--popup-width', 280);
              } else {
                  element.style.setProperty('--popup-width', initialRect.width + delta);
              }
          }

          if (direction.match('north')) {
              delta = initialPos.y - event.pageY;

              if (initialRect.height + delta < 400) {
                  element.style.setProperty('--popup-height', 400);
              } else {
                  element.style.setProperty('--popup-height', initialRect.height + delta);
              }
          }

          if (direction.match('south')) {
              delta = event.pageY - initialPos.y;

              if (initialRect.height + delta < 400) {
                  element.style.setProperty('--popup-height', 400);
              } else {
                  element.style.setProperty('--popup-height', initialRect.height + delta);
              }
          }
      }

      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onMouseup);

      return {
          destroy() {
              window.removeEventListener('mousemove', onMove);
              window.removeEventListener('mousemove', onMousedown);

              grabbers.forEach(grabber => {
                  element.removeChild(grabber);
              })
          }
      }
  }

  function handleChangePosition(e) {
      const position = {
          ...column?.settings?.popupPosition,
          x: e.detail.offsetX,
          y: e.detail.offsetY,
      }
      $columns[index].settings = {...$columns[index].settings, popupPosition: position};

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
    on:neodrag:end={handleChangePosition}
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