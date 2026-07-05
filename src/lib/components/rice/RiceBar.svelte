<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { resolveBarItem } from '$lib/rice/barItems';
    import { runCommand } from '$lib/commands/registry.svelte';
    import { getColumnState } from '$lib/classes/columnState.svelte';
    import type { BarGroupName, BarItemSpec, BarPosition } from '$lib/rice/config/model';

    interface Props {
        position: BarPosition;
    }

    let { position }: Props = $props();

    const columnState = getColumnState();
    const bar = $derived.by(() => {
        const candidate = riceState.bars[position];
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

    let activeTab = $state(0);
    const tabSets = $derived(bar?.tabSets ?? []);
    const activeTabSet = $derived(tabSets[Math.min(activeTab, Math.max(0, tabSets.length - 1))]);

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
        return style;
    });

    function handleActionClick(event: MouseEvent, command: string, commandArg?: string) {
        const anchor = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
        runCommand(command, commandArg, { anchor });
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
            <Item variant="bar" options={spec.options} item={spec.id} {position}></Item>
        {/await}
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

{#snippet verticalItem(spec: BarItemSpec)}
    {@const resolved = resolveBarItem(spec.base, bar!.style, { allowWidgets: true })}
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
                <Item variant={bar!.style === 'menu' ? 'menu' : 'bar'} options={spec.options} item={spec.id} {position}></Item>
            {/await}
        </div>
    {:else if resolved?.kind === 'component'}
        {#await resolved.loader() then loaded}
            {@const Item = loaded.default}
            <Item variant={bar!.style === 'menu' ? 'menu' : 'bar'} options={spec.options} item={spec.id} {position}></Item>
        {/await}
    {:else if resolved?.kind === 'action'}
        {@const Icon = resolved.def.icon}
        {@const badgeCount = resolved.def.badge?.({ columnState }) ?? 0}
        {#if bar!.style === 'menu'}
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
                    {#each group.items as spec, i (spec.id + i)}
                        {@render verticalItem(spec)}
                    {/each}
                </div>
            {/each}
        {:else}
            {#each flatSpecs as spec, i (spec.id + i)}
                {@render verticalItem(spec)}
            {/each}
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
        padding: 0 calc(var(--side-right-width, 0px) + 12px) 0 calc(var(--side-width, 64px) + 12px);
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
        margin-left: calc(var(--side-width, 64px) + var(--rice-statusbar-margin, 8px));
        margin-right: calc(var(--side-right-width, 0px) + var(--rice-statusbar-margin, 8px));
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
        padding: 0 calc(var(--side-width, 64px) + var(--side-right-width, 0px) + 12px) 0 12px;
    }

    :global(.app.left-mode) .rice-statusbar--float {
        margin: var(--rice-statusbar-margin, 8px);
        margin-right: calc(var(--side-width, 64px) + var(--side-right-width, 0px) + var(--rice-statusbar-margin, 8px));
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
        left: 0;
        border-right: var(--rice-statusbar-border, none);
    }

    .rice-bar--edge-right {
        right: 0;
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
