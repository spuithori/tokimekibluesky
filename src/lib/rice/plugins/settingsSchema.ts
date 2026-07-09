export const PLUGIN_SETTING_TYPES = ['boolean', 'number', 'string', 'enum', 'color', 'length'] as const;

export type RicePluginSettingType = (typeof PLUGIN_SETTING_TYPES)[number];

export interface RicePluginSettingOption {
    value: string;
    label: string;
}

export interface RicePluginSettingItem {
    key: string;
    type: RicePluginSettingType;
    label: string;
    default?: string;
    description?: string;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    options?: RicePluginSettingOption[];
}

export function numberOf(value: number | string | undefined): number | undefined {
    if (value === undefined) return undefined;
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
}

export type PluginSettingsSchemas = ReadonlyMap<string, readonly RicePluginSettingItem[]>;

const SETTING_KEY_RE = /^[a-zA-Z0-9][\w-]*$/;
const LENGTH_RE = /^-?\d*\.?\d+px$/;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateSettingsSchema(value: unknown): string | undefined {
    if (!Array.isArray(value)) return 'settings は配列である必要があります';
    const seen = new Set<string>();
    for (const item of value) {
        if (!isRecord(item)) return 'settings の要素はオブジェクトである必要があります';
        if (typeof item.key !== 'string' || !SETTING_KEY_RE.test(item.key)) return `settings の key が不正です: ${String(item.key)}`;
        if (seen.has(item.key)) return `settings の key が重複しています: ${item.key}`;
        seen.add(item.key);
        if (item.key === 'enable') return 'settings の key に enable は使えません(予約語)';
        if (typeof item.type !== 'string' || !PLUGIN_SETTING_TYPES.includes(item.type as RicePluginSettingType)) {
            return `settings.${item.key} の type が不正です(${PLUGIN_SETTING_TYPES.join(' | ')})`;
        }
        if (typeof item.label !== 'string' || item.label.length === 0) return `settings.${item.key} に label が必要です`;
        if (item.default !== undefined && typeof item.default !== 'string') return `settings.${item.key} の default は文字列表現である必要があります`;
        for (const bound of ['min', 'max', 'step'] as const) {
            if (item[bound] !== undefined && numberOf(item[bound] as number | string) === undefined) {
                return `settings.${item.key} の ${bound} は数値または数値文字列である必要があります`;
            }
        }
        if (item.type === 'enum') {
            if (!Array.isArray(item.options) || item.options.length === 0) return `settings.${item.key} の enum には options が必要です`;
            for (const option of item.options) {
                if (!isRecord(option) || typeof option.value !== 'string' || typeof option.label !== 'string') {
                    return `settings.${item.key} の options が不正です`;
                }
            }
        }
    }
    return undefined;
}

export function schemaDefaults(schema: readonly RicePluginSettingItem[]): Record<string, string> {
    const out: Record<string, string> = {};
    for (const item of schema) {
        if (item.default !== undefined) out[item.key] = item.default;
    }
    return out;
}

export function validateSettingValue(item: RicePluginSettingItem, value: string): string | undefined {
    switch (item.type) {
        case 'boolean':
            return value === 'true' || value === 'false' ? undefined : `${item.key} は true か false です`;
        case 'number': {
            const parsed = Number(value);
            if (!Number.isFinite(parsed)) return `${item.key} は数値です`;
            const min = numberOf(item.min);
            const max = numberOf(item.max);
            if (min !== undefined && parsed < min) return `${item.key} は ${min} 以上です`;
            if (max !== undefined && parsed > max) return `${item.key} は ${max} 以下です`;
            return undefined;
        }
        case 'length':
            return LENGTH_RE.test(value) ? undefined : `${item.key} は px 単位の長さです(例: 12px)`;
        case 'enum':
            return item.options?.some((option) => option.value === value)
                ? undefined
                : `${item.key} は ${item.options?.map((option) => option.value).join(' | ')} のいずれかです`;
        case 'color':
        case 'string':
            return undefined;
    }
}
