<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { resolveBarItem } from '$lib/rice/barItems';
    import { runCommand } from '$lib/commands/registry.svelte';
    import { getColumnState } from '$lib/classes/columnState.svelte';
    import { drawerState } from '$lib/classes/drawerState.svelte';
    import Menu from '@lucide/svelte/icons/menu';
    import RiceMenu from './RiceMenu.svelte';
    import type { BarConfig, BarItemSpec, BarSlot } from '$lib/rice/config/model';

    interface Props {
        specs: BarItemSpec[];
        bar: BarConfig;
        position: BarSlot;
        onItemRun?: () => void;
    }

    let { specs, bar, position, onItemRun }: Props = $props();

    const columnState = getColumnState();

    let activeTab = $state(0);
    const tabSets = $derived(bar.tabSets ?? []);
    const activeTabSet = $derived(tabSets[Math.min(activeTab, Math.max(0, tabSets.length - 1))]);

    let openMenuId = $state<string | null>(null);
    let menuTriggerEl = $state<HTMLElement | undefined>();

    function menuItems(spec: BarItemSpec): string[] | undefined {
        return spec.options.items?.split(',').map((t) => t.trim()).filter(Boolean);
    }

    function toggleMenu(event: MouseEvent, id: string) {
        menuTriggerEl = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
        openMenuId = openMenuId === id ? null : id;
    }

    function handleMenuTrigger(event: MouseEvent, spec: BarItemSpec) {
        if (spec.options.style === 'drawer') {
            drawerState.show(menuItems(spec));
            return;
        }
        toggleMenu(event, spec.id);
    }

    function handleActionClick(event: MouseEvent, command: string, commandArg?: string) {
        const anchor = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
        onItemRun?.();
        runCommand(command, commandArg, { anchor: onItemRun ? undefined : anchor });
    }
</script>

{#snippet verticalItem(spec: BarItemSpec)}
    {@const resolved = resolveBarItem(spec.base, bar.style, { allowWidgets: true })}
    {#if resolved?.kind === 'spacer'}
        <div class="rice-bar__spacer"></div>
    {:else if resolved?.kind === 'separator'}
        <div class="rice-bar__separator"></div>
    {:else if resolved?.kind === 'tabs'}
        {#if tabSets.length > 0}
            <div class="rice-bar-tabs">
                <div class="rice-bar-tabs__strip" role="tablist">
                    {#each tabSets as tabSet, i (tabSet.label + i)}
                        <button
                            class="rice-bar-tabs__button"
                            class:rice-bar-tabs__button--active={tabSet === activeTabSet}
                            role="tab"
                            aria-selected={tabSet === activeTabSet}
                            onclick={() => { activeTab = i; }}
                        >{tabSet.label}</button>
                    {/each}
                </div>
                <div class="rice-bar-tabs__panel">
                    {#each activeTabSet?.items ?? [] as tabSpec, i (tabSpec.id + i)}
                        {@render verticalItem(tabSpec)}
                    {/each}
                </div>
            </div>
        {/if}
    {:else if resolved?.kind === 'widget'}
        <div class="rice-widget" data-widget={spec.base}>
            {#await resolved.loader() then loaded}
                {@const Item = loaded.default}
                <Item variant={bar.style === 'menu' ? 'menu' : 'bar'} options={spec.options} item={spec.id} {position}></Item>
            {/await}
        </div>
    {:else if resolved?.kind === 'component'}
        {#await resolved.loader() then loaded}
            {@const Item = loaded.default}
            <Item variant={bar.style === 'menu' ? 'menu' : 'bar'} options={spec.options} item={spec.id} {position}></Item>
        {/await}
    {:else if resolved?.kind === 'menu'}
        {#if bar.style === 'menu'}
            <button class="rice-menu-item" onclick={(event) => handleMenuTrigger(event, spec)}>
                <Menu size={22} strokeWidth="var(--icon-stroke-width, 2px)"></Menu>
                <span class="rice-menu-item__label">{$_('menu')}</span>
            </button>
        {:else}
            <button class="rice-icons-item" title={$_('menu')} onclick={(event) => handleMenuTrigger(event, spec)}>
                <Menu color="var(--nav-secondary-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></Menu>
            </button>
        {/if}
        {#if openMenuId === spec.id}
            <RiceMenu {position} items={menuItems(spec)} triggerEl={menuTriggerEl} onclose={() => openMenuId = null}></RiceMenu>
        {/if}
    {:else if resolved?.kind === 'action'}
        {@const Icon = resolved.def.icon}
        {@const badgeCount = resolved.def.badge?.({ columnState }) ?? 0}
        {#if bar.style === 'menu'}
            <button
                class="rice-menu-item"
                class:rice-menu-item--pill={resolved.def.pill}
                onclick={(event) => handleActionClick(event, resolved.def.command, resolved.def.commandArg)}
            >
                <Icon size={22} strokeWidth="var(--icon-stroke-width, 2px)"></Icon>
                <span class="rice-menu-item__label">{$_(resolved.def.labelKey)}</span>
                {#if badgeCount}
                    <span class="rice-menu-item__badge">{badgeCount}</span>
                {/if}
            </button>
        {:else}
            <button
                class="rice-icons-item"
                title={$_(resolved.def.labelKey)}
                onclick={(event) => handleActionClick(event, resolved.def.command, resolved.def.commandArg)}
            >
                <Icon color="var(--nav-secondary-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></Icon>
                {#if badgeCount}
                    <span class="rice-icons-item__badge">{badgeCount}</span>
                {/if}
            </button>
        {/if}
    {/if}
{/snippet}

{#each specs as spec, i (spec.id + i)}
    {@render verticalItem(spec)}
{/each}

<style lang="postcss">
    .rice-widget {
        width: 100%;
        flex-shrink: 0;
        min-width: 0;
    }

    .rice-bar-tabs {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: var(--rice-bar-gap, 2px);
        width: 100%;
        min-width: 0;
    }

    .rice-bar-tabs__strip {
        display: flex;
        gap: 4px;
        padding: 4px;
        background-color: var(--rice-tabs-bg, transparent);
        border-radius: var(--rice-tabs-rounding, 999px);
    }

    .rice-bar-tabs__button {
        flex: 1;
        min-width: 0;
        padding: 6px 10px;
        border-radius: var(--rice-tabs-rounding, 999px);
        color: var(--rice-tabs-color, var(--text-color-2));
        font-size: 13px;
        font-weight: bold;
        text-align: center;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        transition: background-color var(--anim-hover-duration, .15s) var(--anim-hover-easing, ease);

        &:hover {
            background-color: var(--side-nav-hover-bg-color, var(--bg-color-2));
        }
    }

    .rice-bar-tabs__button--active {
        background-color: var(--rice-tabs-active-bg, var(--primary-color));
        color: var(--rice-tabs-active-color, var(--bg-color-1));

        &:hover {
            background-color: var(--rice-tabs-active-bg, var(--primary-color));
        }
    }

    .rice-bar-tabs__panel {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: var(--rice-bar-gap, 2px);
        min-width: 0;
    }

    .rice-bar__spacer {
        flex: 1;
    }

    .rice-bar__separator {
        height: 1px;
        margin: 6px 10px;
        background-color: var(--border-color-1);
    }

    .rice-menu-item {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 10px 14px;
        border-radius: var(--rice-statusbar-rounding, 999px);
        color: var(--text-color-1);
        text-align: left;
        transition: background-color var(--anim-hover-duration, .15s) var(--anim-hover-easing, ease);

        &:hover {
            background-color: var(--side-nav-hover-bg-color, var(--bg-color-2));
        }
    }

    .rice-menu-item__label {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .rice-menu-item__badge {
        flex-shrink: 0;
        min-width: 20px;
        height: 20px;
        padding: 0 6px;
        border-radius: 10px;
        background-color: var(--danger-color);
        color: var(--bg-color-1);
        font-size: 12px;
        font-weight: bold;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }

    .rice-menu-item--pill {
        justify-content: center;
        gap: 8px;
        margin-top: 8px;
        padding: 12px 14px;
        background-color: var(--primary-color);
        color: var(--bg-color-1);
        font-weight: bold;

        &:hover {
            background-color: var(--primary-color);
            opacity: .9;
        }
    }

    .rice-icons-item {
        position: relative;
        display: grid;
        place-content: center;
        width: 48px;
        height: 48px;
        border-radius: var(--border-radius-2);
        transition: background-color var(--anim-hover-duration, .15s) var(--anim-hover-easing, ease);

        &:hover {
            background-color: var(--side-nav-hover-bg-color, var(--bg-color-2));
        }
    }

    .rice-icons-item__badge {
        position: absolute;
        top: 4px;
        right: 4px;
        min-width: 16px;
        height: 16px;
        padding: 0 4px;
        border-radius: 8px;
        background-color: var(--danger-color);
        color: var(--bg-color-1);
        font-size: 11px;
        font-weight: bold;
        display: inline-flex;
        align-items: center;
        justify-content: center;
    }
</style>
