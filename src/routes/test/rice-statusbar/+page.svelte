<script lang="ts">
    import '../../styles.css';
    import StatusBar from '$lib/components/rice/StatusBar.svelte';
    import RiceModulesObserver from '$lib/components/rice/RiceModulesObserver.svelte';
    import Decks from '../../(app)/Decks.svelte';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { getColumnState, initColumns } from '$lib/classes/columnState.svelte';
    import { defaultThemeInline } from '$lib/test-fixtures/defaultThemeInline';

    initColumns();
    const columnState = getColumnState(false);

    $effect(() => {
        if (columnState.slots.length === 0) {
            columnState.add({
                id: 'rice-test-clock',
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
        (window as any).__riceStatusbarTest = {
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
            addColumn() {
                columnState.add({
                    id: `rice-test-extra-${columnState.columns.length}`,
                    algorithm: { type: 'module:clock', name: `Clock ${columnState.columns.length}` },
                    style: 'default',
                    did: '',
                    settings: { width: 'medium' },
                    data: { cursor: '' },
                } as any);
            },
            getMetrics() {
                return {
                    scrollHeight: document.documentElement.scrollHeight,
                    clientHeight: document.documentElement.clientHeight,
                    innerHeight: window.innerHeight,
                    statusbarCount: document.querySelectorAll('.rice-statusbar').length,
                    statusbarHeights: [...document.querySelectorAll('.rice-statusbar')].map(
                        (el) => el.getBoundingClientRect().height,
                    ),
                    deckHeight: document.querySelector('.deck')?.getBoundingClientRect().height ?? null,
                };
            },
        };
    }
</script>

<RiceModulesObserver></RiceModulesObserver>

<div class="app-mock" style={(riceState.themeReset ? '' : themeStyle) + riceState.globalStyle}>
    <StatusBar position="top"></StatusBar>

    <div class="wrap-mock">
        <main class="main-mock">
            <Decks></Decks>
        </main>
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
    }

    .main-mock {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
    }
</style>
