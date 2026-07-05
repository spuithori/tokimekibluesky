import { backOut, bounceOut, elasticOut } from 'svelte/easing';
import type { AnimationTargetConfig } from './config/model';

export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
    if (x1 === y1 && x2 === y2) {
        return (t: number) => t;
    }
    const sampleX = (u: number) => 3 * (1 - u) * (1 - u) * u * x1 + 3 * (1 - u) * u * u * x2 + u * u * u;
    const sampleY = (u: number) => 3 * (1 - u) * (1 - u) * u * y1 + 3 * (1 - u) * u * u * y2 + u * u * u;
    const sampleDerivX = (u: number) => 3 * (1 - u) * (1 - u) * x1 + 6 * (1 - u) * u * (x2 - x1) + 3 * u * u * (1 - x2);

    const solveU = (x: number): number => {
        let u = x;
        for (let i = 0; i < 8; i++) {
            const err = sampleX(u) - x;
            if (Math.abs(err) < 1e-6) return u;
            const d = sampleDerivX(u);
            if (Math.abs(d) < 1e-6) break;
            u -= err / d;
        }
        let lo = 0;
        let hi = 1;
        u = x;
        while (hi - lo > 1e-6) {
            u = (lo + hi) / 2;
            if (sampleX(u) < x) {
                lo = u;
            } else {
                hi = u;
            }
        }
        return u;
    };

    return (t: number) => {
        if (t <= 0) return 0;
        if (t >= 1) return 1;
        return sampleY(solveU(t));
    };
}

export const EASING_FNS: Record<string, (t: number) => number> = {
    linear: (t) => t,
    ease: cubicBezier(0.25, 0.1, 0.25, 1),
    'ease-in': cubicBezier(0.42, 0, 1, 1),
    'ease-out': cubicBezier(0, 0, 0.58, 1),
    'ease-in-out': cubicBezier(0.42, 0, 0.58, 1),
    bounce: bounceOut,
    elastic: elasticOut,
    back: backOut,
};

export function easingFnFor(
    config: Pick<AnimationTargetConfig, 'easing' | 'easingFn' | 'bezier'> | undefined,
    fallback: (t: number) => number,
): (t: number) => number {
    if (!config) return fallback;
    if (config.easingFn) {
        const fn = EASING_FNS[config.easingFn];
        if (fn) return fn;
    }
    if (config.bezier) return cubicBezier(...config.bezier);
    return EASING_FNS[config.easing] ?? fallback;
}
