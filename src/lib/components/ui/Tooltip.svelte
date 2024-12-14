<script lang="ts">
  import { fade } from 'svelte/transition';
  interface Props {
    ref?: import('svelte').Snippet;
    content?: import('svelte').Snippet;
  }

  let { ref, content }: Props = $props();
  let isShown: boolean = $state(false);
</script>

<span class="tooltip-wrap" onmouseenter={() => isShown = true} onmouseleave={() => isShown = false}>
  <span class="tooltip-ref">
     {@render ref?.()}
  </span>

  {#if isShown}
    <span class="tooltip-content" transition:fade="{{ duration: 150, delay: 100 }}">
      {@render content?.()}
    </span>
  {/if}
</span>

<style lang="postcss">
  .tooltip-wrap {
      display: inline-block;
      position: relative;
  }

  .tooltip-content {
      position: absolute;
      left: 50%;
      transform: translateX(-50%);
      background-color: var(--bg-color-2);
      border: 1px solid var(--border-color-2);
      top: calc(100% + 4px);
      color: var(--text-color-1);
      width: max-content;
      padding: 0 8px;
      font-size: 12px;
      height: 24px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10;
      font-weight: initial;
  }
</style>