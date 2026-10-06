import { describe, expect, it } from 'vitest';
import { convertLegacyTheme, parseDeclarations, type LegacyTheme } from './legacy';
import { compileThemeStyle } from './format';
import { installedFromLegacy } from './installed';
import { OFFICIAL_THEME_DID, themeUri } from './format';

function finalValues(style: string): Map<string, string> {
    const map = new Map<string, string>();
    for (const t of parseDeclarations(style)) map.set(t.name, t.value);
    return map;
}

const legacy: LegacyTheme = {
    id: '11ebee9d-aeee-48ad-9bd1-3cdb15fec8ef',
    name: 'Legacy',
    style: '--a:#fff;--b:linear-gradient(90deg, red 0%, blue 100%);--c:var(--a);--deck-content-bg-color:#fff;',
    options: {
        colors: [
            { id: 'c1', name: 'One', colorCode: '#111', code: '--primary-color:#111;--b:red;' },
            { id: 'c2', name: 'Two', colorCode: '#222', code: '--primary-color:#222;--deck-heading-bubble-color:#eee;' },
        ],
        darkmodeStyle: '--a:#000;--c:#333;',
        bubbleStyle: '--deck-content-bg-color:transparent;--bubble-bg-color:var(--bg-color-2);--decks-gap:12px;',
    },
    author: 'holybea',
    version: '1.0',
    created_at: '2024-01-01 00:00:00+00',
};

describe('parseDeclarations', () => {
    it('括弧と引用符の中のセミコロンで区切らない', () => {
        expect(parseDeclarations('--a:linear-gradient(red,blue);--b:"x;y";color:red;--c:')).toEqual([
            { name: '--a', value: 'linear-gradient(red,blue)' },
            { name: '--b', value: '"x;y"' },
        ]);
    });
});

describe('convertLegacyTheme', () => {
    it('旧形式の連結(style + 色 + ダーク)と同じ最終値になる', () => {
        const record = convertLegacyTheme(legacy);
        for (const color of legacy.options!.colors!) {
            for (const dark of [false, true]) {
                const old = legacy.style + (color.code ?? '') + (dark ? legacy.options!.darkmodeStyle : '');
                const expected = finalValues(old);
                const actual = finalValues(compileThemeStyle(record, { variant: color.id, dark }));
                for (const [name, value] of expected) {
                    if (name === '--deck-heading-bubble-color') expect(actual.get('--bubble-heading-bg-color')).toBe(value);
                    else expect(actual.get(name)).toBe(value);
                }
            }
        }
    });

    it('旧 bubbleStyle からはバブル専用のトークンだけを残す(カラムまわりはアプリ側のバブル表示が担う)', () => {
        const names = convertLegacyTheme(legacy).tokens.map((t) => t.name);
        expect(names).toContain('--bubble-bg-color');
        expect(names.filter((n) => n === '--deck-content-bg-color')).toHaveLength(1);
        expect(names).not.toContain('--decks-gap');
    });

    it('旧 --deck-heading-bubble-color は見出しと一列表示の面に移し、モーダルページ用の不透明な面には使わない', () => {
        const tokens = convertLegacyTheme(legacy).variants!.find((v) => v.key === 'c2')!.tokens.map((t) => t.name);
        expect(tokens).toEqual(expect.arrayContaining(['--bubble-heading-bg-color', '--bubble-single-bg-color']));
        expect(tokens).not.toContain('--deck-heading-bubble-color');
        expect(tokens).not.toContain('--bubble-canvas');
    });

    it('ダーク無効・色なしは、それぞれ dark と variants を持たない', () => {
        const record = convertLegacyTheme({ ...legacy, options: { darkmodeDisabled: 'true', colors: [] } });
        expect(record.dark).toBeUndefined();
        expect(record.variants).toBeUndefined();
    });
});

describe('installedFromLegacy', () => {
    it('公式に移したテーマは公式の at-uri へ付け替え、それ以外は元の id のまま使える', () => {
        expect(installedFromLegacy(legacy)?.id).toBe(themeUri(OFFICIAL_THEME_DID, 'monstera'));
        expect(installedFromLegacy({ ...legacy, id: 'unknown-uuid' })?.id).toBe('unknown-uuid');
    });
});
