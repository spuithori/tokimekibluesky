<script lang="ts">
    import { MediaQuery } from 'svelte/reactivity';
    import CircleX from '@lucide/svelte/icons/circle-x';
    import type { Placement } from 'svelte-floating-ui/dom';
    import type { SlideDirection } from '$lib/rice/config/model';
    import { riceFx, type RiceFxParams } from '$lib/rice/transition';
    import { cubicBezier } from '$lib/rice/easing';
    import { floatingPopup, popupDismiss } from '$lib/attachments/popup.svelte';
    import { sideState } from '$lib/classes/sideState.svelte';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { runCommand } from '$lib/commands/registry.svelte';
    import SideWorkspace from '$lib/components/side/SideWorkspace.svelte';
    import SideMyFeeds from '$lib/components/side/SideMyFeeds.svelte';
    import SideNotification from '$lib/components/side/SideNotification.svelte';
    import SideBluecast from '$lib/components/side/SideBluecast.svelte';
    import SideColumns from '$lib/components/side/SideColumns.svelte';
    import SideTopic from '$lib/components/side/SideTopic.svelte';

    const expoOut = cubicBezier(0.16, 1, 0.3, 1);
    const isMobile = new MediaQuery('(max-width: 767px)');

    const panel = $derived(riceState.panel);

    interface ResolvedPanel {
        mode: 'left' | 'right' | 'center' | 'anchor';
        placement: Placement;
        direction: SlideDirection;
    }

    const DOCK_LEFT: ResolvedPanel = { mode: 'left', placement: 'right-start', direction: 'left' };

    function anchorEdge(anchor: HTMLElement): 'left' | 'right' | 'top' | 'bottom' {
        if (anchor.closest('.rice-statusbar--top')) return 'top';
        if (anchor.closest('.rice-statusbar--bottom') || anchor.closest('.rice-footer')) return 'bottom';
        if (anchor.closest('.rice-bar--edge-right')) return 'right';
        if (anchor.closest('.rice-bar--edge-left') || anchor.closest('.side')) return 'left';
        const rect = anchor.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const distances: ['left' | 'right' | 'top' | 'bottom', number][] = [
            ['left', cx],
            ['right', window.innerWidth - cx],
            ['top', cy],
            ['bottom', window.innerHeight - cy],
        ];
        distances.sort((a, b) => a[1] - b[1]);
        return distances[0][0];
    }

    function anchorResolution(anchor: HTMLElement): ResolvedPanel {
        const edge = anchorEdge(anchor);
        const rect = anchor.getBoundingClientRect();
        const align = rect.left + rect.width / 2 > window.innerWidth / 2 ? 'end' : 'start';
        switch (edge) {
            case 'top':
                return { mode: 'anchor', placement: `bottom-${align}`, direction: 'top' };
            case 'bottom':
                return { mode: 'anchor', placement: `top-${align}`, direction: 'bottom' };
            case 'right':
                return { mode: 'anchor', placement: 'left-start', direction: 'right' };
            default:
                return { mode: 'anchor', placement: 'right-start', direction: 'left' };
        }
    }

    const resolved = $derived.by((): ResolvedPanel => {
        const position = panel?.position ?? 'auto';
        if (position === 'left') return DOCK_LEFT;
        if (position === 'right') return { mode: 'right', placement: 'left-start', direction: 'right' };
        if (position === 'center') return { mode: 'center', placement: 'right-start', direction: 'bottom' };
        const anchor = sideState.anchor?.isConnected ? sideState.anchor : null;
        if (!anchor) return DOCK_LEFT;
        const byAnchor = anchorResolution(anchor);
        if (position === 'anchor') return byAnchor;
        if (byAnchor.direction === 'left') return DOCK_LEFT;
        if (byAnchor.direction === 'right') return { mode: 'right', placement: 'left-start', direction: 'right' };
        return byAnchor;
    });

    const styleVars = $derived.by(() => {
        const props = panel?.props ?? {};
        let style = '';
        if (props.width) style += `--rice-panel-width: ${props.width};`;
        if (props.background) style += `--rice-panel-bg: ${props.background};`;
        if (props.blur) style += `--rice-panel-backdrop: blur(${props.blur});`;
        if (props.rounding) style += `--rice-panel-rounding: ${props.rounding};`;
        if (props.border) style += `--rice-panel-border: ${props.border};`;
        if (props.shadow) style += `--rice-panel-shadow: ${props.shadow};`;
        return style;
    });

    const panelFx = $derived.by((): RiceFxParams => {
        const fx = { target: 'panel', duration: 220, easing: expoOut };
        if (isMobile.current) {
            return { ...fx, style: { kind: 'slide', direction: 'bottom', distance: 24 }, direction: 'bottom' };
        }
        if (resolved.mode === 'center') {
            return { ...fx, style: { kind: 'popin', scale: 0.97 } };
        }
        const distance = resolved.mode === 'anchor' ? 12 : 24;
        return { ...fx, style: { kind: 'slide', direction: resolved.direction, distance }, direction: resolved.direction };
    });

    function close() {
        sideState.close();
    }

    function handleViewColumn(_column: any, index: number) {
        runCommand('column.focus', String(index + 1));
        close();
    }
</script>

{#if sideState.openModal && panel?.dim}
    <button
        class="side-panel-scrim"
        style:opacity={panel.dim}
        aria-label="Close"
        onclick={close}
        transition:riceFx={{ target: 'panel', duration: 220, easing: expoOut, style: { kind: 'fade' }, lockStyle: true }}
    ></button>
{/if}

{#if sideState.openModal}
    <div
        class="side-modal side-panel side-panel--{resolved.mode}"
        style={styleVars || null}
        transition:riceFx={panelFx}
        {@attach floatingPopup(() => ({
            anchor: resolved.mode === 'anchor' ? sideState.anchor : null,
            active: sideState.openModal !== null,
            placement: resolved.placement,
            offsetMain: Number.parseFloat(panel?.props.offset ?? '') || 12,
            minHeight: 200,
        }))}
        {@attach popupDismiss(() => ({ onclose: close, ignore: () => sideState.anchor }))}
    >
        <div class="side-modal__content">
            {#if sideState.openModal === 'workspace'}
                <SideWorkspace onclose={close}></SideWorkspace>
            {:else if sideState.openModal === 'feeds'}
                <SideMyFeeds onclose={close}></SideMyFeeds>
            {:else if sideState.openModal === 'notifications'}
                <SideNotification></SideNotification>
            {:else if sideState.openModal === 'bluecast'}
                <SideBluecast></SideBluecast>
            {:else if sideState.openModal === 'columns'}
                <SideColumns onviewcolumn={handleViewColumn}></SideColumns>
            {:else if sideState.openModal === 'topic'}
                <SideTopic></SideTopic>
            {/if}
        </div>

        <button class="side-modal__close only-mobile" onclick={close}>
            <CircleX size="36" color="var(--text-color-1)"></CircleX>
        </button>
    </div>
{/if}

<style lang="postcss">
    .side-panel-scrim {
        position: fixed;
        inset: 0;
        z-index: 9998;
        background-color: #000;
    }

    .side-panel {
        position: fixed;
        z-index: 9999;
        width: calc(var(--rice-panel-width, 308px) + 32px);

        @media (max-width: 767px) {
            top: auto !important;
            bottom: calc(var(--rice-footer-height, 56px) + 8px) !important;
            left: 0 !important;
            right: 0 !important;
            width: auto !important;
            height: calc(100dvh - 128px);
            max-height: none !important;
        }

        &--left {
            top: calc(56px + var(--rice-statusbar-top-height, 0px));
            bottom: calc(16px + var(--rice-statusbar-bottom-height, 0px));
            left: calc(var(--shell-inset, 0px) + var(--side-width, 64px));
        }

        &--right {
            top: calc(56px + var(--rice-statusbar-top-height, 0px));
            bottom: calc(16px + var(--rice-statusbar-bottom-height, 0px));
            right: calc(var(--shell-inset, 0px) + var(--side-right-width, 0px));
        }

        &--center {
            top: 10vh;
            bottom: 10vh;
            left: 0;
            right: 0;
            margin: 0 auto;
        }

        &--anchor {
            height: calc(100dvh - 128px);
        }
    }

    .side-modal :global(.deck-heading) {
        top: 0 !important;
    }

    .side-modal__content {
        position: absolute;
        inset: 12px 16px;
        box-shadow: var(--rice-panel-shadow, 0 0 12px var(--box-shadow-color-1));
        border-radius: var(--rice-panel-rounding, var(--border-radius-3));
        border: var(--rice-panel-border, none);
        overscroll-behavior-y: contain;
        background-color: var(--rice-panel-bg, var(--bg-color-1));
        backdrop-filter: var(--rice-panel-backdrop, none);
        overflow-x: hidden;
        max-width: var(--rice-panel-width, 308px);

        @media (max-width: 767px) {
            max-width: initial;
        }

        @media (min-width: 768px) {
            scrollbar-color: var(--scroll-bar-color) var(--scroll-bar-bg-color);

            &::-webkit-scrollbar {
                width: 6px;
            }

            &::-webkit-scrollbar-thumb {
                background: var(--scroll-bar-color);
                border-radius: 0;
            }

            &::-webkit-scrollbar-track {
                background: var(--scroll-bar-bg-color);
                border-radius: 0;
            }
        }
    }

    .side-modal__close {
        position: absolute;
        bottom: 24px;
        width: 36px;
        height: 36px;
        left: 0;
        right: 0;
        margin: auto;
        z-index: 1;
    }
</style>
