<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { settings } from '$lib/stores';
    import { floatingPopup } from '$lib/attachments/popup.svelte';
    import { riceFx } from '$lib/rice/transition';
    import { cubicBezier } from '$lib/rice/easing';
    import Columns3 from '@lucide/svelte/icons/columns-3';
    import Heart from '@lucide/svelte/icons/heart';
    import Pin from '@lucide/svelte/icons/pin';
    import PinOff from '@lucide/svelte/icons/pin-off';
    import RectangleVertical from '@lucide/svelte/icons/rectangle-vertical';
    import Settings from '@lucide/svelte/icons/settings';
    import {ALL_ITEMS, sideState} from "$lib/classes/sideState.svelte";
    import {coreSideItems} from "$lib/components/side/sideItems";

    let { onclose, onaction, footer = false } = $props();
    let el = $state();
    let anchorEl = $state<HTMLElement>();

    const expoOut = cubicBezier(0.16, 1, 0.3, 1);

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

<div bind:this={anchorEl}></div>

<dialog
    class="side-menu side-menu--bottom"
    transition:riceFx={{ target: 'panel', duration: 220, easing: expoOut, style: { kind: 'slide', direction: footer ? 'bottom' : 'left', distance: 12 } }}
    bind:this={el}
    onclose={onclose}
    onclick={handleClick}
    {@attach floatingPopup(() => ({
        anchor: anchorEl,
        placement: footer ? 'top' : 'right-end',
        strategy: 'absolute',
        offsetMain: footer ? 64 : 16,
        offsetAlign: 8,
        shiftPadding: 0,
        flipEnabled: false,
    }))}
>
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
      {#each ALL_ITEMS as item (item)}
        {@const Icon = coreSideItems[item].icon}
        <li class="side-items-list__item">
          <Icon size="18" color="var(--nav-secondary-icon-color)"></Icon>

          <button class="side-items-list__button" onclick={() => {onaction(item)}}>
            {$_(coreSideItems[item].labelKey)}
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