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
      grid-template-columns: var(--side-rail-width, 64px) var(--side-width, 340px);
      padding-top:var(--side-padding-top, 8px);
      padding-bottom: var(--side-padding-bottom, 4px);
      padding-right: var(--side-padding-right, 8px);
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      z-index: 1002;
      background-color: var(--side-bg-color);
      backdrop-filter: var(--side-backdrop-filter);
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

      &--hidden {
          padding-right: 0;
          grid-template-columns: var(--side-rail-width, 64px);

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
              --side-rim-display: none;
              --side-glow-display: none;
              position: absolute;
              right: 0;
              top: calc(var(--side-padding-top, 8px) + var(--side-nav-height, 48px) + 4px);
              border: none;
          }
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
      background: var(--nav-content-bg-image, none), var(--nav-content-bg-color);
      border-width: var(--nav-content-border-width);
      border-color: var(--nav-content-border-color);
      border-style: solid;
      flex: 1;
      max-height: calc(100svh - var(--side-padding-top, 8px) - var(--side-nav-height, 48px) - var(--side-padding-bottom, 4px));
      box-shadow: var(--side-box-shadow);
      padding: var(--nav-content-padding, 0);

      @media (max-width: 767px) {
          border: none;
          padding: 0;
      }

      @media (min-width: 768px) {
          position: relative;
          scrollbar-color: var(--scroll-bar-color) transparent;
          scrollbar-width: var(--scroll-bar-width, auto);

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

          &::after {
              content: '';
              display: var(--side-rim-display, none);
              position: absolute;
              inset: calc(-1 * var(--nav-content-border-width));
              z-index: 1;
              padding: var(--side-rim-width, var(--nav-content-border-width));
              border-radius: inherit;
              background: var(--side-rim, var(--deck-rim, none)) border-box;
              mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
              mask-composite: exclude;
              pointer-events: none;
              opacity: var(--side-rim-opacity, var(--deck-rim-opacity, 1));
              transition: var(--side-rim-transition, var(--deck-rim-transition, none));

              @media (prefers-reduced-motion: reduce) {
                  transition: none;
              }
          }

          &::before {
              content: '';
              display: var(--side-glow-display, none);
              position: absolute;
              inset: calc(-1 * var(--nav-content-border-width));
              border-radius: inherit;
              box-shadow: var(--side-glow, var(--deck-glow, none));
              opacity: 0;
              transition: var(--side-glow-transition, var(--side-rim-transition, var(--deck-rim-transition, none)));
              pointer-events: none;

              @media (prefers-reduced-motion: reduce) {
                  transition: none;
              }
          }

          &:hover::before,
          &:has(:global(:focus-visible))::before {
              opacity: 1;
          }

          &:hover::after,
          &:has(:global(:focus-visible))::after {
              background: var(--side-rim-active, var(--side-rim, var(--deck-rim, none))) border-box;
              opacity: var(--side-rim-active-opacity, var(--deck-rim-active-opacity, var(--side-rim-opacity, 1)));
          }
      }
  }
</style>