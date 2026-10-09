import { fade, fly, scale, type FadeParams, type FlyParams, type ScaleParams, type TransitionConfig } from 'svelte/transition';

type Easing = (t: number) => number;

const KEYWORDS: Readonly<Record<string, readonly [number, number, number, number]>> = {
    ease: [0.25, 0.1, 0.25, 1],
    'ease-in': [0.42, 0, 1, 1],
    'ease-out': [0, 0, 0.58, 1],
    'ease-in-out': [0.42, 0, 0.58, 1],
};

function cubicBezier(x1: number, y1: number, x2: number, y2: number): Easing {
    const cx = 3 * x1;
    const bx = 3 * (x2 - x1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * y1;
    const by = 3 * (y2 - y1) - cy;
    const ay = 1 - cy - by;
    const sampleX = (t: number) => ((ax * t + bx) * t + cx) * t;
    const sampleY = (t: number) => ((ay * t + by) * t + cy) * t;
    const slopeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
        if (x <= 0) return 0;
        if (x >= 1) return 1;
        let t = x;
        for (let i = 0; i < 8; i++) {
            const error = sampleX(t) - x;
            if (Math.abs(error) < 1e-6) return sampleY(t);
            const slope = slopeX(t);
            if (Math.abs(slope) < 1e-6) break;
            t -= error / slope;
        }
        let lo = 0;
        let hi = 1;
        t = x;
        while (hi - lo > 1e-6) {
            if (sampleX(t) < x) lo = t;
            else hi = t;
            t = (lo + hi) / 2;
        }
        return sampleY(t);
    };
}

export function parseDuration(value: string): number | undefined {
    const m = /^\s*(\d*\.?\d+)(ms|s)\s*$/.exec(value);
    if (!m) return undefined;
    return Number.parseFloat(m[1]) * (m[2] === 's' ? 1000 : 1);
}

export function parseEasing(value: string): Easing | undefined {
    const v = value.trim();
    if (v === 'linear') return (t) => t;
    const points = KEYWORDS[v] ?? /^cubic-bezier\(([^)]*)\)$/.exec(v)?.[1].split(',').map(Number);
    if (!points || points.length !== 4 || points.some((n) => !Number.isFinite(n))) return undefined;
    const [x1, y1, x2, y2] = points;
    if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return undefined;
    return cubicBezier(x1, y1, x2, y2);
}

function overlayMotion<P extends { duration?: number; easing?: Easing }>(node: Element, params: P): P {
    const style = getComputedStyle(node);
    const duration = parseDuration(style.getPropertyValue('--motion-duration-overlay'));
    const easing = parseEasing(style.getPropertyValue('--motion-easing-overlay'));
    const still = style.getPropertyValue('--motion-overlay-fade').trim() === 'none';
    if (duration === undefined && !easing && !still) return params;
    return { ...params, ...(duration === undefined ? {} : { duration }), ...(easing ? { easing } : {}), ...(still ? { opacity: 1 } : {}) };
}

export function overlayFly(node: Element, params: FlyParams = {}): TransitionConfig {
    return fly(node, overlayMotion(node, params));
}

export function overlayScale(node: Element, params: ScaleParams = {}): TransitionConfig {
    return scale(node, overlayMotion(node, params));
}

export function overlayFade(node: Element, params: FadeParams = {}): TransitionConfig {
    const motion = overlayMotion(node, params);
    return fade(node, getComputedStyle(node).getPropertyValue('--motion-overlay-fade').trim() === 'none' ? { ...motion, duration: 0 } : motion);
}
