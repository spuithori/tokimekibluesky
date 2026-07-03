<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { settings } from '$lib/stores';
    import { offset, shift, size } from 'svelte-floating-ui/dom';
    import { createFloatingActions } from 'svelte-floating-ui';
    import { fly } from 'svelte/transition';
    import Bell from '@lucide/svelte/icons/bell';
    import CircleArrowUp from '@lucide/svelte/icons/circle-arrow-up';
    import Columns3 from '@lucide/svelte/icons/columns-3';
    import GanttChartSquare from '@lucide/svelte/icons/gantt-chart-square';
    import Heart from '@lucide/svelte/icons/heart';
    import MessageCircleMore from '@lucide/svelte/icons/message-circle-more';
    import Mic from '@lucide/svelte/icons/mic';
    import Pin from '@lucide/svelte/icons/pin';
    import PinOff from '@lucide/svelte/icons/pin-off';
    import RectangleVertical from '@lucide/svelte/icons/rectangle-vertical';
    import RefreshCcw from '@lucide/svelte/icons/refresh-ccw';
    import Search from '@lucide/svelte/icons/search';
    import Settings from '@lucide/svelte/icons/settings';
    import Square from '@lucide/svelte/icons/square';
    import TrendingUp from '@lucide/svelte/icons/trending-up';
    import UserRound from '@lucide/svelte/icons/user-round';
    import Clapperboard from '@lucide/svelte/icons/clapperboard';
    import Layers from '@lucide/svelte/icons/layers';
    import Database from '@lucide/svelte/icons/database';
    import {ALL_ITEMS, sideState} from "$lib/classes/sideState.svelte";

    let { onclose, onaction, footer = false } = $props();
    let el = $state();
    const placement = footer ? 'top' : 'right-end';
    const mainAxis = footer ? 64 : 16;

    const [ floatingRef, floatingContent ] = createFloatingActions({
        strategy: 'absolute',
        placement: placement,
        middleware: [
            offset({
                alignmentAxis: 8,
                mainAxis: mainAxis,
            }),
            shift(),
            size({
              apply({availableWidth, availableHeight, elements}) {
                Object.assign(elements.floating.style, {
                  maxHeight: `${Math.max(0, availableHeight - 16)}px`,
                });
              },
            }),
        ]
    });

    $effect(() => {
        if (el) {
            el.showModal();
        }
    });

    $effect(() => {
        localStorage.setItem('sideItems', JSON.stringify(sideState.items));
    });

    function handleClick (event) {
        const rect = el.getBoundingClientRect();
        const isInDialog = (rect.top <= event.clientY && event.clientY <= rect.top + rect.height && rect.left <= event.clientX && event.clientX <= rect.left + rect.width);

        if (!isInDialog) {
            onclose();
        }
    }
</script>

<div use:floatingRef></div>

<dialog class="side-menu side-menu--bottom" transition:fly="{{ y: 16, duration: 250 }}" bind:this={el} onclose={onclose} onclick={handleClick} use:floatingContent>
  <div class="side-menu-row">
    <div class="side-menu-sp-header only-mobile">
      <a class="side-bar-button" href="/settings" onclick={onclose}>
        <Settings color="var(--bar-bottom-icon-color)"></Settings>
      </a>
    </div>

    <dl class="settings-group settings-group--column settings-group--pb0 only-mobile">
      <dt class="settings-group__name">
        {$_('fixed_footer')}
      </dt>

      <dd class="settings-group__content">
        <div class="input-toggle">
          <input class="input-toggle__input" type="checkbox" id="fixedFooter" bind:checked={$settings.design.fixedFooter}><label class="input-toggle__label" for="fixedFooter"></label>
        </div>
      </dd>
    </dl>

    <ul class="side-items-list">
      {#each ALL_ITEMS as item}
        <li class="side-items-list__item">
          {#if (item === 'workspace')}
            <Layers size="18" color="var(--nav-secondary-icon-color)"></Layers>
          {:else if (item === 'feeds')}
            <GanttChartSquare size="18" color="var(--nav-secondary-icon-color)"></GanttChartSquare>
          {:else if (item === 'chat')}
            <MessageCircleMore size="18" color="var(--nav-secondary-icon-color)"></MessageCircleMore>
          {:else if (item === 'notifications')}
            <Bell size="18" color="var(--nav-secondary-icon-color)"></Bell>
          {:else if (item === 'search')}
            <Search size="18" color="var(--nav-secondary-icon-color)"></Search>
          {:else if (item === 'topic')}
            <TrendingUp size="18" color="var(--nav-secondary-icon-color)"></TrendingUp>
          {:else if (item === 'profile')}
            <UserRound size="18" color="var(--nav-secondary-icon-color)"></UserRound>
          {:else if (item === 'refresher')}
            <RefreshCcw size="18" color="var(--nav-secondary-icon-color)"></RefreshCcw>
          {:else if (item === 'scroll-top')}
            <CircleArrowUp size="18" color="var(--nav-secondary-icon-color)"></CircleArrowUp>
          {:else if (item === 'columns')}
            <Square size="18" color="var(--nav-secondary-icon-color)"></Square>
          {:else if (item === 'bluecast')}
            <Mic size="18" color="var(--nav-secondary-icon-color)"></Mic>
          {:else if (item === 'tokmek')}
            <Clapperboard size="18" color="var(--nav-secondary-icon-color)"></Clapperboard>
          {:else if (item === 'viewer')}
            <Database size="18" color="var(--nav-secondary-icon-color)"></Database>
          {/if}

          <button class="side-items-list__button" onclick={() => {onaction(item)}}>
            {$_(item)}
          </button>

          {#if (sideState.items.includes(item))}
            <button class="side-items-list__pin" onclick={() => {sideState.unpin(item)}}>
              <PinOff size="16" color="var(--primary-color)"></PinOff>
            </button>
          {:else}
            <button class="side-items-list__pin" onclick={() => {sideState.pin(item)}}>
              <Pin size="16" color="var(--primary-color)"></Pin>
            </button>
          {/if}
        </li>
      {/each}
    </ul>

    <div class="side-menu-divider">
      <div class="side-menu-divider__icon">
        <Heart size="12" color="var(--border-color-1)" strokeWidth={3}></Heart>
      </div>
    </div>
  </div>

  <div class="side-menu-row only-pc">
    <div class="side-menu-item">
      <div class="layout-radio-group">
        <div class="layout-radio" class:layout-radio--current={$settings.design?.layout === 'decks'}>
          <input type="radio" bind:group={$settings.design.layout} id="layoutDecks" name="layout" value={'decks'}>
          <label for="layoutDecks">
            <Columns3 size="22" color="var(--radio-current-color)"></Columns3>
            {$_('layout_decks')}
          </label>
        </div>

        <div class="layout-radio" class:layout-radio--current={$settings.design?.layout === 'default'}>
          <input type="radio" bind:group={$settings.design.layout} id="layoutDefault" name="layout" value={'default'}>
          <label for="layoutDefault">
            <RectangleVertical size="22" color="var(--radio-current-color)"></RectangleVertical>
            {$_('layout_single')}
          </label>
        </div>
      </div>
    </div>
  </div>
</dialog>

<style lang="postcss">
  .side-menu {
      position: absolute;
      top: 0;
      left: 0;
      padding: 16px;
      border-radius: var(--border-radius-3);
      background-color: var(--bg-color-1);
      min-width: 200px;
      min-height: 200px;
      z-index: 100;
      box-shadow: 0 3px 6px var(--box-shadow-color-1);
      border: none;
      color: var(--text-color-1);
      display: grid;
      grid-template-columns: repeat(2, auto);
      gap: 48px;

      @media (max-width: 767px) {
          min-width: 0;
          display: block;
      }

      &::backdrop {
          background-color: transparent;
      }
  }

  .side-menu-row {
      min-width: 168px;
      position: relative;

      @media (max-width: 767px) {
          min-width: 0;
      }
  }

  .side-items-list {
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 0;
      font-size: 14px;

      &__item {
          height: 36px;
          width: 180px;
          border-radius: var(--border-radius-3);
          border: 2px solid var(--border-color-1);
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 4px 0 8px;
          position: relative;

          @media (max-width: 767px) {
              height: 42px;
              font-weight: bold;
          }
      }

      &__pin {
          margin-left: auto;
          width: 30px;
          height: 30px;
          display: grid;
          place-content: center;
      }

      &__button {
          color: var(--text-color-1);

          &::before {
              content: '';
              display: block;
              position: absolute;
              top: 0;
              bottom: 0;
              left: 0;
              right: 36px;
          }
      }
  }

  .side-menu-divider {
      position: absolute;
      top: 16px;
      bottom: 16px;
      left: calc(100% + 24px);
      width: 1px;
      background-color: var(--border-color-1);

      @media (max-width: 767px) {
          display: none;
      }

      &__icon {
          position: absolute;
          width: 16px;
          height: 24px;
          display: grid;
          place-content: center;
          background-color: var(--bg-color-1);
          top: 0;
          bottom: 0;
          left: -7.5px;
          margin: auto;
      }
  }

  .settings-group--pb0 {
      padding-bottom: 0;
  }

  .side-menu-sp-header {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 8px;
      padding-top: 4px;
  }

  .side-bar-button {
      outline: none !important;
  }
</style>