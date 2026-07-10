import { pluginState } from '$lib/plugins/state.svelte';
import type { PluginKnob } from './knobs';
import { numberOf, type RicePluginSettingItem } from './plugins/settingsSchema';

function kindOf(type: RicePluginSettingItem['type']): PluginKnob['kind'] {
    switch (type) {
        case 'boolean':
            return 'toggle';
        case 'color':
            return 'color';
        case 'length':
            return 'length';
        case 'number':
            return 'number';
        case 'enum':
            return 'select';
        case 'string':
            return 'text';
    }
}

function fallbackOf(item: RicePluginSettingItem): string {
    if (item.default !== undefined) return item.default;
    switch (item.type) {
        case 'boolean':
            return 'false';
        case 'color':
            return '#000000';
        case 'length':
            return '0px';
        case 'number':
            return String(numberOf(item.min) ?? 0);
        case 'enum':
            return item.options?.[0]?.value ?? '';
        case 'string':
            return '';
    }
}

export function pluginKnobsFromSchema(id: string, schema: readonly RicePluginSettingItem[]): PluginKnob[] {
    return schema.map((item) => ({
        id: `plugin:${id}.${item.key}`,
        label: item.label,
        labelText: item.label,
        description: item.description,
        kind: kindOf(item.type),
        fallback: fallbackOf(item),
        min: numberOf(item.min),
        max: numberOf(item.max),
        step: numberOf(item.step),
        onValue: item.type === 'boolean' ? 'true' : undefined,
        offValue: item.type === 'boolean' ? 'false' : undefined,
        selectOptions: item.options,
        plugin: true,
        read: () => pluginState.config(id).options[item.key],
        write: (value: string) => pluginState.setOption(id, item.key, value),
    }));
}
