<script lang="ts">
  import { fly } from 'svelte/transition';
  import type { LayoutData } from './$types';

  interface Props {
    data: LayoutData;
    children?: import('svelte').Snippet;
  }

  let { data, children }: Props = $props();
</script>

<div class="settings-modal">
  <div class="settings-modal-content atmosphere-modal">
    <div class="atmosphere-content">
      {#key data.pathname}
        <div class="atmosphere-content-container" in:fly={{ x: 25, duration: 100, delay: 100 }} out:fly={{ duration: 100 }}>
          {@render children?.()}
        </div>
      {/key}
    </div>
  </div>

  <a class="modal-background-close" aria-hidden="true" href="/"></a>
</div>

<style lang="postcss">
  .atmosphere-modal {
      width: 1240px;
      max-width: calc(100vw - 32px);
      height: min(860px, 88vh);

      @media (max-width: 767px) {
          max-width: 100vw;
          height: 100dvh;
      }
  }

  .atmosphere-content {
      background-color: var(--bg-color-1);
      height: 100%;
      overflow-y: auto;
      overscroll-behavior-y: contain;
  }
</style>
