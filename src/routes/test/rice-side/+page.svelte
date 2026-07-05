<script lang="ts">
    import '../../styles.css';
    import Side from '../../(app)/Side.svelte';
    import Decks from '../../(app)/Decks.svelte';
    import StatusBar from '$lib/components/rice/StatusBar.svelte';
    import RiceBar from '$lib/components/rice/RiceBar.svelte';
    import SidePanel from '$lib/components/side/SidePanel.svelte';
    import RiceModulesObserver from '$lib/components/rice/RiceModulesObserver.svelte';
    import RiceEffectLayers from '$lib/components/rice/RiceEffectLayers.svelte';
    import CoreCommandsObserver from '$lib/components/commands/CoreCommandsObserver.svelte';
    import KeybindsObserver from '$lib/components/commands/KeybindsObserver.svelte';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { getColumnState, initColumns } from '$lib/classes/columnState.svelte';
    import { keymodeState } from '$lib/classes/keymodeState.svelte';
    import { scratchpadState } from '$lib/classes/scratchpadState.svelte';
    import { firstLeafId } from '$lib/classes/deckLayout';
    import { setPostState } from '$lib/classes/postState.svelte';
    import { sideState } from '$lib/classes/sideState.svelte';
    import { overlayState } from '$lib/classes/overlayState.svelte';
    import { runCommand } from '$lib/commands/registry.svelte';
    import { defaultThemeInline } from '$lib/test-fixtures/defaultThemeInline';

    setPostState();
    initColumns();
    const columnState = getColumnState(false);

    $effect(() => {
        if (columnState.slots.length === 0) {
            columnState.add({
                id: 'rice-side-clock',
                algorithm: { type: 'module:clock', name: 'Clock' },
                style: 'default',
                did: '',
                settings: { width: 'medium' },
                data: { cursor: '' },
            } as any);
            columnState.add({
                id: 'rice-side-dummy',
                algorithm: { type: 'module:dummytimeline', name: 'Dummy' },
                style: 'default',
                did: '',
                settings: { width: 'medium' },
                data: { cursor: '' },
            } as any);
        }
    });

    let themeStyle = $state(defaultThemeInline());

    if (typeof window !== 'undefined') {
        (window as any).__riceSideTest = {
            ready: true,
            setRiceConfig(config: string) {
                settingsStore.rice.enabled = true;
                settingsStore.rice.config = config;
            },
            setRiceEnabled(enabled: boolean) {
                settingsStore.rice.enabled = enabled;
            },
            keepFirstColumnOnly() {
                columnState.slots = columnState.slots.slice(0, 1);
            },
            addDummyColumn(id: string, name: string, width: string = 'medium') {
                columnState.add({
                    id,
                    algorithm: { type: 'module:dummytimeline', name },
                    style: 'default',
                    did: '',
                    settings: { width },
                    data: { cursor: '' },
                } as any);
            },
            setColumnIcon(id: string, icon: string) {
                const column = columnState.columns.find((c) => c.id === id);
                if (column) column.settings = { ...column.settings, icon } as any;
            },
            addPopupColumn() {
                columnState.add({
                    id: 'rice-side-popup',
                    algorithm: { type: 'module:clock', name: 'Popup' },
                    style: 'default',
                    did: '',
                    settings: { width: 'medium', isPopup: true },
                    data: { cursor: '' },
                } as any);
            },
            setThemeStyle(style: string) {
                themeStyle = style;
            },
            runCommand(id: string, arg?: string) {
                runCommand(id, arg);
            },
            getMetrics() {
                const side = document.querySelector('.side');
                const panel = document.querySelector('.side-modal');
                const scrim = document.querySelector('.side-panel-scrim');
                const menuBar = document.querySelector('.rice-bar--menu');
                const icon = document.querySelector('.rice-menu-item svg');
                const deck = document.querySelector('.deck');
                const leftSpacer = document.querySelector('.deck-divider--compact');
                const rightSpacer = document.querySelector('.deck-divider--right');
                const rightBar = document.querySelector('.rice-bar--edge-right');
                const statusbar = document.querySelector('.rice-statusbar');
                return {
                    deckWraps: [...document.querySelectorAll('.deck-row-wrap')].map((el) => {
                        const cs = getComputedStyle(el);
                        return {
                            outlineStyle: cs.outlineStyle,
                            outlineWidth: cs.outlineWidth,
                            outlineColor: cs.outlineColor,
                            outlineOffset: cs.outlineOffset,
                            opacity: cs.opacity,
                            hasFocusVisible: !!el.querySelector('.deck-row:focus-visible'),
                        };
                    }),
                    rightBarRect: rightBar ? rightBar.getBoundingClientRect().toJSON() : null,
                    rightSpacerWidth: rightSpacer ? rightSpacer.getBoundingClientRect().width : null,
                    sideRect: side ? side.getBoundingClientRect().toJSON() : null,
                    menuBarRect: menuBar ? menuBar.getBoundingClientRect().toJSON() : null,
                    menuLabels: [...document.querySelectorAll('.rice-menu-item__label')].map((el) => el.textContent),
                    labelWidths: [...document.querySelectorAll('.rice-menu-item__label')].map(
                        (el) => el.getBoundingClientRect().width,
                    ),
                    iconWidth: icon ? icon.getBoundingClientRect().width : null,
                    deckRect: deck ? deck.getBoundingClientRect().toJSON() : null,
                    deckWrapRects: [...document.querySelectorAll('.deck-row-wrap')].map((el) => el.getBoundingClientRect().toJSON()),
                    deckScrollWidth: deck ? deck.scrollWidth : null,
                    deckClientWidth: deck ? deck.clientWidth : null,
                    leftSpacerWidth: leftSpacer ? leftSpacer.getBoundingClientRect().width : null,
                    statusbarPaddingLeft: statusbar ? getComputedStyle(statusbar).paddingLeft : null,
                    statusbarPaddingRight: statusbar ? getComputedStyle(statusbar).paddingRight : null,
                    verticalBarVisible: !!document.querySelector('.rice-bar--vertical'),
                    nativeSideBarVisible: [...document.querySelectorAll('.side-bar')].some(
                        (el) => getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0,
                    ),
                    scrollWidth: document.documentElement.scrollWidth,
                    clientWidth: document.documentElement.clientWidth,
                    slotCount: columnState.slots.length,
                    keymode: keymodeState.mode,
                    keymodeChip: document.querySelector('.rice-keymode')?.textContent ?? null,
                    slotIds: columnState.slots.map((slot) => firstLeafId(slot.layout)),
                    popupCount: columnState.columns.filter((c) => c.settings?.isPopup).length,
                    scratchpadHidden: scratchpadState.hidden,
                    firstSlotWidth: (() => {
                        const el = document.querySelector('.deck .deck-row-slot');
                        return el ? el.getBoundingClientRect().width : null;
                    })(),
                    sideModalOpen: sideState.openModal,
                    actionCenterOpen: overlayState.actionCenter,
                    panelRect: panel ? panel.getBoundingClientRect().toJSON() : null,
                    scrim: scrim ? { opacity: getComputedStyle(scrim).opacity } : null,
                    diagnosticsCount: riceState.diagnostics.length,
                    deckTabs: (() => {
                        const strip = document.querySelector('.deck-tabs__strip');
                        if (!strip) return null;
                        return {
                            labels: [...strip.querySelectorAll('.deck-tabs__label')].map((el) => el.textContent),
                            activeLabel: strip.querySelector('.deck-tabs__tab--active .deck-tabs__label')?.textContent ?? null,
                            paneCount: document.querySelectorAll('.deck-tabs__pane').length,
                            mountedRows: document.querySelectorAll('.deck-tabs__pane .deck-row').length,
                            inactiveVisibility: [...document.querySelectorAll('.deck-tabs__pane--inactive')].map(
                                (el) => getComputedStyle(el).visibility,
                            ),
                            paneScrollTops: [...document.querySelectorAll('.deck-tabs__pane .deck-row')].map(
                                (el) => (el as HTMLElement).scrollTop,
                            ),
                        };
                    })(),
                    headings: [...document.querySelectorAll('.deck .deck-heading')].map((el) => {
                        const cs = getComputedStyle(el);
                        return { opacity: cs.opacity, marginBottom: cs.marginBottom, pointerEvents: cs.pointerEvents };
                    }),
                    popupTitlebar: (() => {
                        const el = document.querySelector('.deck-popup-titlebar');
                        if (!el) return null;
                        const wrap = document.querySelector('.deck-popup-wrap');
                        return {
                            opacity: getComputedStyle(el).opacity,
                            wrapPaddingTop: wrap ? getComputedStyle(wrap).paddingTop : null,
                        };
                    })(),
                    columnWidgets: [...document.querySelectorAll('.rice-widget-column')].map((el) => {
                        const rect = el.getBoundingClientRect();
                        return {
                            height: rect.height,
                            width: rect.width,
                            dummyPosts: el.querySelectorAll('.rice-dummy-post').length,
                            hasLogin: !!el.querySelector('.rice-widget-login'),
                        };
                    }),
                };
            },
        };
    }
</script>

<RiceModulesObserver></RiceModulesObserver>
<CoreCommandsObserver></CoreCommandsObserver>
<KeybindsObserver></KeybindsObserver>
<div class="app-mock app" style={(riceState.themeReset ? '' : themeStyle) + riceState.globalStyle}>
    <SidePanel></SidePanel>
    <RiceEffectLayers></RiceEffectLayers>
    <StatusBar position="top"></StatusBar>

    <div class="wrap-mock">
        <Side></Side>

        <main class="main-mock">
            <Decks></Decks>
        </main>
    </div>

    <StatusBar position="bottom"></StatusBar>
    <RiceBar position="left"></RiceBar>
    <RiceBar position="right"></RiceBar>
</div>

<style>
    :global(body) {
        margin: 0;
    }

    .app-mock {
        display: flex;
        flex-direction: column;
        min-height: 100dvh;
        background-color: var(--app-bg-color);
        color: var(--app-color);
    }

    .wrap-mock {
        display: flex;
        flex: 1;
        min-height: 0;
        min-width: 0;
    }

    .main-mock {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
    }
</style>
