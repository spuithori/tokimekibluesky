<script lang="ts">
    import { riceState } from '$lib/rice/riceState.svelte';
    import { riceModuleHost } from '$lib/rice/modules/host.svelte';
    import { builtinModules } from '$lib/rice/modules/builtin';
    import { registerInstalledPlugins } from '$lib/rice/plugins/store.svelte';
    import { pluginState } from '$lib/plugins/state.svelte';
    import { WIDGET_ONLY_IDS } from '$lib/rice/widgetIds';

    for (const manifest of builtinModules) {
        riceModuleHost.register(manifest);
    }

    void registerInstalledPlugins();

    $effect(() => {
        const configured = riceState.compiled.modules;
        const specs = Object.values(riceState.compiled.bars).flat()
            .filter((bar) => bar.kind === 'rice')
            .flatMap((bar) => [
                ...(bar.itemSpecs ?? (bar.items ?? []).map((id) => ({ id, base: id.split('#')[0], options: {} }))),
                ...(bar.tabSets ?? []).flatMap((tabSet) => tabSet.items),
            ]);
        for (const [id, entry] of riceModuleHost.entries) {
            if (id.startsWith('plugin:')) {
                riceModuleHost.setWanted(id, pluginState.isEnabled(id.slice('plugin:'.length)));
                continue;
            }
            const explicit = configured[id]?.enable;
            const contributes = entry.manifest.contributes;
            const referenced = specs.some((spec) =>
                contributes?.statusbarItems?.some((item) => item.id === spec.base)
                || (contributes?.widgets?.some((widget) => widget.id === spec.base)
                    && ((WIDGET_ONLY_IDS as readonly string[]).includes(spec.base) || Object.keys(spec.options).length > 0)),
            );
            riceModuleHost.setWanted(id, riceState.enabled && (explicit ?? referenced));
        }
    });
</script>
