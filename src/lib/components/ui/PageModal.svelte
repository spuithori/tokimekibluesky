<script lang="ts">
  import {settings} from '$lib/stores';
  import {goto} from '$app/navigation';

  export let isVirtual = false;

  function close() {
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

<svelte:window on:keydown={handleKeydown}></svelte:window>

<div class="modal-page modal-page--{$settings.design?.layout}">
  <div class="modal-page-content" class:modal-page-content--virtual={isVirtual}>
    <slot></slot>
  </div>

  {#if $settings.design?.layout === 'decks'}
    <button class="modal-page-bg-close" on:click={close}></button>
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
</style>