<script lang="ts">
    import { offset, flip, shift } from 'svelte-floating-ui/dom';
    import { createFloatingActions } from 'svelte-floating-ui';
    import { fade, fly } from 'svelte/transition';
    import { clickOutside } from '$lib/clickOutSide';

    export let isMenuOpen = false;
    let toggle;

    const [ floatingRef, floatingContent ] = createFloatingActions({
        strategy: 'absolute',
        placement: 'bottom-end',
        middleware: [
            offset(10),
            flip({
                padding: {
                    top: 80
                }
            }),
            shift(),
        ]
    });

    function menuOpen() {
        isMenuOpen = isMenuOpen !== true;
    }
</script>

<div>
  <button
      class="timeline-menu-toggle"
      aria-label="Open menu."
      bind:this={toggle}
      on:click={menuOpen}
      use:floatingRef
  >
     <slot name="ref">
       <svg xmlns="http://www.w3.org/2000/svg" width="3" height="12" viewBox="0 0 3 12">
         <path id="dots-horizontal-triple"
               d="M9.5,9.5A1.5,1.5,0,1,1,11,8,1.5,1.5,0,0,1,9.5,9.5ZM9.5,5A1.5,1.5,0,1,1,11,3.5,1.5,1.5,0,0,1,9.5,5Zm0,9A1.5,1.5,0,1,1,11,12.5,1.5,1.5,0,0,1,9.5,14Z"
               transform="translate(-8 -2)" fill="var(--text-color-3)"/>
       </svg>
     </slot>
  </button>

  {#if isMenuOpen}
    <nav
        class="timeline-menu"
        class:timeline-menu--shown={isMenuOpen}
        use:clickOutside={{ignoreElement: toggle}}
        on:outclick={() => (isMenuOpen = false)}
        transition:fly="{{ y: 30, duration: 250 }}"
        use:floatingContent
    >
      <slot name="content"></slot>
    </nav>
  {/if}
</div>