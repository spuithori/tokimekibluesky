<script lang="ts">
    import '../../styles.css';
    import PageModal from '$lib/components/ui/PageModal.svelte';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { defaultThemeInline } from '$lib/test-fixtures/defaultThemeInline';

    const themeStyle = defaultThemeInline();
    const appStyle = $derived((riceState.themeReset ? '' : themeStyle) + riceState.globalStyle);

    if (typeof window !== 'undefined') {
        (window as any).__pageModalTest = {
            ready: true,
            setRiceConfig(config: string) {
                settingsStore.rice.enabled = true;
                settingsStore.rice.config = config;
            },
            setDesignLayout(value: 'decks' | 'default') {
                settingsStore.design.layout = value;
            },
        };
    }
</script>

<div class="app app-mock" class:single={riceState.layoutStyle === 'single'} style={appStyle}>
    <div class="wrap wrap-mock" class:layout-decks={riceState.layoutStyle === 'deck'}>
        <main class="main-mock">
            <PageModal>
                <div class="column-heading">
                    <p>Probe Page</p>
                </div>
                <div class="probe-body">
                    {#each Array.from({ length: 40 }, (_, i) => i) as i (i)}
                        <p class="probe-line">page content line {i + 1}</p>
                    {/each}
                </div>
            </PageModal>
        </main>
    </div>
</div>

<style>
    :global(body) {
        margin: 0;
    }

    .app-mock {
        min-height: 100dvh;
        background-color: var(--app-bg-color);
        color: var(--app-color);
    }

    .probe-body {
        padding: 16px;
    }

    .probe-line {
        padding: 12px 0;
        border-bottom: 1px solid var(--border-color-2);
    }
</style>
