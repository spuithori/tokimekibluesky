<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { barItemOptions, resolveBarItem } from '$lib/rice/barItems';
    import RiceBarItemError from './RiceBarItemError.svelte';
    import { runCommand } from '$lib/commands/registry.svelte';
    import { getColumnState } from '$lib/classes/columnState.svelte';
    import Menu from '@lucide/svelte/icons/menu';
    import RiceMenu from './RiceMenu.svelte';
    import RiceBarItemList from './RiceBarItemList.svelte';
    import { drawerState } from '$lib/classes/drawerState.svelte';
    import type { BarConfig, BarGroupName, BarItemSpec, BarPosition } from '$lib/rice/config/model';

    interface Props {
        position: BarPosition;
        config?: BarConfig;
        offset?: string;
    }

    let { position, config = undefined, offset = undefined }: Props = $props();

    const columnState = getColumnState();
    const bar = $derived.by(() => {
        const candidate = config ?? riceState.bars[position]?.[0];
        return candidate?.kind === 'rice' && (candidate.items?.length ?? 0) > 0 ? candidate : null;
    });
    const horizontal = $derived(position === 'top' || position === 'bottom');

    const flatSpecs = $derived.by<BarItemSpec[]>(() => {
        if (!bar) return [];
        return bar.itemSpecs ?? (bar.items ?? []).map((id) => ({ id, base: id.split('#')[0], options: {} }));
    });
    const GROUP_ORDER: BarGroupName[] = ['start', 'center', 'end'];
    const groupedSpecs = $derived.by(() => {
        const groups = bar?.groups;
        if (!groups) return null;
        return GROUP_ORDER.map((name) => ({ name, items: groups.find((g) => g.name === name)?.items ?? [] }));
    });

    const styleVars = $derived.by(() => {
        if (!bar) return '';
        const p = bar.props;
        let style = '';
        if (p.height) style += `--rice-statusbar-height: ${p.height};`;
        if (p.width) style += `--rice-bar-width: ${p.width};`;
        if (p.background) style += `--rice-statusbar-bg: ${p.background};`;
        if (p.blur) style += `--rice-statusbar-backdrop: blur(${p.blur});`;
        if (p.rounding) style += `--rice-statusbar-rounding: ${p.rounding};`;
        if (p.border) style += `--rice-statusbar-border: ${p.border};`;
        if (p['font-size']) style += `--rice-statusbar-font-size: ${p['font-size']};`;
        if (p.margin) style += `--rice-statusbar-margin: ${p.margin};`;
        if (p.opacity) style += `--rice-statusbar-opacity: ${p.opacity};`;
        if (offset && offset !== '0px') style += `--rice-bar-offset: ${offset};`;
        return style;
    });

    function handleActionClick(event: MouseEvent, command: string, commandArg?: string) {
        const anchor = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
        runCommand(command, commandArg, { anchor });
    }

    let openMenuId = $state<string | null>(null);
    let menuTriggerEl = $state<HTMLElement | undefined>();

    function menuItems(spec: BarItemSpec): string[] | undefined {
        return spec.options.items?.split(',').map((t) => t.trim()).filter(Boolean);
    }

    function toggleMenu(event: MouseEvent, id: string) {
        menuTriggerEl = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
        openMenuId = openMenuId === id ? null : id;
    }
</script>

{#snippet statusItem(spec: BarItemSpec)}
    {@const resolved = resolveBarItem(spec.base, bar!.style)}
    {#if resolved?.kind === 'spacer'}
        <div class="rice-statusbar__spacer"></div>
    {:else if resolved?.kind === 'separator'}
        <div class="rice-statusbar__separator"></div>
    {:else if resolved?.kind === 'component'}
        {#await resolved.loader() then loaded}
            {@const Item = loaded.default}
            <svelte:boundary>
                <Item variant="bar" options={barItemOptions(resolved, spec.options)} item={spec.id} {position}></Item>
                {#snippet failed()}<RiceBarItemError id={spec.base}></RiceBarItemError>{/snippet}
            </svelte:boundary>
        {:catch}
            <RiceBarItemError id={spec.base}></RiceBarItemError>
        {/await}
    {:else if resolved?.kind === 'menu'}
        <button class="rice-bar-item" title={$_('menu')} onclick={(event) => spec.options.style === 'drawer' ? drawerState.show(menuItems(spec)) : toggleMenu(event, spec.id)}>
            <Menu size={16} color="var(--text-color-2)" strokeWidth="var(--icon-stroke-width, 2px)"></Menu>
        </button>
        {#if openMenuId === spec.id}
            <RiceMenu {position} items={menuItems(spec)} triggerEl={menuTriggerEl} onclose={() => openMenuId = null}></RiceMenu>
        {/if}
    {:else if resolved?.kind === 'action'}
        {@const Icon = resolved.def.icon}
        {@const badgeCount = resolved.def.badge?.({ columnState }) ?? 0}
        <button class="rice-bar-item" title={$_(resolved.def.labelKey)} onclick={(event) => handleActionClick(event, resolved.def.command, resolved.def.commandArg)}>
            <Icon size={16} color="var(--text-color-2)" strokeWidth="var(--icon-stroke-width, 2px)"></Icon>
            {#if badgeCount}
                <span class="rice-bar-item__count rice-bar-item__count--active">{badgeCount}</span>
            {/if}
        </button>
    {/if}
{/snippet}


{#if bar && horizontal}
    <div
        class="rice-statusbar rice-statusbar--{position} rice-bar rice-bar--bar"
        class:rice-statusbar--float={bar.float}
        class:rice-statusbar--grouped={!!groupedSpecs}
        style={styleVars || null}
    >
        {#if groupedSpecs}
            {#each groupedSpecs as group (group.name)}
                <div class="rice-statusbar__group rice-statusbar__group--{group.name}">
                    {#each group.items as spec, i (spec.id + i)}
                        {@render statusItem(spec)}
                    {/each}
                </div>
            {/each}
        {:else}
            {#each flatSpecs as spec, i (spec.id + i)}
                {@render statusItem(spec)}
            {/each}
        {/if}
    </div>
{:else if bar}
    <div
        class="rice-bar rice-bar--vertical rice-bar--{bar.style} rice-bar--edge-{position}"
        class:rice-bar--grouped={!!groupedSpecs}
        style={styleVars || null}
    >
        {#if groupedSpecs}
            {#each groupedSpecs as group (group.name)}
                <div class="rice-bar__group rice-bar__group--{group.name}">
                    <RiceBarItemList specs={group.items} {bar} {position}></RiceBarItemList>
                </div>
            {/each}
        {:else}
            <RiceBarItemList specs={flatSpecs} {bar} {position}></RiceBarItemList>
        {/if}
    </div>
{/if}

<style>
    .rice-statusbar {
        position: sticky;
        z-index: 1000;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        gap: 12px;
        height: var(--rice-statusbar-height, 32px);
        padding: 0 calc(var(--shell-inset, 0px) + var(--side-right-width, 0px) + 12px) 0 calc(var(--shell-inset, 0px) + var(--side-width, 64px) + 12px);
        background-color: var(--rice-statusbar-bg, var(--side-bar-bg-color, var(--bg-color-1)));
        backdrop-filter: var(--rice-statusbar-backdrop, none);
        font-size: var(--rice-statusbar-font-size, 13px);
        opacity: var(--rice-statusbar-opacity, 1);
        color: var(--text-color-1);

        @media (max-width: 767px) {
            display: none;
        }
    }

    .rice-statusbar--top {
        top: 0;
        border-bottom: var(--rice-statusbar-border, 1px solid var(--border-color-1));
    }

    .rice-statusbar--bottom {
        position: fixed;
        bottom: 0;
        left: 0;
        right: 0;
        border-top: var(--rice-statusbar-border, 1px solid var(--border-color-1));
    }

    .rice-statusbar--float {
        border: var(--rice-statusbar-border, 1px solid var(--border-color-1));
        border-radius: var(--rice-statusbar-rounding, 12px);
        margin: var(--rice-statusbar-margin, 8px);
        margin-left: calc(var(--shell-inset, 0px) + var(--side-width, 64px) + var(--rice-statusbar-margin, 8px));
        margin-right: calc(var(--shell-inset, 0px) + var(--side-right-width, 0px) + var(--rice-statusbar-margin, 8px));
        padding: 0 12px;
        box-shadow: var(--deck-box-shadow, 0 2px 8px rgba(0, 0, 0, .08));
    }

    .rice-statusbar--top.rice-statusbar--float {
        top: var(--rice-statusbar-margin, 8px);
    }

    .rice-statusbar--grouped {
        display: grid;
        grid-template-columns: 1fr auto 1fr;
    }

    .rice-statusbar__group {
        display: flex;
        align-items: center;
        gap: 12px;
        min-width: 0;
    }

    .rice-statusbar__group--center {
        justify-content: center;
    }

    .rice-statusbar__group--end {
        justify-content: flex-end;
    }

    .rice-statusbar__spacer {
        flex: 1;
    }

    .rice-statusbar__separator {
        width: 1px;
        height: 16px;
        background-color: var(--border-color-1);
    }

    :global(.app.left-mode) .rice-statusbar {
        padding: 0 calc(var(--shell-inset, 0px) + var(--side-width, 64px) + var(--side-right-width, 0px) + 12px) 0 calc(var(--shell-inset, 0px) + 12px);
    }

    :global(.app.left-mode) .rice-statusbar--float {
        margin: var(--rice-statusbar-margin, 8px);
        margin-left: calc(var(--shell-inset, 0px) + var(--rice-statusbar-margin, 8px));
        margin-right: calc(var(--shell-inset, 0px) + var(--side-width, 64px) + var(--side-right-width, 0px) + var(--rice-statusbar-margin, 8px));
        padding: 0 12px;
    }

    .rice-bar--vertical {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: var(--rice-bar-gap, 2px);
        height: 100%;
        min-height: 0;
        overflow-y: auto;
        padding: var(--rice-bar-padding, 8px);
        background-color: var(--rice-statusbar-bg, transparent);
        backdrop-filter: var(--rice-statusbar-backdrop, none);
        font-size: var(--rice-statusbar-font-size, 15px);
        opacity: var(--rice-statusbar-opacity, 1);
        color: var(--text-color-1);
        scrollbar-width: none;

        &::-webkit-scrollbar {
            display: none;
        }

        @media (max-width: 767px) {
            display: none;
        }
    }

    .rice-bar--edge-left,
    .rice-bar--edge-right {
        position: fixed;
        top: 0;
        bottom: 0;
        z-index: 1002;
        height: auto;
        width: var(--rice-bar-width, 64px);
        background-color: var(--rice-statusbar-bg, var(--side-bg-color));
    }

    .rice-bar--edge-left {
        left: calc(var(--shell-inset, 0px) + var(--rice-bar-offset, 0px));
        border-right: var(--rice-statusbar-border, none);
    }

    .rice-bar--edge-right {
        right: calc(var(--shell-inset, 0px) + var(--rice-bar-offset, 0px));
        border-left: var(--rice-statusbar-border, none);
    }

    .rice-bar--icons {
        align-items: center;
    }

    .rice-bar--grouped {
        display: grid;
        grid-template-rows: 1fr auto 1fr;
        align-items: stretch;
        justify-items: stretch;
    }

    .rice-bar__group {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: var(--rice-bar-gap, 2px);
        min-height: 0;
    }

    .rice-bar__group--end {
        justify-content: flex-end;
    }

    .rice-bar--icons .rice-bar__group {
        align-items: center;
    }

</style>
