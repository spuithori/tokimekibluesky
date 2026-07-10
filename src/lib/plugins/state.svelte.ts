import { settingsStore } from '$lib/settings/settings.svelte';
import { pluginSettingsRegistry } from '$lib/rice/modules/registries.svelte';
import { schemaDefaults } from '$lib/rice/plugins/settingsSchema';
import type { PluginStateEntry } from '$lib/settings/types';

class PluginState {
    isEnabled(id: string): boolean {
        return settingsStore.plugins.state[id]?.enabled ?? false;
    }

    config(id: string): PluginStateEntry {
        const entry = settingsStore.plugins.state[id];
        const schema = pluginSettingsRegistry.get(id);
        return {
            enabled: entry?.enabled ?? false,
            options: { ...(schema ? schemaDefaults(schema) : {}), ...entry?.options },
        };
    }

    set(id: string, entry: PluginStateEntry): void {
        settingsStore.plugins.state[id] = entry;
    }

    setEnabled(id: string, enabled: boolean): void {
        const entry = settingsStore.plugins.state[id];
        if (entry) entry.enabled = enabled;
        else settingsStore.plugins.state[id] = { enabled, options: {} };
    }

    setOption(id: string, key: string, value: string): void {
        const entry = settingsStore.plugins.state[id];
        if (entry) entry.options[key] = value;
        else settingsStore.plugins.state[id] = { enabled: false, options: { [key]: value } };
    }

    clear(id: string): void {
        delete settingsStore.plugins.state[id];
    }
}

export const pluginState = new PluginState();
