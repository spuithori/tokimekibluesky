<script lang="ts">
  import { offset, flip, shift } from 'svelte-floating-ui/dom';
  import { createFloatingActions } from 'svelte-floating-ui';
  import { fly } from 'svelte/transition';
  import type { Placement } from '@floating-ui/core';

  interface Props {
    isMenuOpen?: boolean;
    buttonClassName?: string;
    position?: Placement;
    ref?: import('svelte').Snippet;
    sub?: import('svelte').Snippet;
    content?: import('svelte').Snippet;
  }

  let {
    isMenuOpen = $bindable(false),
    buttonClassName = 'timeline-menu-toggle',
    position = 'bottom-end',
    ref,
    sub,
    content,
    onopen = () => {},
  }: Props = $props();

  let toggle = $state();
  let el = $state();

  const [ floatingRef, floatingContent ] = createFloatingActions({
      strategy: 'absolute',
      placement: position,
      middleware: [
          offset(10),
          flip({
              padding: {
                  top: position === 'bottom-end' ? 80 : 0,
              }
          }),
          shift(),
      ]
  });

  function menuOpen() {
      isMenuOpen = !isMenuOpen;

      if (isMenuOpen) {
        onopen();
      }
  }

  function handleClick(event) {
    const rect = el.getBoundingClientRect();
    const isInDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height && rect.left <= event.clientX && event.clientX <= rect.left + rect.width);

    if (!isInDialog) {
      handleClose();
    }
  }

  function handleClose() {
      isMenuOpen = false;
    el.showModal();
  }

  $effect(() => {
    if (el) {
      el.showModal();
    }
  });
</script>

<button
  class={buttonClassName}
  aria-label="Open menu."
  bind:this={toggle}
  onclick={menuOpen}
  use:floatingRef
>
  {#if ref}
    {@render ref()}
  {:else}
    <svg xmlns="http://www.w3.org/2000/svg" width="3" height="12" viewBox="0 0 3 12">
      <path id="dots-horizontal-triple"
            d="M9.5,9.5A1.5,1.5,0,1,1,11,8,1.5,1.5,0,0,1,9.5,9.5ZM9.5,5A1.5,1.5,0,1,1,11,3.5,1.5,1.5,0,0,1,9.5,5Zm0,9A1.5,1.5,0,1,1,11,12.5,1.5,1.5,0,0,1,9.5,14Z"
            transform="translate(-8 -2)" fill="var(--text-color-3)"/>
    </svg>
  {/if}
</button>

{#if isMenuOpen}
  <dialog
    class="timeline-menu"
    onclose={handleClose}
    onclick={handleClick}
    transition:fly="{{ y: 30, duration: 250 }}"
    use:floatingContent
    bind:this={el}
  >
    {@render sub?.()}
    {@render content?.()}
  </dialog>
{/if}