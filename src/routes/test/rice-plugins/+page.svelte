<script lang="ts">
    import '../../styles.css';
    import { Toaster } from 'svelte-sonner';
    import RiceModulesObserver from '$lib/components/rice/RiceModulesObserver.svelte';
    import RiceEffectLayers from '$lib/components/rice/RiceEffectLayers.svelte';
    import RicePluginsPanel from '$lib/components/rice/RicePluginsPanel.svelte';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { riceModuleHost } from '$lib/rice/modules/host.svelte';
    import { getColumnKind, listModuleColumnKinds } from '$lib/columnKindRegistry.svelte';
    import { runCommand } from '$lib/commands/registry.svelte';
    import { defaultThemeInline } from '$lib/test-fixtures/defaultThemeInline';

    let themeStyle = $state(defaultThemeInline());

    const pluginColumnKinds = $derived(listModuleColumnKinds().filter((def) => def.type.startsWith('plugin:')));

    if (typeof window !== 'undefined') {
        (window as any).__ricePluginsTest = {
            ready: true,
            setRiceConfig(config: string) {
                settingsStore.rice.enabled = true;
                settingsStore.rice.config = config;
            },
            getRiceConfig() {
                return settingsStore.rice.config;
            },
            diagnostics() {
                return JSON.parse(JSON.stringify(riceState.diagnostics));
            },
            entryStatus(id: string) {
                const entry = riceModuleHost.entries.get(`plugin:${id}`);
                return entry ? { status: entry.status, errorMessage: entry.errorMessage } : null;
            },
            installedPlugins() {
                return JSON.parse(JSON.stringify(settingsStore.rice.plugins ?? {}));
            },
            hasColumnKind(type: string) {
                return getColumnKind(type) !== undefined;
            },
            runCommand(id: string, arg?: string) {
                return runCommand(id, arg);
            },
        };
    }
</script>

<RiceModulesObserver></RiceModulesObserver>
<RiceEffectLayers></RiceEffectLayers>
<Toaster></Toaster>

<main class="rice-plugins-harness" data-testid="rice-plugins-harness" style={themeStyle + riceState.globalStyle}>
    <h1>rice plugins harness</h1>

    <section data-testid="plugins-panel">
        <RicePluginsPanel></RicePluginsPanel>
    </section>

    <section data-testid="plugin-columns">
        {#each pluginColumnKinds as def (def.type)}
            <div class="plugin-column" data-testid="plugin-column" data-type={def.type}>
                {#if def.loader}
                    {#await def.loader() then loaded}
                        {@const ColumnComponent = loaded.default}
                        <ColumnComponent options={riceState.pluginConfig(def.type.split(':')[1])?.options ?? {}}></ColumnComponent>
                    {:catch e}
                        <p data-testid="plugin-column-error">{e instanceof Error ? e.message : String(e)}</p>
                    {/await}
                {/if}
            </div>
        {/each}
    </section>
</main>

<style>
    .rice-plugins-harness {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 24px;
        max-width: 720px;
    }

    .plugin-column {
        border: 1px dashed var(--border-color-1, #ccc);
        border-radius: 8px;
        padding: 8px;
    }
</style>
