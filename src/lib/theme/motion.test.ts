import { describe, expect, it } from 'vitest';
import { parseDuration, parseEasing } from './motion';

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
