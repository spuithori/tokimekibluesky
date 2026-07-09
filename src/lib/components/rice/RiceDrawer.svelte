<script lang="ts">
    import { popupDismiss } from '$lib/attachments/popup.svelte';
    import { riceFx } from '$lib/rice/transition';
    import { cubicBezier } from '$lib/rice/easing';
    import { ALL_ITEMS } from '$lib/classes/sideState.svelte';
    import { drawerState } from '$lib/classes/drawerState.svelte';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { emptyBar, type BarItemSpec } from '$lib/rice/config/model';
    import RiceBarItemList from './RiceBarItemList.svelte';

    const expoOut = cubicBezier(0.16, 1, 0.3, 1);

    const drawerBar = $derived.by(() => {
        const candidate = riceState.bars.drawer?.[0];
        return candidate?.kind === 'rice' && (candidate.items?.length ?? 0) > 0 ? candidate : null;
    });

    const fallbackBar = emptyBar('drawer', 'rice');
    fallbackBar.style = 'menu';

    const specs = $derived.by<BarItemSpec[]>(() => {
        if (drawerBar) {
            return drawerBar.itemSpecs ?? (drawerBar.items ?? []).map((id) => ({ id, base: id.split('#')[0], options: {} }));
        }
        const items = drawerState.open?.items?.length ? drawerState.open.items : ALL_ITEMS;
        return (items as string[]).map((id) => ({ id, base: id.split('#')[0], options: {} }));
    });

    const styleVars = $derived.by(() => {
        const p = drawerBar?.props;
        if (!p) return '';
        let style = '';
        if (p.width) style += `--rice-drawer-width: ${p.width};`;
        if (p.background) style += `--rice-drawer-bg: ${p.background};`;
        if (p.blur) style += `--rice-drawer-backdrop: blur(${p.blur});`;
        if (p.rounding) style += `--rice-drawer-rounding: ${p.rounding};`;
        if (p.border) style += `--rice-drawer-border: ${p.border};`;
        if (p.opacity) style += `--rice-drawer-opacity: ${p.opacity};`;
        return style;
    });

    function close() {
        drawerState.close();
    }
</script>

{#if drawerState.open}
    <button
        class="rice-drawer__scrim"
        aria-label="Close"
        onclick={close}
        transition:riceFx={{ target: 'drawer', duration: 220, easing: expoOut, style: { kind: 'fade' }, lockStyle: true }}
    ></button>
{/if}

{#if drawerState.open}
    <div
        class="rice-drawer"
        style={styleVars || null}
        transition:riceFx={{ target: 'drawer', duration: 240, easing: expoOut, style: { kind: 'slide', direction: 'left', distance: 48 } }}
        {@attach popupDismiss(() => ({
            onclose: close,
        }))}
    >
        <RiceBarItemList {specs} bar={drawerBar ?? fallbackBar} position="drawer" onItemRun={close}></RiceBarItemList>
    </div>
{/if}

<style lang="postcss">
    .rice-drawer__scrim {
        position: fixed;
        inset: 0;
        z-index: 9998;
        background-color: #000;
        opacity: .4;
    }

    .rice-drawer {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        width: var(--rice-drawer-width, min(300px, 82vw));
        z-index: 9999;
        background-color: var(--rice-drawer-bg, var(--bg-color-1));
        backdrop-filter: var(--rice-drawer-backdrop, none);
        border-right: var(--rice-drawer-border, none);
        border-radius: var(--rice-drawer-rounding, 0);
        opacity: var(--rice-drawer-opacity, 1);
        color: var(--text-color-1);
        box-shadow: 4px 0 24px var(--box-shadow-color-1);
        display: flex;
        flex-direction: column;
        gap: var(--rice-bar-gap, 2px);
        padding: max(16px, env(safe-area-inset-top)) 12px max(16px, var(--safe-area-bottom, 0px));
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-width: none;

        &::-webkit-scrollbar {
            display: none;
        }
    }
</style>
