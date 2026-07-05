import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cubicOut } from 'svelte/easing';
import { buildFxCss, resolveFx, riceFx } from './transition';
import { EASING_FNS, cubicBezier } from './easing';
import { settingsStore } from '$lib/settings/settings.svelte';
import type { RiceFxParams } from './transition';

function mockMatchMedia(reduced: boolean) {
    window.matchMedia = ((query: string) => ({
        matches: reduced && query.includes('prefers-reduced-motion'),
        media: query,
        addEventListener() {},
        removeEventListener() {},
    })) as any;
}

const fallbackParams: RiceFxParams = {
    target: 'panel',
    duration: 250,
    style: { kind: 'slide', direction: 'bottom', distance: 16 },
};

describe('resolveFx', () => {
    it('config未定義はサイトfallbackのstyle 1つとcubicOut', () => {
        const resolved = resolveFx(undefined, fallbackParams);
        expect(resolved.styles).toEqual([{ kind: 'slide', direction: 'bottom', distance: 16 }]);
        expect(resolved.easing(0.5)).toBeCloseTo(cubicOut(0.5), 6);
    });

    it('configのstylesがfallbackに勝つ(合成含む)', () => {
        const resolved = resolveFx(
            { duration: 100, easing: 'ease', styles: [{ kind: 'popin', scale: 0.9 }, { kind: 'blur', radius: 6 }] },
            fallbackParams,
        );
        expect(resolved.styles).toEqual([{ kind: 'popin', scale: 0.9 }, { kind: 'blur', radius: 6 }]);
    });

    it('configにstylesが無ければduration/curveだけ設定してもstyleはfallback', () => {
        const resolved = resolveFx({ duration: 100, easing: 'ease-out' }, fallbackParams);
        expect(resolved.styles).toEqual([fallbackParams.style]);
    });

    it('lockStyleはconfigのstylesを無視してfallback styleを固定する(duration/easingは追随)', () => {
        const resolved = resolveFx(
            { duration: 100, easing: 'ease-out', styles: [{ kind: 'popin', scale: 0.9 }] },
            { ...fallbackParams, style: { kind: 'fade' }, lockStyle: true },
        );
        expect(resolved.styles).toEqual([{ kind: 'fade' }]);
        expect(resolved.easing(0.5)).toBeCloseTo(EASING_FNS['ease-out'](0.5), 6);
    });

    it('params.easing指定はcubicOutより優先されるfallback', () => {
        const custom = (t: number) => t;
        const resolved = resolveFx(undefined, { ...fallbackParams, easing: custom });
        expect(resolved.easing).toBe(custom);
    });

    it('bezierタプル付きconfigはソルバeasing', () => {
        const resolved = resolveFx(
            { duration: 100, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', bezier: [0.16, 1, 0.3, 1] },
            fallbackParams,
        );
        expect(resolved.easing(0.5)).toBeCloseTo(cubicBezier(0.16, 1, 0.3, 1)(0.5), 6);
    });

    it('easingFnはbezier/easing文字列より優先(bounce)', () => {
        const resolved = resolveFx(
            { duration: 100, easing: 'ease-out', easingFn: 'bounce', bezier: [0, 0, 0.58, 1] },
            fallbackParams,
        );
        expect(resolved.easing(0.5)).toBeCloseTo(EASING_FNS.bounce(0.5), 6);
    });
});

describe('buildFxCss', () => {
    const base = { opacity: 1, transform: 'none', filter: 'none' };

    it('slide bottomはsvelte fly同型のcss', () => {
        const css = buildFxCss([{ kind: 'slide', direction: 'bottom', distance: 16 }], 'bottom', base);
        expect(css(0.5, 0.5)).toBe('transform: translate(0px, 8px); opacity: 0.5');
        expect(css(1, 0)).toBe('transform: translate(0px, 0px); opacity: 1');
    });

    it('slide leftは負のx', () => {
        const css = buildFxCss([{ kind: 'slide', direction: 'left', distance: 24 }], 'bottom', base);
        expect(css(0, 1)).toBe('transform: translate(-24px, 0px); opacity: 0');
    });

    it('direction未指定はコンテキスト方向・distance未指定は16px', () => {
        const css = buildFxCss([{ kind: 'slide' }], 'right', base);
        expect(css(0, 1)).toBe('transform: translate(16px, 0px); opacity: 0');
    });

    it('popinはscale同型のcss', () => {
        const css = buildFxCss([{ kind: 'popin', scale: 0.98 }], 'bottom', base);
        expect(css(0.5, 0.5)).toBe('transform: scale(0.99); opacity: 0.5');
    });

    it('fadeはopacityのみ', () => {
        const css = buildFxCss([{ kind: 'fade' }], 'bottom', base);
        expect(css(0.5, 0.5)).toBe('opacity: 0.5');
    });

    it('blurはfilter節を追加(既定8px)', () => {
        const css = buildFxCss([{ kind: 'blur' }], 'bottom', base);
        expect(css(0.5, 0.5)).toBe('opacity: 0.5; filter: blur(4px)');
        expect(css(1, 0)).toBe('opacity: 1; filter: blur(0px)');
    });

    it('slide+popin+blurの合成', () => {
        const css = buildFxCss(
            [{ kind: 'slide', direction: 'right', distance: 24 }, { kind: 'popin', scale: 0.9 }, { kind: 'blur', radius: 6 }],
            'bottom',
            base,
        );
        expect(css(0.5, 0.5)).toBe('transform: translate(12px, 0px) scale(0.95); opacity: 0.5; filter: blur(3px)');
        expect(css(1, 0)).toBe('transform: translate(0px, 0px) scale(1); opacity: 1; filter: blur(0px)');
    });

    it('既存transform/opacity/filterを合成する', () => {
        const css = buildFxCss(
            [{ kind: 'slide', direction: 'top', distance: 8 }, { kind: 'blur', radius: 4 }],
            'bottom',
            { opacity: 0.8, transform: 'matrix(1, 0, 0, 1, 10, 0)', filter: 'grayscale(1)' },
        );
        expect(css(0.5, 0.5)).toBe(
            'transform: matrix(1, 0, 0, 1, 10, 0) translate(0px, -4px); opacity: 0.4; filter: grayscale(1) blur(2px)',
        );
    });

    it('elastic×popinでもscaleは正の範囲に留まる', () => {
        const css = buildFxCss([{ kind: 'popin', scale: 0.8 }], 'bottom', base);
        const elastic = EASING_FNS.elastic;
        for (let i = 0; i <= 20; i++) {
            const t = elastic(i / 20);
            const match = /scale\((-?[\d.]+)\)/.exec(css(t, 1 - t));
            expect(Number(match![1])).toBeGreaterThan(0);
        }
    });
});

describe('riceFx', () => {
    beforeEach(() => {
        mockMatchMedia(false);
        settingsStore.rice.enabled = true;
        settingsStore.rice.config = '';
    });

    afterEach(() => {
        settingsStore.rice.enabled = true;
        settingsStore.rice.config = '';
    });

    function node(): Element {
        const el = document.createElement('div');
        document.body.appendChild(el);
        return el;
    }

    it('rice未設定はfallbackのduration/style', () => {
        const config = riceFx(node(), fallbackParams);
        expect(config.duration).toBe(250);
        expect(config.css!(0.5, 0.5)).toBe('transform: translate(0px, 8px); opacity: 0.5');
    });

    it('設定済みstyle/durationが適用される', () => {
        settingsStore.rice.config = 'animation {\n    panel = 100ms, ease-out, slide left 24px\n}';
        const config = riceFx(node(), fallbackParams);
        expect(config.duration).toBe(100);
        expect(config.css!(0, 1)).toBe('transform: translate(-24px, 0px); opacity: 0');
    });

    it('合成configがそのままcssへ反映される', () => {
        settingsStore.rice.config = 'animation {\n    panel = 300ms, bounce, slide right 24px, popin 90%, blur 6px\n}';
        const config = riceFx(node(), fallbackParams);
        expect(config.duration).toBe(300);
        expect(config.css!(0, 1)).toBe('transform: translate(24px, 0px) scale(0.9); opacity: 0; filter: blur(6px)');
        expect((config.easing as (t: number) => number)(0.5)).toBeCloseTo(EASING_FNS.bounce(0.5), 6);
    });

    it('target=offでduration 0', () => {
        settingsStore.rice.config = 'animation {\n    panel = off\n}';
        expect(riceFx(node(), fallbackParams).duration).toBe(0);
    });

    it('enabled=falseでduration 0', () => {
        settingsStore.rice.config = 'animation {\n    enabled = false\n    panel = 100ms\n}';
        expect(riceFx(node(), fallbackParams).duration).toBe(0);
    });

    it('prefers-reduced-motionが最優先でduration 0', () => {
        mockMatchMedia(true);
        settingsStore.rice.config = 'animation {\n    panel = 100ms\n}';
        expect(riceFx(node(), fallbackParams).duration).toBe(0);
    });
});
