<script lang="ts">
  import { onDestroy } from "svelte";
  import SideBar from "$lib/components/side/SideBar.svelte";
  import Publish from "./Publish.svelte";
  import { settings } from "$lib/stores";
  import { getColumnState } from "$lib/classes/columnState.svelte";
  import { publishState } from "$lib/classes/publishState.svelte";
  import { ensurePublishColumn } from "$lib/publishColumn";

  const columnState = getColumnState();

  publishState.intercept = () => {
      if ($settings.design?.layout === 'decks' && window.matchMedia('(min-width: 768px)').matches) {
          ensurePublishColumn(columnState);
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
    class:side--single={$settings.design?.layout !== 'decks'}
>
  <SideBar></SideBar>

  <Publish></Publish>
</div>

<style lang="postcss">
  .side {
      display: grid;
      grid-template-columns: 64px;
      padding-top: var(--side-padding-top, 8px);
      padding-bottom: 4px;
      padding-right: 0;
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
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
          height: 100dvh;
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
