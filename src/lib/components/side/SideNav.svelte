<script lang="ts">
  import { agent } from '$lib/stores';
  import { Search, GanttChartSquare, MessageCircleMore, Ellipsis, Bell, CircleX, RefreshCcw, UserRound } from 'lucide-svelte';
  import SideMyFeeds from "$lib/components/side/SideMyFeeds.svelte";
  import { fly } from 'svelte/transition';
  import SideMenu from "$lib/components/side/SideMenu.svelte";
  import SideChat from "$lib/components/side/SideChat.svelte";
  import { clickOutside } from '$lib/clickOutSide';
  import Notification from "../../../routes/(app)/Notification.svelte";
  import { publishState } from "$lib/classes/publishState.svelte";
  import {type SideItem, sideState} from "$lib/classes/sideState.svelte";
  import { goto } from "$app/navigation";

  let { footer = false } = $props();
  let isFeedsModalOpen = $state(false);
  let isChatModalOpen = $state(false);
  let isNotificationModalOpen = $state(false);
  let isMenuOpen = $state(false);
  let refreshTimeout = $state(false);

  function handleMenuAction(item: SideItem) {
      isMenuOpen = false;

      switch (item) {
          case 'feeds':
            isFeedsModalOpen = !isFeedsModalOpen;
            break;
          case 'chat':
            isChatModalOpen = !isChatModalOpen;
            break;
          case 'notifications':
            isNotificationModalOpen = !isNotificationModalOpen
            break;
          case 'search':
            goto('/search');
            break;
          case 'profile':
            goto(`/profile/${$agent.handle()}`);
            break;
          case 'refresher':
            handleRefresh();
            break;
          default:
      }
  }

  function handleRefresh() {
      if (refreshTimeout) {
          return false;
      }
      refreshTimeout = true;

      const character = 'r';
      const keyboardEvent = new KeyboardEvent('keydown', {
          key: character,
          code: character.toUpperCase(),
          bubbles: true,
          cancelable: true,
      });
      document.dispatchEvent(keyboardEvent);

      setTimeout(() => {
          refreshTimeout = false;
      }, 3000);
  }
</script>

<ul class="side-nav" class:side-nav--vertical={publishState.isBottom} class:side-nav--footer={footer}>
  {#each sideState.items as item}
    <li class="side-nav__item">
      <button class="side-nav__button" onclick={() => {handleMenuAction(item)}}>
        {#if (item === 'feeds')}
          <GanttChartSquare color="var(--nav-secondary-icon-color)"></GanttChartSquare>
        {:else if (item === 'chat')}
          <MessageCircleMore color="var(--nav-secondary-icon-color)"></MessageCircleMore>
        {:else if (item === 'notifications')}
          <Bell color="var(--nav-secondary-icon-color)"></Bell>
        {:else if (item === 'search')}
          <Search color="var(--nav-secondary-icon-color)"></Search>
        {:else if (item === 'profile')}
          <UserRound color="var(--nav-secondary-icon-color)"></UserRound>
        {:else if (item === 'refresher')}
          <RefreshCcw color={refreshTimeout ? 'var(--border-color-1)' : 'var(--nav-secondary-icon-color)'}></RefreshCcw>
        {/if}
      </button>
    </li>
  {/each}

  <li class="side-nav__item side-nav__item--right">
    <button class="side-nav__button" aria-label="Search" onclick={() => {isMenuOpen = !isMenuOpen}}>
      <Ellipsis color="var(--nav-secondary-icon-color)"></Ellipsis>
    </button>

    {#if (isMenuOpen)}
      <SideMenu {footer} onclose={() => isMenuOpen = false} onaction={handleMenuAction}></SideMenu>
    {/if}
  </li>
</ul>

{#if isFeedsModalOpen}
  <div class="side-modal" transition:fly="{{ y: 16, duration: 250 }}" use:clickOutside={{ignoreElement: '.side-nav__button--feeds'}} onoutclick={() => {isFeedsModalOpen = false}}>
    <div class="side-modal__content">
      <SideMyFeeds on:close={() => {isFeedsModalOpen = false}}></SideMyFeeds>
    </div>

    <button class="side-modal__close only-mobile" onclick={() => {isFeedsModalOpen = false}}>
      <CircleX size="36" color="var(--text-color-1)"></CircleX>
    </button>
  </div>
{/if}

{#if isChatModalOpen}
  <div class="side-modal" transition:fly="{{ y: 16, duration: 250 }}" use:clickOutside={{ignoreElement: '.side-nav__button--chat'}} onoutclick={() => {isChatModalOpen = false}}>
    <div class="side-modal__content">
      <SideChat on:close={() => {isChatModalOpen = false}}></SideChat>
    </div>

    <button class="side-modal__close only-mobile" onclick={() => {isChatModalOpen = false}}>
      <CircleX size="36" color="var(--text-color-1)"></CircleX>
    </button>
  </div>
{/if}

{#if isNotificationModalOpen}
  <div class="side-modal" transition:fly="{{ y: 16, duration: 250 }}" use:clickOutside={{ignoreElement: '.side-nav__button--notification'}} onoutclick={() => {isNotificationModalOpen = false}}>
    <div class="side-modal__content">
      <Notification isPage={true} on:close={() => {isNotificationModalOpen = false}}></Notification>
    </div>

    <button class="side-modal__close only-mobile" onclick={() => {isNotificationModalOpen = false}}>
      <CircleX size="36" color="var(--text-color-1)"></CircleX>
    </button>
  </div>
{/if}

<style lang="postcss">
  .side-nav {
      list-style: none;
      display: flex;

      @media (max-width: 767px) {
          display: none;
      }

      &__item {
          &--right {
              margin-left: auto;
              position: relative;

              @media (max-width: 767px) {
                  margin-left: 0;
              }
          }
      }

      &__button {
          display: grid;
          place-content: center;
          width: 48px;
          height: 48px;
          border-radius: 5px;
          position: relative;
          transition: background-color .2s linear;

          &:hover {
              &::after {
                  opacity: 1;
              }
          }

          &::before {
              content: '';
              display: block;
              position: absolute;
              left: 0;
              right: 0;
              top: 0;
              width: var(--nav-current-bar-width);
              height: var(--nav-current-bar-height);
              border-radius: var(--nav-current-bar-border-radius);
              background-color: var(--nav-current-bar-color);
              margin: auto;
              transform: scaleX(0);
              transition: transform .25s cubic-bezier(0, 0, 0.18, 1);
          }

        &::after {
            content: '';
            display: block;
            position: absolute;
            left: 6px;
            right: 6px;
            bottom: 6px;
            top: 6px;
            border-radius: var(--border-radius-2);
            background-color: var(--side-nav-hover-bg-color);
            z-index: -1;
            opacity: 0;
            transition: opacity .25s cubic-bezier(0, 0, 0.18, 1);
        }

          &--current {
              &::before {
                  transform: scaleX(1);
              }
          }
      }

      &--vertical {
          flex-direction: column;
          gap: 8px;

          @media (max-width: 767px) {
              justify-content: flex-start;
              padding: 0;
          }

          .side-nav__button {
              &::before {
                  content: none;
              }

              &--publish {
                  display: none;
              }
          }
      }

      &--footer {
          flex-direction: row;

          @media (max-width: 767px) {
              flex: 1;
              display: flex;
              justify-content: space-around;
              padding-right: 80px;
              padding-left: 6px;
              overflow-y: hidden;

              &::-webkit-scrollbar {
                  display: none;
              }
          }
      }
  }

  .side-modal {
      position: absolute;
      top: 56px;
      bottom: 16px;
      left: 64px;
      right: 8px;
      height: calc(100vh - 64px);
      z-index: 9999;
      width: calc(308px + 32px);

      @media (max-width: 767px) {
          top: auto;
          bottom: 64px;
          left: 0;
          right: 0;
          width: auto;
      }

      &__content {
          position: absolute;
          inset: 12px 16px;
          box-shadow: 0 0 12px var(--box-shadow-color-1);
          border-radius: var(--border-radius-3);
          overscroll-behavior-y: none;
          background-color: var(--bg-color-1);
          overflow-x: hidden;
          max-width: 308px;

          @media (max-width: 767px) {
              max-width: initial;
          }

          @media (min-width: 768px) {
              scrollbar-color: var(--scroll-bar-color) var(--scroll-bar-bg-color);

              &::-webkit-scrollbar {
                  width: 6px;
              }

              &::-webkit-scrollbar-thumb {
                  background: var(--scroll-bar-color);
                  border-radius: 0;
              }

              &::-webkit-scrollbar-track {
                  background: var(--scroll-bar-bg-color);
                  border-radius: 0;
              }
          }
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