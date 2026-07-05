<script lang="ts">
    import '../../styles.css';
    import SideBar from '$lib/components/side/SideBar.svelte';
    import StatusBar from '$lib/components/rice/StatusBar.svelte';
    import RiceModulesObserver from '$lib/components/rice/RiceModulesObserver.svelte';
    import CoreCommandsObserver from '$lib/components/commands/CoreCommandsObserver.svelte';
    import KeybindsObserver from '$lib/components/commands/KeybindsObserver.svelte';
    import CommandPalette from '$lib/components/commands/CommandPalette.svelte';
    import ActionCenter from '$lib/components/commands/ActionCenter.svelte';
    import Orbit from '$lib/components/commands/Orbit.svelte';
    import SidePanel from '$lib/components/side/SidePanel.svelte';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { sideState } from '$lib/classes/sideState.svelte';
    import { runCommand } from '$lib/commands/registry.svelte';
    import { getColumnState, initColumns } from '$lib/classes/columnState.svelte';
    import { keymodeState } from '$lib/classes/keymodeState.svelte';
    import { scratchpadState } from '$lib/classes/scratchpadState.svelte';
    import { firstLeafId } from '$lib/classes/deckLayout';

    initColumns();
    const columnState = getColumnState(false);

    $effect(() => {
        if (columnState.slots.length === 0) {
            columnState.add({
                id: 'rice-shell-clock',
                algorithm: { type: 'module:clock', name: 'Clock' },
                style: 'default',
                did: '',
                settings: { width: 'medium' },
                data: { cursor: '' },
            } as any);
        }
    });

    if (typeof window !== 'undefined') {
        (window as any).__riceShellTest = {
            ready: true,
            setRiceConfig(config: string) {
                settingsStore.rice.enabled = true;
                settingsStore.rice.config = config;
            },
            setRiceEnabled(enabled: boolean) {
                settingsStore.rice.enabled = enabled;
            },
            setSideItems(items: string[]) {
                sideState.items = items as any;
            },
            runCommand(id: string, arg?: string) {
                return runCommand(id, arg);
            },
            getRiceConfig() {
                return settingsStore.rice.config;
            },
            getMetrics() {
                const side = document.querySelector('.side');
                const statusbar = document.querySelector('.rice-statusbar');
                return {
                    sideWidth: side ? side.getBoundingClientRect().width : null,
                    statusbarPaddingLeft: statusbar ? getComputedStyle(statusbar).paddingLeft : null,
                    navItems: [...document.querySelectorAll('.side-nav__button[class*="side-nav__button--"]')].map(
                        (el) => [...el.classList].find((c) => c.startsWith('side-nav__button--'))?.replace('side-nav__button--', ''),
                    ),
                    publishButtonVisible: !!document.querySelector('.side-publish-button'),
                    settingsButtonVisible: !!document.querySelector('.side-bar-button--settings'),
                    sideModalOpen: sideState.openModal,
                    darkmode: settingsStore.design.darkmode,
                    slotCount: columnState.slots.length,
                    keymode: keymodeState.mode,
                    slotIds: columnState.slots.map((slot) => firstLeafId(slot.layout)),
                    popupCount: columnState.columns.filter((c) => c.settings?.isPopup).length,
                    scratchpadHidden: scratchpadState.hidden,
                    firstSlotWidth: (() => {
                        const el = document.querySelector('.deck-row-slot');
                        return el ? el.getBoundingClientRect().width : null;
                    })(),
                    keymodeChip: document.querySelector('.rice-keymode')?.textContent ?? null,
                };
            },
            addClockColumn(id: string, name: string) {
                columnState.add({
                    id,
                    algorithm: { type: 'module:clock', name },
                    style: 'default',
                    did: '',
                    settings: { width: 'medium' },
                    data: { cursor: '' },
                } as any);
            },
        };
    }
</script>

<RiceModulesObserver></RiceModulesObserver>
<CoreCommandsObserver></CoreCommandsObserver>
<KeybindsObserver></KeybindsObserver>
<div class="app-mock app" style={riceState.globalStyle}>
    <CommandPalette></CommandPalette>
    <ActionCenter></ActionCenter>
    <Orbit></Orbit>
    <SidePanel></SidePanel>
    <StatusBar position="top"></StatusBar>

    <div class="wrap-mock">
        <div class="side">
            <SideBar></SideBar>
        </div>
        <main class="main-mock"></main>
    </div>

    <StatusBar position="bottom"></StatusBar>
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
    }

    .side {
        display: grid;
        grid-template-columns: var(--side-width, 64px);
        align-self: flex-start;
    }

    .main-mock {
        flex: 1;
    }
</style>
