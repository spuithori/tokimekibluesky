import { describe, it, expect } from 'vitest';
import {
    clampWidth, clampDeckWidth, clampSingleWidth,
    resolveDeckWidthPx, resolveSingleWidthPx,
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

describe('resolveSingleWidthPx', () => {
    it('number はそのまま・プリセットは px', () => {
        expect(resolveSingleWidthPx(720)).toBe(720);
        expect(resolveSingleWidthPx('medium')).toBe(528);
        expect(resolveSingleWidthPx('large')).toBe(600);
        expect(resolveSingleWidthPx(undefined)).toBe(528);
    });
});
