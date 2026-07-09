<script lang="ts">
    import '../../styles.css';
    import SideBarHost from '$lib/components/side/SideBarHost.svelte';
    import StatusBar from '$lib/components/rice/StatusBar.svelte';
    import SidePanel from '$lib/components/side/SidePanel.svelte';
    import RiceModulesObserver from '$lib/components/rice/RiceModulesObserver.svelte';
    import RiceBar from '$lib/components/rice/RiceBar.svelte';
    import CoreCommandsObserver from '$lib/components/commands/CoreCommandsObserver.svelte';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { verticalBarOffset } from '$lib/rice/shellGeometry';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { getColumnState, initColumns } from '$lib/classes/columnState.svelte';
    import { runCommand } from '$lib/commands/registry.svelte';
    import { defaultThemeInline } from '$lib/test-fixtures/defaultThemeInline';

    initColumns();
    const columnState = getColumnState(false);

    $effect(() => {
        if (columnState.slots.length === 0) {
            columnState.add({
                id: 'rice-bar-clock',
                algorithm: { type: 'module:clock', name: 'Clock' },
                style: 'default',
                did: '',
                settings: { width: 'medium' },
                data: { cursor: '' },
            } as any);
        }
    });

    let themeStyle = $state(defaultThemeInline());

    if (typeof window !== 'undefined') {
        (window as any).__riceBarTest = {
            ready: true,
            setRiceConfig(config: string) {
                settingsStore.rice.enabled = true;
                settingsStore.rice.config = config;
            },
            setRiceEnabled(enabled: boolean) {
                settingsStore.rice.enabled = enabled;
            },
            setThemeStyle(style: string) {
                themeStyle = style;
            },
            runCommand(id: string, arg?: string) {
                return runCommand(id, arg);
            },
            getMetrics() {
                const side = document.querySelector('.side');
                const statusbar = document.querySelector('.rice-statusbar');
                return {
                    sideWidth: side ? side.getBoundingClientRect().width : null,
                    statusbarPaddingLeft: statusbar ? getComputedStyle(statusbar).paddingLeft : null,
                    menuBarVisible: !!document.querySelector('.rice-bar--menu'),
                    iconsBarVisible: !!document.querySelector('.rice-bar--icons'),
                    nativeSideBarVisible: [...document.querySelectorAll('.side-bar')].some(
                        (el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0,
                    ),
                    menuLabels: [...document.querySelectorAll('.rice-menu-item__label')].map((el) => el.textContent),
                    pillVisible: !!document.querySelector('.rice-menu-item--pill'),
                    accountHeaderVisible: !!document.querySelector('.rice-account-header'),
                    slotCount: columnState.slots.length,
                    diagnosticsCount: riceState.diagnostics.length,
                    groupRects: [...document.querySelectorAll('.rice-statusbar__group, .rice-bar__group')].map((el) => {
                        const rect = el.getBoundingClientRect();
                        return { className: el.className, x: rect.x, y: rect.y, width: rect.width, height: rect.height };
                    }),
                    statusbarRect: (() => {
                        const el = document.querySelector('.rice-statusbar');
                        if (!el) return null;
                        const rect = el.getBoundingClientRect();
                        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
                    })(),
                    rightBarRect: (() => {
                        const el = document.querySelector('.rice-bar--edge-right');
                        if (!el) return null;
                        const rect = el.getBoundingClientRect();
                        return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
                    })(),
                    clockDateVisible: !!document.querySelector('.rice-clock__date'),
                    widgetKinds: [...document.querySelectorAll('.rice-widget')].map((el) => el.getAttribute('data-widget')),
                };
            },
        };
    }
</script>

<RiceModulesObserver></RiceModulesObserver>
<CoreCommandsObserver></CoreCommandsObserver>
<div class="app-mock app" style={(riceState.themeReset ? '' : themeStyle) + riceState.globalStyle}>
    <SidePanel></SidePanel>
    <StatusBar position="top"></StatusBar>

    <div class="wrap-mock">
        <div class="side">
            <SideBarHost></SideBarHost>
        </div>
        <main class="main-mock"></main>
    </div>

    <StatusBar position="bottom"></StatusBar>
    {#each riceState.leftBars as bar, index (bar.label ?? index)}
        <RiceBar position="left" config={bar} offset={verticalBarOffset(riceState.leftBars, index)}></RiceBar>
    {/each}
    {#each riceState.rightBars as bar, index (bar.label ?? index)}
        <RiceBar position="right" config={bar} offset={verticalBarOffset(riceState.rightBars, index)}></RiceBar>
    {/each}
</div>

<style>
    :global(body) {
        margin: 0;
    }

    .app-mock {
        display: flex;
        flex-direction: column;
        min-height: 100dvh;
    }

    .wrap-mock {
        display: flex;
        flex: 1;
        min-height: 0;
    }

    .side {
        display: grid;
        grid-template-columns: var(--side-width, 64px);
        align-self: stretch;
    }

    .main-mock {
        flex: 1;
    }
</style>
