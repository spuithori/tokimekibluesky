import { describe, it, expect } from 'vitest';
import { compile } from '../config/compile';
import { pluginKnobsFromSchema } from '../pluginKnobs';
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

describe('compile: plugin セクションの診断', () => {
    it('schema があるとき未知キーを warning にする', () => {
        const out = compile('plugin:aurora {\n    enable = true\n    bogus = 1\n}\n', undefined, () => false, schemas);
        const diag = out.diagnostics.filter((d) => d.message.includes('bogus'));
        expect(diag).toHaveLength(1);
        expect(diag[0].severity).toBe('warning');
        expect(out.plugins['aurora'].options.bogus).toBe('1');
    });

    it('schema があるとき不正な値を error にする', () => {
        const out = compile('plugin:aurora {\n    intensity = 5\n    palette = neon\n}\n', undefined, () => false, schemas);
        const errors = out.diagnostics.filter((d) => d.severity === 'error');
        expect(errors).toHaveLength(2);
        expect(errors[0].message).toMatch(/intensity/);
        expect(errors[1].message).toMatch(/palette/);
    });

    it('正しい値では診断が出ない', () => {
        const out = compile('plugin:aurora {\n    intensity = 0.9\n    palette = sunset\n    glow = false\n}\n', undefined, () => false, schemas);
        expect(out.diagnostics).toHaveLength(0);
        expect(out.plugins['aurora'].options).toEqual({ intensity: '0.9', palette: 'sunset', glow: 'false' });
    });

    it('schema が無いプラグインでは診断を出さない(sideload の現行挙動を維持)', () => {
        const out = compile('plugin:unknown {\n    whatever = 1\n}\n', undefined, () => false, schemas);
        expect(out.diagnostics).toHaveLength(0);
        expect(out.plugins['unknown'].options.whatever).toBe('1');
    });

    it('pluginSchemas を渡さない従来の呼び出しでは診断を出さない', () => {
        const out = compile('plugin:aurora {\n    bogus = 1\n}\n');
        expect(out.diagnostics).toHaveLength(0);
    });
});

describe('pluginKnobsFromSchema', () => {
    const knobs = pluginKnobsFromSchema('aurora', schema);

    it('type を kind へ写像する', () => {
        expect(knobs.map((k) => k.kind)).toEqual(['number', 'select', 'toggle', 'color', 'length']);
    });

    it('read は compiled の options を引く', () => {
        const compiled = compile('plugin:aurora {\n    intensity = 0.7\n}\n', undefined, () => false, schemas);
        expect(knobs[0].read(compiled)).toBe('0.7');
    });

    it('write は plugin セクションへ書き戻す', () => {
        const next = knobs[1].write('plugin:aurora {\n    enable = true\n}\n', 'sunset');
        expect(next).toContain('palette = sunset');
        const compiled = compile(next, undefined, () => false, schemas);
        expect(compiled.plugins['aurora'].options.palette).toBe('sunset');
        expect(compiled.diagnostics).toHaveLength(0);
    });

    it('default が無いキーは type ごとの fallback を持つ', () => {
        expect(knobs[3].fallback).toBe('#000000');
    });
});
