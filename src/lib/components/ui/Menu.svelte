<script lang="ts">
  import { offset, flip, shift } from 'svelte-floating-ui/dom';
  import { createFloatingActions } from 'svelte-floating-ui';
  import { fly } from 'svelte/transition';
  import { clickOutside } from '$lib/clickOutSide';
  import {isPreventEvent} from "$lib/stores";
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
    isLongPress = false,
  }: Props = $props();
  let toggle = $state();

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
      isMenuOpen = isMenuOpen !== true;
  }

  function handleOutClick() {
      if (isLongPress) {
          isLongPress = false;
          return false;
      }

      isPreventEvent.set(true);
      isMenuOpen = false;
  }

  function handleOutroEnd() {
      isPreventEvent.set(false);
  }
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
  <nav
    class="timeline-menu"
    class:timeline-menu--shown={isMenuOpen}
    use:clickOutside={{ignoreElement: toggle}}
    onoutclick={handleOutClick}
    transition:fly="{{ y: 30, duration: 250 }}"
    use:floatingContent
    onoutroend={handleOutroEnd}
  >
    {@render sub?.()}
    {@render content?.()}
  </nav>
{/if}