<script lang="ts">
  import SideBar from "$lib/components/side/SideBar.svelte";
  import SideNav from "$lib/components/side/SideNav.svelte";
  import Publish from "./Publish.svelte";
  import Notification from "./Notification.svelte";
  import {isPublishInstantFloat, settings, sideState} from "$lib/stores";
  import Settings from "./Settings.svelte";
  import SideProfile from "$lib/components/side/SideProfile.svelte";
  import SideSearch from "$lib/components/side/SideSearch.svelte";
  import SideStore from "$lib/components/side/SideStore.svelte";
</script>

<div
    class="side"
    class:side--single={$settings.design?.layout !== 'decks'}
    class:side--hidden={$settings.design?.publishPosition !== 'left'}
    class:side--float={$isPublishInstantFloat}
>
  <SideBar></SideBar>

  <div class="side-main">
    <SideNav></SideNav>

    <div class="side-content side-content--{$sideState}">
      <div class="side-content-publish" class:side-content-publish--visible={$sideState === 'publish' || $settings.design?.publishPosition === 'bottom'}>
        <Publish></Publish>
      </div>

      {#if ($sideState === 'notification' && $settings.design?.publishPosition !== 'bottom')}
        <div class="side-notification">
          <Notification isPage={true}></Notification>
        </div>
      {/if}

      {#if ($sideState === 'settings' && $settings.design?.publishPosition !== 'bottom')}
        <Settings style={'side'}></Settings>
      {/if}

      {#if ($sideState === 'profile' && $settings.design?.publishPosition !== 'bottom')}
        <SideProfile></SideProfile>
      {/if}

      {#if ($sideState === 'search' && $settings.design?.publishPosition !== 'bottom')}
        <SideSearch></SideSearch>
      {/if}

      {#if ($sideState === 'store' && $settings.design?.publishPosition !== 'bottom')}
        <SideStore></SideStore>
      {/if}
    </div>
  </div>
</div>

<style lang="postcss">
  .side {
      display: grid;
      grid-template-columns: 64px 340px;
      padding-top: 8px;
      padding-bottom: 4px;
      padding-right: 8px;
      position: fixed;
      top: 0;
      bottom: 0;
      left: 0;
      z-index: 1000;
      background-color: var(--blurred-bg-color);
      backdrop-filter: blur(8px);

      @media (max-width: 767px) {
          position: static;
          grid-template-columns: 0;
          background-color: transparent;
          height: auto;
          backdrop-filter: none;
          padding: 0;
          z-index: auto;
      }

      &--single {
          position: sticky;
          height: 100svh;
          z-index: 1002;

          @media (max-width: 767px) {
              grid-template-columns: 0;
              background-color: transparent;
              height: auto;
              backdrop-filter: none;
              padding: 0;
              position: static;
              z-index: auto;
          }
      }

      &--hidden {
          grid-template-columns: 64px;
          position: static;
          z-index: auto;
          backdrop-filter: none;
          padding: 0;
          align-items: flex-start;
          height: auto;

          @media (max-width: 767px) {
              grid-template-columns: 0;
              background-color: transparent;
          }

          .side-main {
              position: fixed;
              left: 0;
              right: 0;
              top: 0;
              max-width: 740px;
              width: 100%;
              margin: 0 auto;
              z-index: 1000;
              background-color: var(--bg-color-1);
              box-shadow: 0 0 2px rgba(0, 0, 0, .08), 0 8px 16px rgba(0, 0, 0, .1);
              border-radius: 0 0 8px 8px;
              height: 52px;

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

      @media (max-width: 767px) {

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
      border-radius: 10px;
      background-color: var(--bg-color-1);
      border: 1px solid var(--border-color-2);
      flex: 1;
      overflow-y: auto;
      max-height: calc(100svh - 60px);

      &--publish {
          overflow-y: visible;
      }

      @media (max-width: 767px) {
          border: none;
      }
  }

  .side-content-publish {
      display: none;
      pointer-events: visible;

      @media (max-width: 767px) {
          display: block;
      }

      &--visible {
          display: block;
      }
  }

  .side-notification {
      padding: 16px;
      overflow: auto;
      max-height: calc(100svh - 62px);
  }
</style>