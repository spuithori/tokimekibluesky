<script lang="ts">
    import '../../styles.css';
    import FooterHost from '../../(app)/FooterHost.svelte';
    import SideBarHost from '$lib/components/side/SideBarHost.svelte';
    import PublishFab from '$lib/components/publish/PublishFab.svelte';
    import RiceDrawer from '$lib/components/rice/RiceDrawer.svelte';
    import RiceModulesObserver from '$lib/components/rice/RiceModulesObserver.svelte';
    import CoreCommandsObserver from '$lib/components/commands/CoreCommandsObserver.svelte';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { getColumnState, initColumns } from '$lib/classes/columnState.svelte';
    import { scrollDirectionState } from '$lib/classes/scrollDirectionState.svelte';
    import { overlayState } from '$lib/classes/overlayState.svelte';
    import { intersectingIndex } from '$lib/stores';
    import { runCommand } from '$lib/commands/registry.svelte';
    import { defaultThemeInline } from '$lib/test-fixtures/defaultThemeInline';

    initColumns();
    const columnState = getColumnState(false);

    $effect(() => {
        if (columnState.slots.length === 0) {
            columnState.add({
                id: 'rice-mobile-clock',
                algorithm: { type: 'module:clock', name: 'Clock' },
                style: 'default',
                did: '',
                settings: { width: 'medium' },
                data: { cursor: '' },
            } as any);
            columnState.add({
                id: 'rice-mobile-dummy',
                algorithm: { type: 'module:dummytimeline', name: 'Dummy' },
                style: 'default',
                did: '',
                settings: { width: 'medium' },
                data: { cursor: '' },
            } as any);
        }
    });

    let themeStyle = $state(defaultThemeInline());
    let fabOpen = $state(false);

    if (typeof window !== 'undefined') {
        settingsStore.design.mobilePostLayoutTop = true;
        (window as any).__riceMobileTest = {
            ready: true,
            setRiceConfig(config: string) {
                settingsStore.rice.enabled = true;
                settingsStore.rice.config = config;
            },
            setRiceEnabled(enabled: boolean) {
                settingsStore.rice.enabled = enabled;
            },
            setFixedFooter(value: boolean) {
                settingsStore.design.fixedFooter = value;
            },
            setScrollDirection(direction: 'up' | 'down' | 'none') {
                scrollDirectionState.direction = direction;
            },
            setIntersectingIndex(index: number) {
                intersectingIndex.set(index);
            },
            runCommand(id: string, arg?: string) {
                return runCommand(id, arg);
            },
            getMetrics() {
                const appMock = document.querySelector('.app-mock')!;
                const nativeFooter = document.querySelector('.footer');
                const riceFooter = document.querySelector('.rice-footer');
                const sideBar = document.querySelector('.side-bar');
                const fab = document.querySelector('.publish-toggle');
                const rectOf = (el: Element | null) => {
                    if (!el) return null;
                    const rect = el.getBoundingClientRect();
                    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom };
                };
                return {
                    nativeFooterVisible: !!nativeFooter && getComputedStyle(nativeFooter).display !== 'none',
                    nativeFooterRect: rectOf(nativeFooter),
                    riceFooterAttached: !!riceFooter,
                    riceFooterVisible: !!riceFooter && getComputedStyle(riceFooter).display !== 'none',
                    riceFooterRect: rectOf(riceFooter),
                    riceFooterClasses: riceFooter?.className ?? null,
                    footerItemLabels: [...document.querySelectorAll('.rice-footer-item')].map((el) => el.getAttribute('title')),
                    footerHeightVar: getComputedStyle(appMock).getPropertyValue('--rice-footer-height').trim(),
                    fabRect: rectOf(fab),
                    fabBottom: fab ? getComputedStyle(fab).bottom : null,
                    fabLeft: fab ? getComputedStyle(fab).left : null,
                    fabWidth: fab ? getComputedStyle(fab).width : null,
                    sideBarClasses: sideBar?.className ?? null,
                    sideBarRect: rectOf(sideBar),
                    sideBarVisible: !!sideBar && getComputedStyle(sideBar).visibility !== 'hidden' && getComputedStyle(sideBar).display !== 'none',
                    menuOpen: !!document.querySelector('.rice-menu-popup'),
                    menuLabels: [...document.querySelectorAll('.rice-menu-popup__label')].map((el) => el.textContent),
                    orbitOpen: overlayState.orbit,
                    diagnosticsCount: riceState.diagnostics.length,
                };
            },
        };
    }
</script>

<RiceModulesObserver></RiceModulesObserver>
<CoreCommandsObserver></CoreCommandsObserver>
<div class="app-mock app" style={(riceState.themeReset ? '' : themeStyle) + riceState.globalStyle}>
    <div class="wrap-mock">
        <div class="side">
            <SideBarHost></SideBarHost>
        </div>
        <main class="main-mock"></main>
    </div>

    <FooterHost></FooterHost>
    <PublishFab open={fabOpen} onOpen={() => { fabOpen = true; }} onClose={() => { fabOpen = false; }}></PublishFab>
    <RiceDrawer></RiceDrawer>
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

        @media (max-width: 767px) {
            grid-template-columns: 0;
        }
    }

    .main-mock {
        flex: 1;
    }
</style>
