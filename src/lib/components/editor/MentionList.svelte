<script lang="ts">
  import type { ClientRectObject, VirtualElement } from 'svelte-floating-ui/core'
  import { offset, flip } from "svelte-floating-ui/dom";
  import { createFloatingActions } from 'svelte-floating-ui'

  export let props;
  let selectedIndex = 0;

  const [floatingRef, floatingContent] = createFloatingActions({
      strategy: 'fixed',
      placement: 'bottom-start',
      middleware: [
          offset(8),
          flip(),
      ]
  });

  const virtualElement: VirtualElement = {getBoundingClientRect(): ClientRectObject {
          return {
              x: 0,
              y: 0,
              top: props.clientRect()?.top,
              left: props.clientRect()?.left,
              bottom: 0,
              right: 0,
              width: props.clientRect()?.width,
              height: props.clientRect()?.height,
          }
      }}
  floatingRef(virtualElement);

  function selectItem(index) {
      const item = props.items[index];

      if (item) {
          props.command({id: item.handle});
      }
  }

  export function handleKeyDown({ event }) {
      if (event.key === 'ArrowUp') {
          handleArrowUp();
          return true;
      }

      if (event.key === 'ArrowDown') {
          handleArrowDown();
          return true;
      }

      if (event.key === 'Enter') {
          handleEnter();
          return true;
      }
  }

  function handleArrowUp() {
      selectedIndex = ((selectedIndex + props.items.length) - 1) % props.items.length
  }

  function handleArrowDown() {
      selectedIndex = (selectedIndex + 1) % props.items.length
  }

  function handleEnter() {
      selectItem(selectedIndex);
  }
</script>

<div class="mentions-list" use:floatingContent>
  {#each props.items as item, index}
    <button class="mentions-list__item" class:mentions-list__item--selected={index === selectedIndex} on:click={() => {selectItem(index)}}>
      @{item.handle}
      {#if (item.displayName)}
        {item.displayName}
      {/if}
    </button>
  {/each}
</div>

<style lang="postcss">
  .mentions-list {
      display: flex;
      flex-direction: column;
      background-color: var(--bg-color-1);
      padding: 8px;
      z-index: 100;
      border-radius: var(--border-radius-3);
      box-shadow: 0 0 10px var(--box-shadow-color-2);

      &__item {
          color: var(--text-color-1);
          font-size: 14px;
          white-space: nowrap;
          padding: 4px;
          width: 100%;
          text-align: left;

          &--selected {
              background-color: var(--bg-color-2);
          }

          &:hover {
              background-color: var(--bg-color-2);
          }
      }
  }
</style>