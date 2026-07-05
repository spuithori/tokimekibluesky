import { describe, expect, it } from 'vitest';
import { EASING_FNS, cubicBezier, easingFnFor } from './easing';

describe('cubicBezier', () => {
    it('端点はf(0)=0 / f(1)=1(範囲外はクランプ)', () => {
        const fn = cubicBezier(0, 0, 0.58, 1);
        expect(fn(0)).toBe(0);
        expect(fn(1)).toBe(1);
        expect(fn(-0.5)).toBe(0);
        expect(fn(1.5)).toBe(1);
    });

    it('linear同値(x=y)は恒等関数', () => {
        const fn = cubicBezier(0.2, 0.2, 0.8, 0.8);
        expect(fn(0.3)).toBeCloseTo(0.3, 6);
        expect(fn(0.75)).toBeCloseTo(0.75, 6);
    });

    it('ease-outの既知値', () => {
        const fn = cubicBezier(0, 0, 0.58, 1);
        expect(fn(0.5)).toBeCloseTo(0.6846, 2);
    });

    it('ease-in-outは対称でf(0.5)=0.5', () => {
        const fn = cubicBezier(0.42, 0, 0.58, 1);
        expect(fn(0.5)).toBeCloseTo(0.5, 4);
    });

    it('easeは単調非減少', () => {
        const fn = cubicBezier(0.25, 0.1, 0.25, 1);
        let prev = fn(0);
        for (let i = 1; i <= 20; i++) {
            const next = fn(i / 20);
            expect(next).toBeGreaterThanOrEqual(prev - 1e-6);
            prev = next;
        }
    });

    it('y範囲外のオーバーシュートを許容する', () => {
        const fn = cubicBezier(0.34, 1.56, 0.64, 1);
        let max = 0;
        for (let i = 0; i <= 20; i++) {
            max = Math.max(max, fn(i / 20));
        }
        expect(max).toBeGreaterThan(1);
    });
});

describe('バウンス系easing(svelte/easing再利用)', () => {
    it('bounce / elastic / back は端点でf(0)=0 / f(1)=1', () => {
        for (const name of ['bounce', 'elastic', 'back']) {
            const fn = EASING_FNS[name];
            expect(fn(0)).toBeCloseTo(0, 6);
            expect(fn(1)).toBeCloseTo(1, 6);
        }
    });

    it('bounceは多段振動(0.8付近で一度1を離れて戻る)', () => {
        const fn = EASING_FNS.bounce;
        expect(fn(0.73)).toBeGreaterThan(0.95);
        expect(fn(0.8)).toBeLessThan(fn(0.73));
        expect(fn(1)).toBeCloseTo(1, 6);
    });

    it('backは1を超えるオーバーシュートを持つ', () => {
        const fn = EASING_FNS.back;
        let max = 0;
        for (let i = 0; i <= 40; i++) {
            max = Math.max(max, fn(i / 40));
        }
        expect(max).toBeGreaterThan(1);
    });
});

describe('easingFnFor', () => {
    const fallback = (t: number) => t * t;

    it('config未定義はfallback', () => {
        expect(easingFnFor(undefined, fallback)(0.5)).toBe(0.25);
    });

    it('easingFnがbezier/easing文字列より優先', () => {
        const fn = easingFnFor({ easing: 'ease-out', easingFn: 'elastic', bezier: [0, 0, 0.58, 1] }, fallback);
        expect(fn(0.5)).toBeCloseTo(EASING_FNS.elastic(0.5), 6);
    });

    it('未知のeasingFnはbezier/easingへフォールバック', () => {
        const fn = easingFnFor({ easing: 'ease-out', easingFn: 'unknown' }, fallback);
        expect(fn(0.5)).toBeCloseTo(EASING_FNS['ease-out'](0.5), 6);
    });

    it('bezierタプルはソルバを使う', () => {
        const fn = easingFnFor({ easing: 'cubic-bezier(0, 0, 0.58, 1)', bezier: [0, 0, 0.58, 1] }, fallback);
        expect(fn(0.5)).toBeCloseTo(cubicBezier(0, 0, 0.58, 1)(0.5), 6);
    });

    it('easingキーワードはEASING_FNSを引く', () => {
        const fn = easingFnFor({ easing: 'ease-out' }, fallback);
        expect(fn(0.5)).toBeCloseTo(EASING_FNS['ease-out'](0.5), 6);
    });

    it('未知のeasing文字列はfallback', () => {
        const fn = easingFnFor({ easing: 'cubic-bezier(0, 0, 0.58, 1)' }, fallback);
        expect(fn(0.5)).toBe(0.25);
    });
});
