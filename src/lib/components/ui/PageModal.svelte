<script lang="ts">
  import {settings} from '$lib/stores';
  import {goto} from '$app/navigation';
  import {publishState} from "$lib/classes/publishState.svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";

  interface Props {
    isVirtual?: boolean;
    children?: import('svelte').Snippet;
  }

  let { isVirtual = false, children }: Props = $props();
  const columnState = getColumnState(true);

  function close() {
      columnState.removeAll();
      
      goto('/', {
          noScroll: true,
      });
  }

  function handleKeydown(event) {
      const activeElement = document.activeElement?.tagName;

      if (event.key === 'Escape' && (activeElement === 'BODY' || activeElement === 'BUTTON')) {
          close();
      }
  }
</script>

<svelte:window onkeydown={handleKeydown}></svelte:window>

<div class="modal-page modal-page--{$settings.design?.layout}" class:modal-page--side={publishState.isSideShown}>
  <div class="modal-page-content" class:modal-page-content--virtual={isVirtual}>
    {@render children?.()}
  </div>

  {#if $settings.design?.layout === 'decks'}
    <button class="modal-page-bg-close" onclick={close} aria-label="Close"></button>
  {/if}
</div>

<style lang="postcss">
  .modal-page-bg-close {
      position: fixed;
      left: 0;
      bottom: 0;
      top: 0;
      right: 0;
      width: 100%;
      height: 100%;
  }

  .modal-page {
      &--default {
          width: var(--single-column-width, var(--single-m-width));

          @media (max-width: 767px) {
              width: 100vw;
          }
      }
  }
</style>