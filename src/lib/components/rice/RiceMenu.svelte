<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { runCommand } from '$lib/commands/registry.svelte';
    import { floatingPopup, popupDismiss } from '$lib/attachments/popup.svelte';
    import { riceFx } from '$lib/rice/transition';
    import { cubicBezier } from '$lib/rice/easing';
    import { ALL_ITEMS } from '$lib/classes/sideState.svelte';
    import { resolveSideItemDef } from '$lib/components/side/sideItems';
    import { getColumnState } from '$lib/classes/columnState.svelte';
    import type { BarSlot } from '$lib/rice/config/model';

    interface Props {
        position: BarSlot;
        items?: string[];
        triggerEl?: HTMLElement;
        onclose: () => void;
    }

    let { position, items, triggerEl, onclose }: Props = $props();
    let anchorEl = $state<HTMLElement>();

    const columnState = getColumnState();
    const expoOut = cubicBezier(0.16, 1, 0.3, 1);

    const visibleItems = $derived((items?.length ? items : ALL_ITEMS) as string[]);

    const placement = $derived.by(() => {
        switch (position) {
            case 'left': return 'right-end' as const;
            case 'right': return 'left-end' as const;
            case 'top': return 'bottom-end' as const;
            default: return 'top' as const;
        }
    });
    const direction = $derived.by(() => {
        switch (position) {
            case 'left': return 'left' as const;
            case 'right': return 'right' as const;
            case 'top': return 'top' as const;
            default: return 'bottom' as const;
        }
    });

    function handleAction(command: string, commandArg?: string) {
        onclose();
        runCommand(command, commandArg, { anchor: triggerEl });
    }
</script>

<div bind:this={anchorEl}></div>

<div
    class="rice-menu-popup"
    transition:riceFx={{ target: 'panel', duration: 220, easing: expoOut, style: { kind: 'slide', direction, distance: 12 } }}
    {@attach floatingPopup(() => ({
        anchor: anchorEl,
        placement,
        strategy: 'fixed',
        offsetMain: 12,
        offsetAlign: 8,
        shiftPadding: 8,
        flipEnabled: false,
    }))}
    {@attach popupDismiss(() => ({
        onclose,
        ignore: () => triggerEl,
    }))}
>
    <ul class="rice-menu-popup__list">
        {#each visibleItems as item (item)}
            {@const def = resolveSideItemDef(item)}
            {#if def}
                {@const Icon = def.icon}
                {@const badgeCount = def.badge?.({ columnState }) ?? 0}
                <li class="rice-menu-popup__item">
                    <button class="rice-menu-popup__button" onclick={() => handleAction(def.command, def.commandArg)}>
                        <Icon size={18} color="var(--nav-secondary-icon-color)" strokeWidth="var(--icon-stroke-width, 2px)"></Icon>
                        <span class="rice-menu-popup__label">{$_(def.labelKey)}</span>
                        {#if badgeCount}
                            <span class="rice-menu-popup__badge">{badgeCount}</span>
                        {/if}
                    </button>
                </li>
            {/if}
        {/each}
    </ul>
</div>

<style lang="postcss">
    .rice-menu-popup {
        position: fixed;
        top: 0;
        left: 0;
        padding: 8px;
        border-radius: var(--border-radius-3);
        background-color: var(--bg-color-1);
        min-width: 180px;
        z-index: 100;
        box-shadow: 0 3px 6px var(--box-shadow-color-1);
        border: none;
        color: var(--text-color-1);

        &__list {
            list-style: none;
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        &__button {
            display: flex;
            align-items: center;
            gap: 10px;
            width: 100%;
            height: 40px;
            padding: 0 10px;
            border-radius: var(--border-radius-2);
            color: var(--text-color-1);
            font-size: 14px;
            text-align: left;
            transition: background-color .15s linear;

            &:hover {
                background-color: var(--side-nav-hover-bg-color, var(--bg-color-2));
            }
        }

        &__label {
            flex: 1;
        }

        &__badge {
            min-width: 18px;
            height: 18px;
            padding: 0 5px;
            font-size: 11px;
            font-weight: bold;
            border-radius: 9px;
            background-color: var(--danger-color);
            color: var(--bg-color-1);
            display: grid;
            place-content: center;
        }
    }
</style>
