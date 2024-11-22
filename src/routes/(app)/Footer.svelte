<script lang="ts">
  import { isChatColumnFront } from "$lib/stores";
  import SideMyFeeds from "$lib/components/side/SideMyFeeds.svelte";
  import {fly} from 'svelte/transition';
  import {scrollDirectionState} from "$lib/classes/scrollDirectionState.svelte";
  import SideNav from "$lib/components/side/SideNav.svelte";

  let isFeedsModalOpen = $state(false);

  function handlePopstate() {
      isFeedsModalOpen = false;
  }
</script>

<svelte:window onpopstate={handlePopstate} />

<footer class="footer" class:footer--hidden={$isChatColumnFront} class:footer--scroll-down={scrollDirectionState.direction === 'down'}>
  <div class="footer__wrap">
    <SideNav footer={true}></SideNav>
  </div>
</footer>

{#if isFeedsModalOpen}
  <div class="footer-feeds-modal" transition:fly="{{ y: 30, duration: 250 }}">
    <div class="footer-feeds-modal__content">
      <SideMyFeeds on:close={() => {isFeedsModalOpen = false}}></SideMyFeeds>
    </div>

    <button class="footer-feeds-modal__close" onclick={() => {history.back()}}>
      <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
    </button>
  </div>
{/if}

<div class="footer-round" class:footer-round--scroll-down={scrollDirectionState.direction === 'down'}></div>

<style lang="postcss">
  .footer {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      border-radius: 10px 10px 0 0;
      box-shadow: 0 -1px 6px rgba(61, 120, 209, .09);
      background-color: var(--bg-color-1);
      z-index: 999;

      @media (min-width: 767px) {
          display: none;
      }

      @media (max-width: 767px) {
          transition: transform .25s cubic-bezier(0.16, 0.01, 0.3, 0.98);
      }

      &::before {
          content: '';
          display: block;
          position: absolute;
          right: 20px;
          top: calc(16px);
          bottom: 0;
          background-color: var(--bg-color-3);
          width: 52px;
      }

      &__wrap {
          display: flex;
          align-items: center;
          padding: 0 0 var(--safe-area-bottom);
          height: calc(60px + var(--safe-area-bottom));
      }

      &--hidden {
          @media (max-width: 767px) {
              transform: translateY(calc(70px + var(--safe-area-bottom)));

              & ~ .footer-round {
                  display: none;
              }
          }
      }

      &--scroll-down {
          @media (max-width: 767px) {
              transform: translateY(calc(70px + var(--safe-area-bottom)));
          }
      }
  }

  .footer-round {
      position: fixed;
      width: 70px;
      height: 70px;
      background-color: var(--bg-color-1);
      border-radius: 50%;
      right: 11px;
      bottom: calc(11px + var(--safe-area-bottom));
      box-shadow: 0 3px 6px rgba(0, 0, 0, .16);
      z-index: 11;
      will-change: transform;

      @media (min-width: 767px) {
          display: none;
      }

      @media (max-width: 767px) {
          transition: transform .25s cubic-bezier(0.16, 0.01, 0.3, 0.98) .075s;
      }

      &--scroll-down {
          @media (max-width: 767px) {
              transform: scale(.7);
          }
      }
  }

  .footer-feeds-modal {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      top: 0;
      background-color: rgba(0, 0, 0, .5);
      backdrop-filter: blur(8px);
      height: calc(100dvh);
      overscroll-behavior-y: none;
      overflow-y: auto;
      z-index: 9999;

      &__content {
          position: fixed;
          bottom: 80px;
          box-shadow: 0 0 10px var(--box-shadow-color-1);
          border-radius: var(--border-radius-3);
          height: calc(100dvh - 100px);
          overscroll-behavior-y: none;
          left: 16px;
          right: 16px;
          background-color: var(--bg-color-1);
          overflow-y: auto;
      }

      &__close {
          position: absolute;
          bottom: 24px;
          width: 36px;
          height: 36px;
          left: 0;
          right: 0;
          margin: auto;
      }
  }
</style>