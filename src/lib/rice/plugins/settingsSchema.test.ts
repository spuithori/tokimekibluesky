import { describe, it, expect } from 'vitest';
import { compile } from '../config/compile';
import { pluginKnobsFromSchema } from '../pluginKnobs';
import { pluginState } from '$lib/plugins/state.svelte';
import { settingsStore } from '$lib/settings/settings.svelte';
import { resetSettings } from '$lib/test-fixtures/settingsTestUtils';
import { schemaDefaults, validateSettingValue, validateSettingsSchema, type RicePluginSettingItem } from './settingsSchema';

const schema: RicePluginSettingItem[] = [
    { key: 'intensity', type: 'number', label: 'Intensity', default: '0.4', min: '0', max: '1', step: '0.05' },
    { key: 'palette', type: 'enum', label: 'Palette', default: 'aurora', options: [{ value: 'aurora', label: 'Aurora' }, { value: 'sunset', label: 'Sunset' }] },
    { key: 'glow', type: 'boolean', label: 'Glow', default: 'true' },
    { key: 'tint', type: 'color', label: 'Tint' },
    { key: 'offset', type: 'length', label: 'Offset', default: '12px' },
];

const schemas = new Map([['aurora', schema]]);

describe('validateSettingsSchema', () => {
    it('正しいスキーマを受理する', () => {
        expect(validateSettingsSchema(schema)).toBeUndefined();
    });

    it('enable キーを予約語として拒否する', () => {
        expect(validateSettingsSchema([{ key: 'enable', type: 'boolean', label: 'x' }])).toMatch(/予約語/);
    });

    it('key の重複を拒否する', () => {
        expect(validateSettingsSchema([schema[0], schema[0]])).toMatch(/重複/);
    });

    it('options なしの enum を拒否する', () => {
        expect(validateSettingsSchema([{ key: 'a', type: 'enum', label: 'A' }])).toMatch(/options が必要/);
    });

    it('未知の type を拒否する', () => {
        expect(validateSettingsSchema([{ key: 'a', type: 'json', label: 'A' }])).toMatch(/type が不正/);
    });

    it('min/max/step は数値文字列を受理する(atproto は float を書けないため)', () => {
        expect(validateSettingsSchema([{ key: 'a', type: 'number', label: 'A', min: '0', max: '1', step: '0.05' }])).toBeUndefined();
    });

    it('数値として解釈できない min を拒否する', () => {
        expect(validateSettingsSchema([{ key: 'a', type: 'number', label: 'A', min: 'low' }])).toMatch(/min は数値/);
    });
});

describe('validateSettingValue', () => {
    it.each([
        ['number 範囲内', schema[0], '0.8', undefined],
        ['number 範囲外', schema[0], '2', /1 以下/],
        ['number 非数', schema[0], 'abc', /数値/],
        ['enum 既知', schema[1], 'sunset', undefined],
        ['enum 未知', schema[1], 'neon', /aurora \| sunset/],
        ['boolean true', schema[2], 'true', undefined],
        ['boolean 不正', schema[2], 'yes', /true か false/],
        ['length px', schema[4], '24px', undefined],
        ['length 単位なし', schema[4], '24', /px 単位/],
    ])('%s', (_name, item, value, expected) => {
        const result = validateSettingValue(item as RicePluginSettingItem, value as string);
        if (expected === undefined) expect(result).toBeUndefined();
        else expect(result).toMatch(expected as RegExp);
    });
});

describe('schemaDefaults', () => {
    it('default を持つキーだけを返す', () => {
        expect(schemaDefaults(schema)).toEqual({ intensity: '0.4', palette: 'aurora', glow: 'true', offset: '12px' });
    });
});

describe('compile: plugin セクションの廃止', () => {
    it('plugin: セクションは廃止 warning になり適用されない', () => {
        const out = compile('plugin:aurora {\n    enable = true\n    bogus = 1\n}\n');
        expect(out.diagnostics).toHaveLength(1);
        expect(out.diagnostics[0].severity).toBe('warning');
        expect(out.diagnostics[0].message).toContain('廃止');
    });
});

describe('pluginKnobsFromSchema', () => {
    const knobs = pluginKnobsFromSchema('aurora', schema);

    it('type を kind へ写像する', () => {
        expect(knobs.map((k) => k.kind)).toEqual(['number', 'select', 'toggle', 'color', 'length']);
    });

    it('read は pluginState の options を引く', () => {
        resetSettings();
        pluginState.setOption('aurora', 'intensity', '0.7');
        expect(knobs[0].read()).toBe('0.7');
    });

    it('write は pluginState へ書き、enabled を立てない', () => {
        resetSettings();
        knobs[1].write('sunset');
        expect(settingsStore.plugins.state['aurora']).toEqual({ enabled: false, options: { palette: 'sunset' } });
        expect(knobs[1].read()).toBe('sunset');
    });

    it('default が無いキーは type ごとの fallback を持つ', () => {
        expect(knobs[3].fallback).toBe('#000000');
    });
});
