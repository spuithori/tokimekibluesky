import { describe, expect, it } from 'vitest';
import { contrastRatio, hexToOklch, oklchToHex } from './color';
import { DEFAULT_SEEDS, deriveTheme, type Seeds } from './derive';
import { validateThemeRecord } from '../format';

const SEED_COLORS = ['#f182ac', '#5b8def', '#2fa37d', '#e0882b', '#bfae20', '#000000', '#ffffff', '#7a1fff', '#808080'];
const BACKGROUNDS = ['#f6e9ef', '#ffffff', '#e0f1f1', '#fdf6e3', '#1b2a3d', '#000000', '#ff0000'];

const valueOf = (list: Array<{ name: string; value: string }>, name: string) => list.find((t) => t.name === name)?.value as string;

describe('color', () => {
    it('hex と OKLCH は往復で元の色に戻る', () => {
        for (const hex of ['#f182ac', '#000000', '#ffffff', '#1b2a3d', '#7a1fff', '#808080']) {
            expect(oklchToHex(hexToOklch(hex))).toBe(hex);
        }
    });

    it('色域の外の色は彩度を落として表せる色にする', () => {
        const hex = oklchToHex({ l: 0.7, c: 0.4, h: 150 });
        expect(hex).toMatch(/^#[0-9a-f]{6}$/);
        expect(hexToOklch(hex).c).toBeLessThan(0.4);
    });

    it('コントラスト比は WCAG の定義どおり', () => {
        expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
        expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
    });
});

describe('deriveTheme', () => {
    const combos: Seeds[] = SEED_COLORS.flatMap((accent) => BACKGROUNDS.map((background) => ({ ...DEFAULT_SEEDS, accent, background })));

    it('どの基準色からでも、公開時と同じ検証を通るテーマになる', () => {
        for (const seeds of combos) {
            for (const layout of ['joined', 'separate'] as const) {
                for (const surface of ['solid', 'glass'] as const) {
                    const derived = deriveTheme({ ...seeds, layout, surface });
                    const result = validateThemeRecord({ name: 'x', version: '1', createdAt: '2026-10-07T00:00:00.000Z', tokens: derived.tokens, dark: derived.dark });
                    expect(result.ok, JSON.stringify({ seeds, errors: result.ok ? [] : result.errors })).toBe(true);
                }
            }
        }
    });

    it('本文の文字と面のコントラストは、ライトでもダークでも 7:1 以上', () => {
        for (const seeds of combos) {
            const { tokens, dark } = deriveTheme(seeds);
            expect(contrastRatio(valueOf(tokens, '--text-color-1'), valueOf(tokens, '--bg-color-1'))).toBeGreaterThanOrEqual(7);
            expect(contrastRatio(valueOf(dark, '--text-color-1'), valueOf(dark, '--bg-color-1'))).toBeGreaterThanOrEqual(7);
            expect(contrastRatio(valueOf(tokens, '--text-color-2'), valueOf(tokens, '--bg-color-1'))).toBeGreaterThanOrEqual(4.5);
            expect(contrastRatio(valueOf(dark, '--text-color-2'), valueOf(dark, '--bg-color-1'))).toBeGreaterThanOrEqual(4.5);
        }
    });

    it('ダークのアクセントは面の上で 3:1 以上になるよう明るくする', () => {
        for (const seeds of combos) {
            const { dark } = deriveTheme(seeds);
            expect(contrastRatio(valueOf(dark, '--primary-color'), valueOf(dark, '--bg-color-1'))).toBeGreaterThanOrEqual(3);
        }
    });

    it('アクセントの上の文字は、白と黒のうち読みやすい方を選ぶ', () => {
        for (const accent of SEED_COLORS) {
            const { tokens } = deriveTheme({ ...DEFAULT_SEEDS, accent });
            const on = valueOf(tokens, '--on-accent');
            const other = on === '#ffffff' ? '#111111' : '#ffffff';
            expect(contrastRatio(on, accent)).toBeGreaterThanOrEqual(contrastRatio(other, accent));
        }
    });

    it('文字色を指定したときはその色を使う', () => {
        const { tokens } = deriveTheme({ ...DEFAULT_SEEDS, text: '#123456' });
        expect(valueOf(tokens, '--text-color-1')).toBe('#123456');
    });

    it('触った項目だけをトークンにする(何も触らなければ何も書き出さない)', () => {
        expect(deriveTheme({})).toEqual({ tokens: [], dark: [] });
        const onlyRadius = deriveTheme({ radius: 12 });
        expect(onlyRadius.tokens.map((t) => t.name)).toEqual(['--radius-control', '--radius-card', '--radius-overlay']);
        expect(onlyRadius.dark).toEqual([]);
        const onlyAccent = deriveTheme({ accent: '#5b8def' }, { accent: '#f182ac', background: '#e0f1f1', radius: 8 });
        expect(valueOf(onlyAccent.tokens, '--primary-color')).toBe('#5b8def');
        expect(valueOf(onlyAccent.tokens, '--base-bg-color')).toBe('#e0f1f1');
    });

    it('カラムをつなげるときは間隔と角丸をなくし、角丸は外枠の上の角に効かせる', () => {
        const joined = deriveTheme({ ...DEFAULT_SEEDS, layout: 'joined', radius: 8 }).tokens;
        expect([valueOf(joined, '--decks-gap'), valueOf(joined, '--deck-border-radius'), valueOf(joined, '--decks-border-radius')]).toEqual(['0', '0', '8px 8px 0 0']);
        const separate = deriveTheme({ ...DEFAULT_SEEDS, layout: 'separate', radius: 12 }).tokens;
        expect([valueOf(separate, '--decks-gap'), valueOf(separate, '--deck-border-radius'), valueOf(separate, '--decks-border')]).toEqual(['8px', '12px', 'none']);
    });
});

describe('cssColorToHex', () => {
    it('ブラウザが返す rgb()・color(srgb …)・16進のどれも16進にそろえる', async () => {
        const { cssColorToHex } = await import('./color');
        expect(cssColorToHex('rgb(241, 130, 172)')).toBe('#f182ac');
        expect(cssColorToHex('rgba(241, 130, 172, 0.5)')).toBe('#f182ac');
        expect(cssColorToHex('color(srgb 1 0.5 0)')).toBe('#ff8000');
        expect(cssColorToHex('#f182ac')).toBe('#f182ac');
        expect(cssColorToHex('linear-gradient(red, blue)')).toBeNull();
    });
});
