import { describe, expect, it } from 'vitest';
import { opacityAsLayers, parseDuration, parseEasing, withoutOpacity } from './motion';

describe('parseDuration', () => {
    it.each([
        ['250ms', 250],
        ['.25s', 250],
        [' 0s ', 0],
        ['1.5s', 1500],
    ])('%s → %d ms', (value, ms) => {
        expect(parseDuration(value)).toBe(ms);
    });

    it.each(['', '250', '-1s', 'calc(1s)', 'fast'])('%s は解釈しない', (value) => {
        expect(parseDuration(value)).toBeUndefined();
    });
});

describe('parseEasing', () => {
    it('CSS の曲線と同じ値を返す', () => {
        const ease = parseEasing('ease')!;
        expect(ease(0)).toBe(0);
        expect(ease(1)).toBe(1);
        expect(ease(0.5)).toBeCloseTo(0.8024, 3);
        expect(parseEasing('linear')!(0.3)).toBeCloseTo(0.3, 6);
        const quint = parseEasing('cubic-bezier(.23, 1, .32, 1)')!;
        expect(quint(0.5)).toBeGreaterThan(0.9);
        const back = parseEasing('cubic-bezier(0.34, 1.56, 0.64, 1)')!;
        expect(Math.max(...[0.5, 0.6, 0.7, 0.8].map(back))).toBeGreaterThan(1);
    });

    it.each(['', 'steps(4)', 'cubic-bezier(2, 0, 0, 1)', 'cubic-bezier(0, 0, 1)', 'spring'])('%s は解釈しない', (value) => {
        expect(parseEasing(value)).toBeUndefined();
    });
});

describe('withoutOpacity', () => {
    it('fly と scale の CSS から不透明度だけを外す', () => {
        const fly = withoutOpacity({ css: (t, u) => `\n\t\t\ttransform:  translate(0px, ${u * 16}px);\n\t\t\topacity: ${1 - u}` });
        expect(fly.css!(0.5, 0.5)).not.toMatch(/opacity/);
        expect(fly.css!(0.5, 0.5)).toMatch(/transform:\s+translate\(0px, 8px\)/);
        const scaled = withoutOpacity({ css: (_t, u) => `transform: matrix(1, 0, 0, 1, 0, 0) scale(${1 - 0.02 * u}); opacity: 1` });
        expect(scaled.css!(0, 1)).toBe('transform: matrix(1, 0, 0, 1, 0, 0) scale(0.98);');
    });

    it('css の無い設定はそのまま返す', () => {
        const config = { duration: 0 };
        expect(withoutOpacity(config)).toBe(config);
    });
});

describe('opacityAsLayers', () => {
    it('不透明度を層に渡すカスタムプロパティへ置き換え、移動はそのまま残す', () => {
        const fly = opacityAsLayers({ css: (t, u) => `\n\t\t\ttransform:  translate(0px, ${u * 16}px);\n\t\t\topacity: ${t}` });
        const css = fly.css!(0.25, 0.75);
        expect(css).toMatch(/--overlay-opacity: 0.25/);
        expect(css).not.toMatch(/(^|[;\s])opacity:/);
        expect(css).toMatch(/translate\(0px, 12px\)/);
    });
});
