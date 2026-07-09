<script lang="ts">
  import {goto} from '$app/navigation';
  import {isJunkModalContinuation} from '$lib/junkModalTransition';
  import { riceState } from '$lib/rice/riceState.svelte';

  interface Props {
    isVirtual?: boolean;
    children?: import('svelte').Snippet;
  }

  let { isVirtual = false, children }: Props = $props();

  const skipEntrance = isJunkModalContinuation();

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

<svelte:window onkeydown={handleKeydown}></svelte:window>

<div class="modal-page" class:modal-page--decks={riceState.layoutStyle === 'deck'} class:modal-page--default={riceState.layoutStyle === 'single'}>
  <div class="modal-page-frame" class:modal-page-frame--no-anim={skipEntrance}>
    <div class="modal-page-content" class:modal-page-content--virtual={isVirtual}>
      {@render children?.()}
    </div>
  </div>

  {#if riceState.layoutStyle === 'deck'}
    <button class="modal-page-bg-close" onclick={close} aria-label="Close"></button>
  {/if}
</div>

