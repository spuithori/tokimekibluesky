<script lang="ts">
  import { offset, flip, shift } from 'svelte-floating-ui/dom';
  import { createFloatingActions } from 'svelte-floating-ui';
  import { fade } from 'svelte/transition';
  interface Props {
    ref?: import('svelte').Snippet;
    content?: import('svelte').Snippet;
  }

  let { ref, content }: Props = $props();

  const [ floatingRef, floatingContent ] = createFloatingActions({
      strategy: 'absolute',
      placement: 'top',
      middleware: [
          offset(5),
          flip({
              padding: {
                  top: 80
              }
          }),
          shift(),
      ]
  });

  let isShown: boolean = $state(false);
</script>

<span class="tooltip-wrap" onmouseenter={() => isShown = true} onmouseleave={() => isShown = false} use:floatingRef>
  <span class="tooltip-ref">
     {@render ref?.()}
  </span>

  {#if isShown}
    <span class="tooltip-content" style="position:absolute" use:floatingContent transition:fade="{{ duration: 150, delay: 150 }}">
      {@render content?.()}
    </span>
  {/if}
</span>

<style lang="postcss">
    .tooltip-wrap {
        display: inline-block;
    }

  .tooltip-content {
      background-color: rgba(0, 0, 0, .75);
      color: #fff;
      width: max-content;
      padding: 0 10px;
      font-size: 13px;
      height: 24px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      font-weight: initial;
  }
</style>