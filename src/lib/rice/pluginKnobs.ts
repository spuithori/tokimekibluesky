import type { CompiledRice } from './config/model';
import { setValueInText } from './config/edit';
import type { RiceKnob } from './knobs';
import { numberOf, type RicePluginSettingItem } from './plugins/settingsSchema';

function kindOf(type: RicePluginSettingItem['type']): RiceKnob['kind'] {
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

export function pluginKnobsFromSchema(id: string, schema: readonly RicePluginSettingItem[]): RiceKnob[] {
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
        read: (compiled: CompiledRice) => compiled.plugins[id]?.options[item.key],
        write: (config: string, value: string) => setValueInText(config, [{ name: `plugin:${id}` }], item.key, value),
    }));
}
