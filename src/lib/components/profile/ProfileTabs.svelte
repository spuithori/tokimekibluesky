<script lang="ts">
    import Check from '@lucide/svelte/icons/check';
    import ChevronDown from '@lucide/svelte/icons/chevron-down';
    import Ellipsis from '@lucide/svelte/icons/ellipsis';
    import RefreshCw from '@lucide/svelte/icons/refresh-cw';
    import Search from '@lucide/svelte/icons/search';
    import SquarePlus from '@lucide/svelte/icons/square-plus';
    import { _ } from 'tokimeki-i18n';
    import Menu from '$lib/components/ui/Menu.svelte';
    import { fitTabCount, type ProfileTabItem } from '$lib/profile/profileTabs';

    interface Props {
        tabs: ProfileTabItem[];
        current: string;
        onsearch: () => void;
        onreselect: () => void;
    }

    let { tabs, current, onsearch, onreselect }: Props = $props();

    const MORE_ICON_WIDTH = 38;
    const MORE_CARET_WIDTH = 18;

    let fitCount = $state(Infinity);
    let isMoreOpen = $state(false);
    let isTabMenuOpen = $state(false);
    const overflowTabs = $derived(tabs.slice(fitCount));
    const currentOverflow = $derived(overflowTabs.find((tab) => tab.key === current));

    function trackOverflow(items: ProfileTabItem[], currentKey: string) {
        return (node: HTMLElement) => {
            let frame = 0;
            const measure = () => {
                frame = 0;
                const style = getComputedStyle(node);
                const available = node.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
                const widths = Array.from(node.querySelectorAll<HTMLElement>(':scope > [data-tab]'), (item) => item.offsetWidth);
                fitCount = fitTabCount(widths, available, items.findIndex((item) => item.key === currentKey), MORE_ICON_WIDTH, MORE_CARET_WIDTH);
            };
            const observer = new ResizeObserver(() => {
                frame ||= requestAnimationFrame(measure);
            });
            observer.observe(node);
            for (const item of node.querySelectorAll(':scope > [data-tab]')) {
                observer.observe(item);
            }
            return () => {
                observer.disconnect();
                cancelAnimationFrame(frame);
            };
        };
    }

    function handleTabClick(event: MouseEvent, key: string) {
        if (key !== current || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) {
            return;
        }
        event.preventDefault();
        onreselect();
    }
</script>

<nav class="profile-tabs">
  <ul class="profile-tab profile-tabs__list" {@attach trackOverflow(tabs, current)}>
    {#each tabs as tab, index (tab.key)}
      <li
          class={['profile-tab__item', tab.key === current && 'profile-tab__item--active', index >= fitCount && 'profile-tabs__item--overflow']}
          data-tab={tab.key}
          inert={index >= fitCount}
      >
        {#if tab.menu}
          <Menu bind:isMenuOpen={isTabMenuOpen} buttonClassName="profile-tabs__menu-button" position="bottom-start">
            {#snippet ref()}
              <span>{tab.label}</span>
              <ChevronDown size={14}></ChevronDown>
            {/snippet}

            {#snippet content()}
              {#if tab.menu?.options.length}
                <ul class="timeline-menu-list">
                  {#each tab.menu.options as option (option.key)}
                    <li class="timeline-menu-list__item">
                      {#if option.href}
                        <a class="timeline-menu-list__button" href={option.href} data-sveltekit-noscroll data-tab-option={option.key} aria-current={option.selected ? 'page' : undefined} onclick={() => { isTabMenuOpen = false; }}>
                          <span class="menu-check">
                            {#if option.selected}
                              <Check size={16}></Check>
                            {/if}
                          </span>
                          <span>{option.label}</span>
                        </a>
                      {:else}
                        <button class="timeline-menu-list__button" data-tab-option={option.key} aria-pressed={option.selected} onclick={() => { isTabMenuOpen = false; option.select?.(); }}>
                          <span class="menu-check">
                            {#if option.selected}
                              <Check size={16}></Check>
                            {/if}
                          </span>
                          <span>{option.label}</span>
                        </button>
                      {/if}
                    </li>
                  {/each}
                </ul>
              {/if}

              {#if tab.menu?.actions.length}
                <ul class={['timeline-menu-list', tab.menu.options.length && 'profile-tabs__actions']}>
                  {#each tab.menu.actions as action (action.key)}
                    <li class="timeline-menu-list__item">
                      <button class="timeline-menu-list__button" data-tab-action={action.key} disabled={action.disabled} onclick={() => { isTabMenuOpen = false; action.run(); }}>
                        {#if action.key === 'refresh'}
                          <RefreshCw size={18} color="var(--text-color-1)"></RefreshCw>
                        {:else}
                          <SquarePlus size={18} color="var(--text-color-1)"></SquarePlus>
                        {/if}
                        <span>{action.label}</span>
                      </button>
                    </li>
                  {/each}
                </ul>
              {/if}
            {/snippet}
          </Menu>
        {:else}
          <a href={tab.href} data-sveltekit-noscroll aria-current={tab.key === current ? 'page' : undefined} onclick={(event) => handleTabClick(event, tab.key)}>{tab.label}</a>
        {/if}
      </li>
    {/each}

    {#if overflowTabs.length}
      <li class={['profile-tab__item', 'profile-tabs__more', currentOverflow && 'profile-tab__item--active']}>
        <Menu bind:isMenuOpen={isMoreOpen} buttonClassName="profile-tabs__menu-button" position="bottom-end">
          {#snippet ref()}
            {#if currentOverflow}
              <span>{currentOverflow.label}</span>
              <ChevronDown size={14}></ChevronDown>
            {:else}
              <Ellipsis size={18}></Ellipsis>
            {/if}
          {/snippet}

          {#snippet content()}
            <ul class="timeline-menu-list">
              {#each overflowTabs as tab (tab.key)}
                <li class="timeline-menu-list__item">
                  <a
                      class={['timeline-menu-list__button', tab.key === current && 'timeline-menu-list__button--active']}
                      href={tab.href}
                      data-sveltekit-noscroll
                      aria-current={tab.key === current ? 'page' : undefined}
                      onclick={() => { isMoreOpen = false; }}
                  >{tab.label}</a>
                </li>
              {/each}
            </ul>
          {/snippet}
        </Menu>
      </li>
    {/if}
  </ul>

  <button class="profile-tabs__search" onclick={onsearch} aria-label={$_('search')} title={$_('search')}>
    <Search size={18}></Search>
  </button>
</nav>

<style lang="postcss">
    .profile-tabs {
        display: flex;
        align-items: center;
        height: 100%;
        padding-right: 6px;
    }

    .profile-tabs .profile-tabs__list {
        flex: 1;
        min-width: 0;
        height: 100%;
        padding-right: 0;
        flex-wrap: wrap;
        align-content: flex-start;
        overflow: clip;
        border-bottom: none;
        backdrop-filter: none;
    }

    .profile-tabs__item--overflow {
        order: 2;
        visibility: hidden;
    }

    .profile-tabs__more {
        order: 1;
    }

    .profile-tabs__list :global(.timeline-menu) {
        color: var(--text-color-1);
        font-weight: normal;
        line-height: 1.5;
        white-space: normal;
    }

    .profile-tabs__actions {
        margin-top: var(--menu-item-inset, 4px);
        padding-top: var(--menu-item-inset, 4px);
        border-top: 1px solid var(--border-color-2);
    }

    .profile-tabs__search {
        flex: none;
        display: grid;
        place-content: center;
        width: 36px;
        height: 36px;
        border-radius: var(--radius-round, 50%);
        color: var(--text-color-3);
        transition: background-color var(--motion-duration-hover, .2s) var(--motion-easing-hover, ease-in-out), color var(--motion-duration-hover, .2s) var(--motion-easing-hover, ease-in-out);

        @media (hover: hover) {
            &:hover {
                background-color: var(--state-hover, var(--bg-color-2));
                color: var(--text-color-1);
            }
        }
    }

    :global(.profile-tabs__menu-button) {
        display: flex;
        align-items: center;
        gap: 2px;
        height: 100%;
    }
</style>
