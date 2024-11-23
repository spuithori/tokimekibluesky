<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { settings } from '$lib/stores';
    import { offset, shift } from 'svelte-floating-ui/dom';
    import { createFloatingActions } from 'svelte-floating-ui';
    import { fly } from 'svelte/transition';
    import { AppWindowMac, Bell, CircleArrowUp, Columns3, GanttChartSquare, Heart, MessageCircleMore, PanelBottomOpen, PanelLeftOpen, Pin, PinOff, RectangleVertical, RefreshCcw, Search, UserRound } from "lucide-svelte";
    import { publishState } from '$lib/classes/publishState.svelte';
    import {ALL_ITEMS, sideState} from "$lib/classes/sideState.svelte";

    let { onclose, onaction, footer = false } = $props();
    let el = $state();
    let placement = $derived.by(() => {
        if (footer) {
            return 'top';
        } else if (publishState.isBottom) {
            return 'right-end';
        } else {
            return 'bottom';
        }
    });
    let mainAxis = $derived.by(() => {
        if (footer) {
            return 64;
        } else if (publishState.isBottom) {
            return 16;
        } else {
            return 8;
        }
    })

    const [ floatingRef, floatingContent ] = createFloatingActions({
        strategy: 'absolute',
        placement: placement,
        middleware: [
            offset({
                alignmentAxis: 8,
                mainAxis: mainAxis,
            }),
            shift(),
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

<dialog class="side-menu" class:side-menu--bottom={publishState.isBottom} transition:fly="{{ y: 16, duration: 250 }}" bind:this={el} onclose={onclose} onclick={handleClick} use:floatingContent>
  <div class="side-menu-row">
    <dl class="settings-group settings-group--column only-mobile">
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
          {#if (item === 'feeds')}
            <GanttChartSquare size="18" color="var(--nav-secondary-icon-color)"></GanttChartSquare>
          {:else if (item === 'chat')}
            <MessageCircleMore size="18" color="var(--nav-secondary-icon-color)"></MessageCircleMore>
          {:else if (item === 'notifications')}
            <Bell size="18" color="var(--nav-secondary-icon-color)"></Bell>
          {:else if (item === 'search')}
            <Search size="18" color="var(--nav-secondary-icon-color)"></Search>
          {:else if (item === 'profile')}
            <UserRound size="18" color="var(--nav-secondary-icon-color)"></UserRound>
          {:else if (item === 'refresher')}
            <RefreshCcw size="18" color="var(--nav-secondary-icon-color)"></RefreshCcw>
          {:else if (item === 'scroll-top')}
            <CircleArrowUp size="18" color="var(--nav-secondary-icon-color)"></CircleArrowUp>
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
      <dl class="settings-group">
        <dt class="settings-group__name">
          {$_('publish_position')}
        </dt>

        <dd class="settings-group__content">
          <div class="radio-group">
            <div class="radio radio--boxed">
              <input type="radio" bind:group={publishState.layout} id="publishPositionLeft" name="publishPosition" value={'left'}>
              <label for="publishPositionLeft">
                <span class="radio__ui"></span>
                <PanelLeftOpen size="16"></PanelLeftOpen>
                {$_('publish_position_left')}
              </label>
            </div>

            <div class="radio radio--boxed">
              <input type="radio" bind:group={publishState.layout} id="publishPositionBottom" name="publishPosition" value={'bottom'}>
              <label for="publishPositionBottom">
                <span class="radio__ui"></span>
                <PanelBottomOpen size="16"></PanelBottomOpen>
                {$_('publish_position_bottom')}
              </label>
            </div>

            <div class="radio radio--boxed">
              <input type="radio" bind:group={publishState.layout} id="publishPositionPopup" name="publishPosition" value={'popup'}>
              <label for="publishPositionPopup">
                <span class="radio__ui"></span>
                <AppWindowMac size="16"></AppWindowMac>
                {$_('publish_position_popup')}
              </label>
            </div>
          </div>
        </dd>
      </dl>
    </div>

    <div class="side-menu-item">
      <div class="layout-radio-group">
        <div class="layout-radio" class:layout-radio--current={$settings.design?.layout === 'default'}>
          <input type="radio" bind:group={$settings.design.layout} id="layoutDefault" name="layout" value={'default'}>
          <label for="layoutDefault">
            <RectangleVertical size="22" color="var(--radio-current-color)"></RectangleVertical>
            {$_('default')}
          </label>
        </div>

        <div class="layout-radio" class:layout-radio--current={$settings.design?.layout === 'decks'}>
          <input type="radio" bind:group={$settings.design.layout} id="layoutDecks" name="layout" value={'decks'}>
          <label for="layoutDecks">
            <Columns3 size="22" color="var(--radio-current-color)"></Columns3>
            {$_('decks')}
          </label>
        </div>
      </div>
    </div>

    <div class="side-menu-item">
      <dl class="settings-group settings-group--column">
        <dt class="settings-group__name">
          {$_('immersive_mode')}
        </dt>

        <dd class="settings-group__content">
          <div class="input-toggle">
            <input class="input-toggle__input" type="checkbox" id="immersiveMode" bind:checked={$settings.design.immersiveMode}><label class="input-toggle__label" for="immersiveMode"></label>
          </div>
        </dd>
      </dl>
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

  .layout-radio-group {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      text-align: center;
  }

  .layout-radio {
      --radio-current-color: var(--border-color-1);
      position: relative;
      border: 2px solid var(--radio-current-color);
      font-size: 13px;
      border-radius: var(--border-radius-2);

      &--current {
          --radio-current-color: var(--primary-color);
          font-weight: bold;
      }

      label {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          padding: 12px 4px 8px;
          cursor: pointer;
      }

      input {
          visibility: hidden;
          opacity: 0;
          position: absolute;
          width: 0;
          height: 0;
          left: 0;
          top: 0;
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
</style>