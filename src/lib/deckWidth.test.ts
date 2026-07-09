import { describe, it, expect } from 'vitest';
import {
    tilePxForWeight, clampShellWidth, parseShellWidthPx, SHELL_WIDTH_MIN, SHELL_WIDTH_MAX,
    clampWidth, clampDeckWidth, clampSingleWidth,
    resolveDeckWidthPx, tileWeightForTargetWidth,
    DECK_WIDTH_MIN, DECK_WIDTH_MAX, DECK_WIDTH_DEFAULT,
    SINGLE_WIDTH_MIN, SINGLE_WIDTH_MAX,
} from './deckWidth';

describe('clampWidth', () => {
    it('min/max でクランプし整数に丸める', () => {
        expect(clampWidth(100, 240, 1200)).toBe(240);
        expect(clampWidth(5000, 240, 1200)).toBe(1200);
        expect(clampWidth(400.6, 240, 1200)).toBe(401);
    });

    it('非数(NaN/Infinity)は min にフォールバック', () => {
        expect(clampWidth(NaN, 240, 1200)).toBe(240);
        expect(clampWidth(Infinity, 240, 1200)).toBe(1200);
    });
});

describe('clampDeckWidth / clampSingleWidth', () => {
    it('deck は 240〜1200', () => {
        expect(clampDeckWidth(0)).toBe(DECK_WIDTH_MIN);
        expect(clampDeckWidth(9999)).toBe(DECK_WIDTH_MAX);
        expect(clampDeckWidth(500)).toBe(500);
    });

    it('single は 360〜1000', () => {
        expect(clampSingleWidth(0)).toBe(SINGLE_WIDTH_MIN);
        expect(clampSingleWidth(9999)).toBe(SINGLE_WIDTH_MAX);
        expect(clampSingleWidth(700)).toBe(700);
    });
});

describe('resolveDeckWidthPx', () => {
    it('number はそのまま', () => {
        expect(resolveDeckWidthPx(640)).toBe(640);
    });

    it('プリセット文字列は px へ', () => {
        expect(resolveDeckWidthPx('medium')).toBe(400);
        expect(resolveDeckWidthPx('xxl')).toBe(550);
        expect(resolveDeckWidthPx('xxs')).toBe(280);
    });

    it('未定義/不明は medium(=400)/default', () => {
        expect(resolveDeckWidthPx(undefined)).toBe(400);
        expect(resolveDeckWidthPx(null)).toBe(400);
        expect(resolveDeckWidthPx('nope' as any)).toBe(DECK_WIDTH_DEFAULT);
    });
});

describe('tileWeightForTargetWidth (タイル幅→重み逆算)', () => {
    it('往復整合: 解いた重みを幅式に戻すと目標幅を再現する', () => {
        const W = 1200;
        const others = 800;
        const w = tileWeightForTargetWidth(600, others, W);
        expect(w).toBe(800);
        expect((W * w) / (w + others)).toBeCloseTo(600, 5);
    });

    it('目標幅に対して単調増加', () => {
        let prev = 0;
        for (const t of [300, 400, 500, 600, 700]) {
            const w = tileWeightForTargetWidth(t, 800, 1200);
            expect(w).toBeGreaterThanOrEqual(prev);
            prev = w;
        }
    });

    it('結果は DECK_WIDTH_MIN..MAX にクランプされる', () => {
        expect(tileWeightForTargetWidth(10, 800, 1200)).toBe(DECK_WIDTH_MIN);
        expect(tileWeightForTargetWidth(1190, 800, 1200)).toBe(DECK_WIDTH_MAX);
        expect(tileWeightForTargetWidth(5000, 800, 1200)).toBe(DECK_WIDTH_MAX);
    });

    it('ガード: 非有限・others<=0・container<=2 は既定重み', () => {
        expect(tileWeightForTargetWidth(NaN, 800, 1200)).toBe(DECK_WIDTH_DEFAULT);
        expect(tileWeightForTargetWidth(600, 0, 1200)).toBe(DECK_WIDTH_DEFAULT);
        expect(tileWeightForTargetWidth(600, -5, 1200)).toBe(DECK_WIDTH_DEFAULT);
        expect(tileWeightForTargetWidth(600, 800, 0)).toBe(DECK_WIDTH_DEFAULT);
        expect(tileWeightForTargetWidth(600, 800, Infinity)).toBe(DECK_WIDTH_DEFAULT);
    });
});

describe('tilePxForWeight', () => {
    it('tileWeightForTargetWidth とラウンドトリップする', () => {
        const weight = tileWeightForTargetWidth(600, 800, 1200);
        expect(tilePxForWeight(weight, 800, 1200)).toBeCloseTo(600, 0);
        const weight2 = tileWeightForTargetWidth(450, 500, 1000);
        expect(tilePxForWeight(weight2, 500, 1000)).toBeCloseTo(450, 0);
    });

    it('ガード: 非有限・weight<=0・container<=0 は既定値', () => {
        expect(tilePxForWeight(NaN, 800, 1200)).toBe(DECK_WIDTH_DEFAULT);
        expect(tilePxForWeight(0, 800, 1200)).toBe(DECK_WIDTH_DEFAULT);
        expect(tilePxForWeight(400, 800, 0)).toBe(DECK_WIDTH_DEFAULT);
    });
});

describe('shell width helpers', () => {
    it('clampShellWidth は範囲へクランプする', () => {
        expect(clampShellWidth(1240)).toBe(1240);
        expect(clampShellWidth(100)).toBe(SHELL_WIDTH_MIN);
        expect(clampShellWidth(9999)).toBe(SHELL_WIDTH_MAX);
    });

    it('parseShellWidthPx は px のみ解釈し他は null', () => {
        expect(parseShellWidthPx('1240px')).toBe(1240);
        expect(parseShellWidthPx(' 720px ')).toBe(720);
        expect(parseShellWidthPx('80rem')).toBeNull();
        expect(parseShellWidthPx('90vw')).toBeNull();
        expect(parseShellWidthPx(undefined)).toBeNull();
        expect(parseShellWidthPx('')).toBeNull();
    });
});
