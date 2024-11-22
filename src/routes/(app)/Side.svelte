<script lang="ts">
  import SideBar from "$lib/components/side/SideBar.svelte";
  import SideNav from "$lib/components/side/SideNav.svelte";
  import Publish from "./Publish.svelte";
  import { settings } from "$lib/stores";
  import { publishState } from "$lib/classes/publishState.svelte";
</script>

<div
    class="side"
    class:side--single={$settings.design?.layout !== 'decks'}
    class:side--hidden={publishState.isBottom}
>
  <SideBar></SideBar>

  <div class="side-main">
    {#if publishState.isSideShown}
      <SideNav></SideNav>
    {/if}

    <div class="side-content">
      <Publish></Publish>
    </div>
  </div>
</div>

<style lang="postcss">
  .side {
      display: grid;
      grid-template-columns: 64px 340px;
      padding-top: 8px;
      padding-bottom: 4px;
      padding-right: var(--side-padding-right, 8px);
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      z-index: 1002;
      background-color: var(--side-bg-color);

      @media (max-width: 767px) {
          position: static;
          grid-template-columns: 0;
          background-color: transparent;
          height: auto;
          backdrop-filter: none;
          padding: 0;
      }

      &--single {
          position: sticky;
          height: 100dvh;

          @media (max-width: 767px) {
              position: static;
              grid-template-columns: 0;
              background-color: transparent;
              height: auto;
              backdrop-filter: none;
              padding: 0;
          }
      }

      &--hidden {
          padding-right: 0;
          grid-template-columns: 64px;

          @media (max-width: 767px) {
              grid-template-columns: 0;
              background-color: transparent;
          }

          .side-main {
              position: fixed;
              left: 0;
              top: 0;
              margin: 0 auto;
              z-index: 1000;

              @media (max-width: 767px) {
                  max-width: 100vw;
                  grid-template-columns: 0;
                  top: auto;
                  bottom: 0;
                  border-radius: 0;
                  box-shadow: none;
                  height: 56px;
                  background-color: transparent;
                  pointer-events: none;
                  z-index: 1013;
              }
          }

          .side-content {
              position: absolute;
              right: 0;
              top: 60px;
              border: none;
          }
      }

      &--float {
          z-index: 1002;
      }
  }

  .side-main {
      display: flex;
      flex-direction: column;

      @media (max-width: 767px) {
          position: absolute;
          max-width: 100vw;
          grid-template-columns: 0;
          top: auto;
          bottom: 0;
          border-radius: 0;
          box-shadow: none;
          height: 56px;
          background-color: transparent;
          pointer-events: none;
          z-index: 1013;
      }
  }

  .side-content {
      border-radius: var(--nav-content-border-radius);
      background-color: var(--nav-content-bg-color);
      background-image: var(--nav-content-bg-image, none);
      border: var(--nav-content-border-width) solid var(--nav-content-border-color);
      flex: 1;
      max-height: calc(100svh - 60px);
      box-shadow: var(--side-box-shadow);

      @media (max-width: 767px) {
          border: none;
      }

      @media (min-width: 768px) {
          scrollbar-color: var(--scroll-bar-color) transparent;

          &::-webkit-scrollbar {
              width: 6px;
          }

          &::-webkit-scrollbar-thumb {
              background: var(--scroll-bar-color);
              border-radius: 0;
          }

          &::-webkit-scrollbar-track {
              background: transparent;
              border-radius: 0;
          }
      }
  }
</style>