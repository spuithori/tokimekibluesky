<script lang="ts">
  import { runCommand } from '$lib/commands/registry.svelte';
  import Ellipsis from '@lucide/svelte/icons/ellipsis';
  import SideMenu from "$lib/components/side/SideMenu.svelte";
  import {sideState} from "$lib/classes/sideState.svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";
  import { resolveSideItemDef } from "$lib/components/side/sideItems";
  import { riceState } from "$lib/rice/riceState.svelte";

  let { footer = false } = $props();
  let isMenuOpen = $state(false);
  let refreshTimeout = $state(false);
  const columnState = getColumnState();

  const visibleItems = $derived(riceState.sidebar?.items ?? sideState.items);

  function handleMenuAction(item: string, event?: Event) {
      isMenuOpen = false;

      if (item === 'refresher') {
          if (refreshTimeout) return;
          refreshTimeout = true;
          setTimeout(() => {
              refreshTimeout = false;
          }, 3000);
      }

      const def = resolveSideItemDef(item);
      if (def) {
          const anchor = event?.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
          runCommand(def.command, def.commandArg, { anchor });
      }
  }

</script>

<ul class="side-nav side-nav--vertical" class:side-nav--footer={footer}>
  {#each visibleItems as item (item)}
    {@const def = resolveSideItemDef(item)}
    {#if def}
      {@const Icon = def.icon}
      {@const badgeCount = def.badge?.({ columnState }) ?? 0}
      <li class="side-nav__item">
        <button class="side-nav__button side-nav__button--{item}" onclick={(event) => {handleMenuAction(item, event)}}>
          <Icon
            color={item === 'refresher' && refreshTimeout ? 'var(--border-color-1)' : 'var(--nav-secondary-icon-color)'}
            strokeWidth="var(--icon-stroke-width, 2px)"
          ></Icon>
          {#if badgeCount}
            <span class="side-nav__count">{badgeCount}</span>
          {/if}
        </button>
      </li>
    {/if}
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

</style>