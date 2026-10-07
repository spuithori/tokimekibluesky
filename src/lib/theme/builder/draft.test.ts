import { describe, expect, it } from 'vitest';
import { composeRecord, previewRecord, type Draft } from './draft';
import { DEFAULT_SEEDS, deriveTheme } from './derive';
import { compileThemeStyle, validateThemeRecord, type ThemeRecord } from '../format';

const draft = (patch: Partial<Draft> = {}): Draft => ({
    id: 'd1',
    name: 'Test',
    description: '',
    version: '1.0',
    tokens: [{ name: '--bg-color-1', value: '#fafafa' }, { name: '--menu-bg-color', value: 'var(--bg-color-3)' }],
    dark: [{ name: '--bg-color-1', value: '#101010' }],
    variants: [],
    seeds: {},
    overrides: {},
    darkOverrides: {},
    images: [],
    createdAt: '2026-10-07T00:00:00.000Z',
    updatedAt: '2026-10-07T00:00:00.000Z',
    ...patch,
});

const valueOf = (tokens: Array<{ name: string; value: string }>, name: string) => tokens.filter((t) => t.name === name).map((t) => t.value);

describe('composeRecord', () => {
    it('かんたん編集を使っていなければ、元のテーマのトークンがそのまま残る', () => {
        const record = composeRecord(draft());
        expect(record.tokens).toEqual(draft().tokens);
        expect(record.dark).toEqual(draft().dark);
    });

    it('元のテーマ → かんたん編集 → 詳細編集の順に重なり、同じ名前は1つにまとまる', () => {
        const record = composeRecord(draft({ seeds: DEFAULT_SEEDS, overrides: { '--bg-color-1': '#123456' } }));
        expect(valueOf(record.tokens, '--bg-color-1')).toEqual(['#123456']);
        expect(valueOf(record.tokens, '--text-color-1')).toEqual([valueOf(deriveTheme(DEFAULT_SEEDS).tokens, '--text-color-1')[0]]);
        expect(valueOf(record.tokens, '--menu-bg-color')).toEqual(['var(--bg-color-3)']);
        expect(valueOf(record.dark!, '--bg-color-1')).toEqual([valueOf(deriveTheme(DEFAULT_SEEDS).dark, '--bg-color-1')[0]]);
    });

    it('未指定に戻したトークンは、元のテーマにあっても書き出さない', () => {
        const record = composeRecord(draft({ overrides: { '--menu-bg-color': null }, darkOverrides: { '--bg-color-1': null } }));
        expect(valueOf(record.tokens, '--menu-bg-color')).toEqual([]);
        expect(record.dark).toBeUndefined();
    });

    it('色の選択肢があるテーマでは、かんたん編集のアクセントは選択肢に任せて書き出さない', () => {
        const variants = [{ key: 'a', name: 'A', swatch: '#ff0000', tokens: [{ name: '--primary-color', value: '#ff0000' }] }];
        const record = composeRecord(draft({ seeds: DEFAULT_SEEDS, variants }));
        expect(valueOf(record.tokens, '--primary-color')).toEqual([]);
        expect(record.variants).toEqual(variants);
    });

    it('かんたん編集の結果は、公開時の検証を通る', () => {
        const record = composeRecord(draft({ seeds: DEFAULT_SEEDS }));
        expect(validateThemeRecord(record).ok).toBe(true);
    });
});

describe('previewRecord', () => {
    const variants = [
        { key: 'a', name: 'A', swatch: '#ff0000', tokens: [{ name: '--primary-color', value: '#ff0000' }] },
        { key: 'b', name: 'B', swatch: '#0000ff', tokens: [{ name: '--primary-color', value: '#0000ff' }] },
    ];
    const record = composeRecord(draft({ variants, dark: [{ name: '--bg-color-1', value: '#101010' }, { name: '--primary-color', value: '#00ff00' }] }));

    const effective = (style: string) => Object.fromEntries(style.split(';').filter(Boolean).map((decl) => [decl.slice(0, decl.indexOf(':')), decl.slice(decl.indexOf(':') + 1)]));

    it('ビルダーで選んだ色の選択肢とダークを、本来の適用順(基本 → 選択肢 → ダーク)で重ねたのと同じ値になる', () => {
        for (const dark of [true, false]) {
            for (const variant of ['a', 'b']) {
                const preview = compileThemeStyle(previewRecord(record, { dark, variant }) as ThemeRecord, { dark: false });
                expect(effective(preview)).toEqual(effective(compileThemeStyle(record as ThemeRecord, { dark, variant })));
            }
        }
        expect(effective(compileThemeStyle(previewRecord(record, { dark: true, variant: 'b' }) as ThemeRecord, { dark: false }))['--primary-color']).toBe('#00ff00');
    });

    it('利用者の設定がダークでも、ライトのプレビューにはダークの値を混ぜない', () => {
        const light = previewRecord(record, { dark: false, variant: 'a' }) as ThemeRecord;
        expect(compileThemeStyle(light, { dark: true })).toBe(compileThemeStyle(light, { dark: false }));
        expect(compileThemeStyle(light, { dark: false })).toContain('--bg-color-1:#fafafa');
    });
});
