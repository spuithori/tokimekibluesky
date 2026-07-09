<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { settings } from '$lib/stores';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { barItemOptions, resolveBarItem } from '$lib/rice/barItems';
    import RiceBarItemError from './RiceBarItemError.svelte';
    import { runCommand } from '$lib/commands/registry.svelte';
    import { getColumnState } from '$lib/classes/columnState.svelte';
    import { scrollDirectionState } from '$lib/classes/scrollDirectionState.svelte';
    import Menu from '@lucide/svelte/icons/menu';
    import RiceMenu from './RiceMenu.svelte';
    import { drawerState } from '$lib/classes/drawerState.svelte';
    import type { BarGroupName, BarItemSpec } from '$lib/rice/config/model';

    const columnState = getColumnState();
    const bar = $derived(riceState.footer);
    let openMenuId = $state<string | null>(null);
    let menuTriggerEl = $state<HTMLElement | undefined>();

    function menuItems(spec: BarItemSpec): string[] | undefined {
        return spec.options.items?.split(',').map((t) => t.trim()).filter(Boolean);
    }

    function toggleMenu(event: MouseEvent, id: string) {
        menuTriggerEl = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
        openMenuId = openMenuId === id ? null : id;
    }

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

    const reveal = $derived.by(() => {
        if (!bar) return 'scroll';
        return bar.props.reveal ?? ($settings?.design?.fixedFooter ? 'always' : 'scroll');
    });
    const hidden = $derived(reveal === 'scroll' && scrollDirectionState.direction === 'down');

    const styleVars = $derived.by(() => {
        if (!bar) return '';
        const p = bar.props;
        let style = '';
        if (p.height) style += `--rice-footer-height-inner: ${p.height};`;
        if (p.background) style += `--rice-footer-bg: ${p.background};`;
        if (p.blur) style += `--rice-footer-backdrop: blur(${p.blur});`;
        if (p.rounding) style += `--rice-footer-rounding: ${p.rounding};`;
        if (p.border) style += `--rice-footer-border: ${p.border};`;
        if (p['font-size']) style += `--rice-footer-font-size: ${p['font-size']};`;
        if (p.margin) style += `--rice-footer-margin: ${p.margin};`;
        if (p.opacity) style += `--rice-footer-opacity: ${p.opacity};`;
        return style;
    });

    function handleActionClick(event: MouseEvent, command: string, commandArg?: string) {
        const anchor = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
        runCommand(command, commandArg, { anchor });
    }
</script>

{#snippet footerItem(spec: BarItemSpec)}
    {@const resolved = resolveBarItem(spec.base, 'icons')}
    {#if resolved?.kind === 'spacer'}
        <div class="rice-footer__spacer"></div>
    {:else if resolved?.kind === 'separator'}
        <div class="rice-footer__separator"></div>
    {:else if resolved?.kind === 'component'}
        {#await resolved.loader() then loaded}
            {@const Item = loaded.default}
            <svelte:boundary>
                <Item variant="bar" options={barItemOptions(resolved, spec.options)} item={spec.id} position="footer"></Item>
                {#snippet failed()}<RiceBarItemError id={spec.base}></RiceBarItemError>{/snippet}
            </svelte:boundary>
        {:catch}
            <RiceBarItemError id={spec.base}></RiceBarItemError>
        {/await}
    {:else if resolved?.kind === 'menu'}
        <button
            class="rice-footer-item rice-footer-item--menu"
            title={$_('menu')}
            onclick={(event) => {
                if (spec.options.style === 'popup') {
                    toggleMenu(event, spec.id);
                } else {
                    drawerState.show(menuItems(spec));
                }
            }}
        >
            <Menu color="var(--nav-secondary-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></Menu>
        </button>
        {#if openMenuId === spec.id}
            <RiceMenu position="footer" items={menuItems(spec)} triggerEl={menuTriggerEl} onclose={() => openMenuId = null}></RiceMenu>
        {/if}
    {:else if resolved?.kind === 'action'}
        {@const Icon = resolved.def.icon}
        {@const badgeCount = resolved.def.badge?.({ columnState }) ?? 0}
        <button
            class="rice-footer-item"
            title={$_(resolved.def.labelKey)}
            onclick={(event) => handleActionClick(event, resolved.def.command, resolved.def.commandArg)}
        >
            <Icon color="var(--nav-secondary-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></Icon>
            {#if badgeCount}
                <span class="rice-footer-item__count">{badgeCount}</span>
            {/if}
        </button>
    {/if}
{/snippet}

{#if bar}
    <footer
        class="rice-footer"
        class:rice-footer--float={bar.float}
        class:rice-footer--grouped={groupedSpecs !== null}
        class:rice-footer--hidden={hidden}
        style={styleVars}
    >
        <div class="rice-footer__wrap">
            {#if groupedSpecs}
                {#each groupedSpecs as group (group.name)}
                    <div class="rice-footer__group rice-footer__group--{group.name}">
                        {#each group.items as spec, i (spec.id + i)}
                            {@render footerItem(spec)}
                        {/each}
                    </div>
                {/each}
            {:else}
                {#each flatSpecs as spec, i (spec.id + i)}
                    {@render footerItem(spec)}
                {/each}
            {/if}
        </div>
    </footer>
{/if}

<style lang="postcss">
    .rice-footer {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 999;
        background-color: var(--rice-footer-bg, var(--bg-color-1));
        backdrop-filter: var(--rice-footer-backdrop, none);
        border-top: var(--rice-footer-border, none);
        box-shadow: 0 -1px 6px rgba(61, 120, 209, .09);
        font-size: var(--rice-footer-font-size, 14px);
        opacity: var(--rice-footer-opacity, 1);
        transition: transform .25s cubic-bezier(0.16, 0.01, 0.3, 0.98);

        @media (min-width: 768px) {
            display: none;
        }

        &__wrap {
            display: flex;
            align-items: center;
            justify-content: space-around;
            padding: 0 6px var(--safe-area-bottom);
            height: calc(var(--rice-footer-height-inner, 56px) + var(--safe-area-bottom));
        }

        &--grouped {
            .rice-footer__wrap {
                display: grid;
                grid-template-columns: 1fr auto 1fr;
                justify-content: initial;
            }
        }

        &__group {
            display: flex;
            align-items: center;
            gap: 4px;

            &--start {
                justify-content: flex-start;
            }

            &--center {
                justify-content: center;
            }

            &--end {
                justify-content: flex-end;
            }
        }

        &__spacer {
            flex: 1;
        }

        &__separator {
            width: 1px;
            align-self: stretch;
            margin: 12px 4px;
            background-color: var(--border-color-1);
        }

        &--hidden {
            transform: translateY(calc(100% + var(--safe-area-bottom)));
        }

        &--float {
            left: var(--rice-footer-margin, 8px);
            right: var(--rice-footer-margin, 8px);
            bottom: max(var(--rice-footer-margin, 8px), var(--safe-area-bottom));
            border: var(--rice-footer-border, 1px solid var(--border-color-1));
            border-radius: var(--rice-footer-rounding, 16px);
            box-shadow: 0 4px 16px var(--box-shadow-color-1, rgba(0, 0, 0, .12));

            .rice-footer__wrap {
                padding-bottom: 0;
                height: var(--rice-footer-height-inner, 56px);
            }

            &.rice-footer--hidden {
                transform: translateY(calc(100% + max(var(--rice-footer-margin, 8px), var(--safe-area-bottom))));
            }
        }
    }

    .rice-footer-item {
        display: grid;
        place-content: center;
        width: 48px;
        height: 48px;
        border-radius: 5px;
        position: relative;
    }

    .rice-footer-item__count {
        position: absolute;
        width: 14px;
        height: 14px;
        font-size: 10px;
        font-weight: bold;
        border-radius: 50%;
        background-color: var(--danger-color);
        color: var(--bg-color-1);
        display: grid;
        place-content: center;
        right: 2px;
        top: 4px;
    }
</style>
