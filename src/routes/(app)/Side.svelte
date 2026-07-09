<script lang="ts">
  import { onDestroy } from "svelte";
  import SideBarHost from "$lib/components/side/SideBarHost.svelte";
  import Publish from "./Publish.svelte";
  import { settings } from "$lib/stores";
  import { getColumnState } from "$lib/classes/columnState.svelte";
  import { publishState } from "$lib/classes/publishState.svelte";
  import { ensurePublishColumn } from "$lib/publishColumn";
  import { riceState } from '$lib/rice/riceState.svelte';

  const columnState = getColumnState();

  publishState.intercept = () => {
      const desktop = window.matchMedia('(min-width: 768px)').matches;
      if (!desktop) return false;
      if (riceState.layoutStyle === 'deck') {
          ensurePublishColumn(columnState);
          return true;
      }
      if (riceState.layoutComposer === 'top') {
          publishState.focusTick++;
          return true;
      }
      return false;
  };

  onDestroy(() => {
      publishState.intercept = undefined;
  });
</script>

<div
    class="side"
    class:side--single={riceState.layoutStyle === 'single'}
>
  <SideBarHost></SideBarHost>

  <Publish></Publish>
</div>

<style lang="postcss">
  .side {
      display: grid;
      grid-template-columns: var(--side-width, 64px);
      padding-top: var(--side-padding-top, 8px);
      padding-bottom: 4px;
      padding-right: var(--side-padding-right, 0);
      backdrop-filter: var(--side-backdrop-filter, none);
      box-shadow: var(--side-box-shadow, none);
      position: fixed;
      top: 0;
      bottom: 0;
      left: var(--shell-inset, 0px);
      z-index: 1002;
      background-color: var(--side-bg-color);
      border-radius: var(--side-border-radius, 0);

      @media (max-width: 767px) {
          position: static;
          grid-template-columns: 0;
          background-color: transparent;
          height: auto;
          backdrop-filter: none;
          padding: 0;
          border-radius: 0;
      }

      &--single {
          position: sticky;
          height: calc(100dvh - var(--rice-statusbar-top-height, 0px) - var(--rice-statusbar-bottom-height, 0px));
          border-radius: var(--single-side-border-radius, 0);

          @media (max-width: 767px) {
              position: static;
              grid-template-columns: 0;
              background-color: transparent;
              height: auto;
              backdrop-filter: none;
              padding: 0;
              border-radius: 0;
          }
      }
  }
</style>
