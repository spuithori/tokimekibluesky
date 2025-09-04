<script lang="ts">
  import {agent, currentTimeline, settings} from '$lib/stores';
  import { Search, GanttChartSquare, MessageCircleMore, Ellipsis, Bell, CircleX, RefreshCcw, UserRound, CircleArrowUp, Mic, Square, TrendingUp, Clapperboard, Layers } from 'lucide-svelte';
  import SideMyFeeds from "$lib/components/side/SideMyFeeds.svelte";
  import { fly } from 'svelte/transition';
  import SideMenu from "$lib/components/side/SideMenu.svelte";
  import { clickOutside } from '$lib/clickOutSide';
  import { publishState } from "$lib/classes/publishState.svelte";
  import {type SideItem, sideState} from "$lib/classes/sideState.svelte";
  import { goto } from "$app/navigation";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import SideBluecast from "$lib/components/side/SideBluecast.svelte";
  import SideNotification from "$lib/components/side/SideNotification.svelte";
  import SideColumns from "$lib/components/side/SideColumns.svelte";
  import SideTopic from "$lib/components/side/SideTopic.svelte";
  import {chatState} from "$lib/classes/chatState.svelte";
  import SideWorkspace from "$lib/components/side/SideWorkspace.svelte";

  let { footer = false } = $props();
  let isWorkspaceModalOpen = $state(false);
  let isFeedsModalOpen = $state(false);
  let isNotificationModalOpen = $state(false);
  let isBluecastModalOpen = $state(false);
  let isColumnsModalOpen = $state(false);
  let isTopicModalOpen = $state(false);
  let isMenuOpen = $state(false);
  let refreshTimeout = $state(false);
  const columnState = getColumnState();

  function handleMenuAction(item: SideItem) {
      isMenuOpen = false;

      switch (item) {
          case 'workspace':
            isWorkspaceModalOpen = !isWorkspaceModalOpen;
            break;
          case 'feeds':
            isFeedsModalOpen = !isFeedsModalOpen;
            break;
          case 'chat':
            goto('/chat');
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
          case 'scroll-top':
            try {
                if ($settings.design?.layout === 'decks') {
                    columnState.columns.forEach(column => {
                        if (column?.scrollElement) {
                            column.scrollElement.scroll({
                                top: 0,
                                left: 0,
                                behavior: 'smooth',
                            });
                        }
                    })
                } else {
                    document.querySelector(':root').scroll({
                        top: 0,
                        left: 0,
                        behavior: 'smooth',
                    });
                }
            } catch (e) {
                // nothing.
            }
            break;
          case 'bluecast':
              isBluecastModalOpen = !isBluecastModalOpen
              break;
          case 'columns':
            isColumnsModalOpen = !isColumnsModalOpen
            break;
          case 'topic':
            isTopicModalOpen = !isTopicModalOpen
            break;
          case 'tokmek':
            goto('/');
            setTimeout(() => {
              goto('/profile/did:plc:z72i7hdynmk6r22z27h6tvur/feed/thevids');
            }, 250);
            sideState.isTokStart = true;
            break;
          case 'viewer':
              goto('/atproto-viewer/' + $agent.did());
              break;
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

  function handleViewColumn(column: any, index: number) {
    if ($settings.design.layout === 'decks') {
      if (column.scrollElement) {
        column.scrollElement.scrollIntoView({inline: 'end', behavior: 'instant'});
      }
    } else {
      if ($currentTimeline === index) {
        return false;
      }

      currentTimeline.set(index);
    }

    isColumnsModalOpen = false;
  }
</script>

<ul class="side-nav" class:side-nav--vertical={publishState.isBottom} class:side-nav--footer={footer}>
  {#each sideState.items as item}
    <li class="side-nav__item">
      <button class="side-nav__button side-nav__button--{item}" onclick={() => {handleMenuAction(item)}}>
        {#if (item === 'workspace')}
          <Layers color="var(--nav-secondary-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></Layers>
        {:else if (item === 'feeds')}
          <GanttChartSquare color="var(--nav-secondary-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></GanttChartSquare>
        {:else if (item === 'chat')}
          <MessageCircleMore color="var(--nav-secondary-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></MessageCircleMore>
          {#if chatState.totalChatCount}
            <span class="side-nav__count">{chatState.totalChatCount}</span>
          {/if}
        {:else if (item === 'notifications')}
          <Bell color="var(--nav-secondary-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></Bell>
        {:else if (item === 'search')}
          <Search color="var(--nav-secondary-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></Search>
        {:else if (item === 'topic')}
          <TrendingUp color="var(--nav-secondary-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></TrendingUp>
        {:else if (item === 'profile')}
          <UserRound color="var(--nav-secondary-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></UserRound>
        {:else if (item === 'refresher')}
          <RefreshCcw color={refreshTimeout ? 'var(--border-color-1)' : 'var(--nav-secondary-icon-color)'} strokeWidth="var(--icon-stroke-width, 2px)"></RefreshCcw>
        {:else if (item === 'scroll-top')}
          <CircleArrowUp color="var(--nav-secondary-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></CircleArrowUp>
        {:else if (item === 'bluecast')}
          <Mic color="var(--nav-secondary-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></Mic>
        {:else if (item === 'columns')}
          <Square color="var(--nav-secondary-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></Square>
        {:else if (item === 'tokmek')}
          <Clapperboard color="var(--nav-secondary-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></Clapperboard>
        {/if}
      </button>
    </li>
  {/each}

  <li class="side-nav__item side-nav__item--right">
    <button class="side-nav__button" aria-label="Search" onclick={() => {isMenuOpen = !isMenuOpen}}>
      <Ellipsis color="var(--nav-secondary-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></Ellipsis>
    </button>

    {#if (isMenuOpen)}
      <SideMenu {footer} onclose={() => isMenuOpen = false} onaction={handleMenuAction}></SideMenu>
    {/if}
  </li>
</ul>

{#if isWorkspaceModalOpen}
  <div class="side-modal" transition:fly="{{ y: 16, duration: 250 }}" use:clickOutside={{ignoreElement: '.side-nav__button--workspace'}} onoutclick={() => {isWorkspaceModalOpen = false}}>
    <div class="side-modal__content">
      <SideWorkspace on:close={() => {isWorkspaceModalOpen = false}}></SideWorkspace>
    </div>

    <button class="side-modal__close only-mobile" onclick={() => {isWorkspaceModalOpen = false}}>
      <CircleX size="36" color="var(--text-color-1)"></CircleX>
    </button>
  </div>
{/if}

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

{#if isNotificationModalOpen}
  <div class="side-modal" transition:fly="{{ y: 16, duration: 250 }}" use:clickOutside={{ignoreElement: '.side-nav__button--notifications'}} onoutclick={() => {isNotificationModalOpen = false}}>
    <div class="side-modal__content">
      <SideNotification></SideNotification>
    </div>

    <button class="side-modal__close only-mobile" onclick={() => {isNotificationModalOpen = false}}>
      <CircleX size="36" color="var(--text-color-1)"></CircleX>
    </button>
  </div>
{/if}

{#if isBluecastModalOpen}
  <div class="side-modal" transition:fly="{{ y: 16, duration: 250 }}" use:clickOutside={{ignoreElement: '.side-nav__button--bluecast'}} onoutclick={() => {isBluecastModalOpen = false}}>
    <div class="side-modal__content">
      <SideBluecast></SideBluecast>
    </div>

    <button class="side-modal__close only-mobile" onclick={() => {isBluecastModalOpen = false}}>
      <CircleX size="36" color="var(--text-color-1)"></CircleX>
    </button>
  </div>
{/if}

{#if isColumnsModalOpen}
  <div class="side-modal" transition:fly="{{ y: 16, duration: 250 }}" use:clickOutside={{ignoreElement: '.side-nav__button--columns'}} onoutclick={() => {isColumnsModalOpen = false}}>
    <div class="side-modal__content">
      <SideColumns onviewcolumn={handleViewColumn}></SideColumns>
    </div>

    <button class="side-modal__close only-mobile" onclick={() => {isColumnsModalOpen = false}}>
      <CircleX size="36" color="var(--text-color-1)"></CircleX>
    </button>
  </div>
{/if}

{#if isTopicModalOpen}
  <div class="side-modal" transition:fly="{{ y: 16, duration: 250 }}" use:clickOutside={{ignoreElement: '.side-nav__button--topic'}} onoutclick={() => {isTopicModalOpen = false}}>
    <div class="side-modal__content">
      <SideTopic></SideTopic>
    </div>

    <button class="side-modal__close only-mobile" onclick={() => {isTopicModalOpen = false}}>
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
                  position: sticky;
                  right: 0;
                  background-color: var(--bg-color-1);

                  &::before {
                      content: '';
                      display: block;
                      position: absolute;
                      right: 100%;
                      top: 0;
                      bottom: 0;
                      width: 8px;
                      background-image: linear-gradient(to right, transparent, var(--bg-color-1));
                  }

                  &::after {
                      content: '';
                      display: block;
                      position: absolute;
                      left: 100%;
                      width: 6px;
                      background-color: var(--bg-color-1);
                      top: 0;
                      bottom: 0;
                  }
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

      &__count {
          position: absolute;
          width: 16px;
          height: 16px;
          font-size: 11px;
          font-weight: bold;
          border-radius: 50%;
          background-color: var(--danger-color);
          color: var(--bg-color-1);
          display: grid;
          place-content: center;
          right: -2px;
          top: -2px;

          @media (max-width: 767px) {
              top: 4px;
              right: 2px;
              width: 14px;
              height: 14px;
              font-size: 10px;
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
              padding: 0 6px;
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
      height: calc(100dvh - 64px);
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
          overscroll-behavior-y: contain;
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