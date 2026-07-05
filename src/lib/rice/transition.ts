import { cubicOut } from 'svelte/easing';
import type { TransitionConfig } from 'svelte/transition';
import type { AnimationStyle, AnimationTargetConfig, SlideDirection } from './config/model';
import { riceState } from './riceState.svelte';
import { animMs } from './anim';
import { easingFnFor } from './easing';

export interface RiceFxParams {
    target: string;
    duration: number;
    style: AnimationStyle;
    easing?: (t: number) => number;
    direction?: SlideDirection;
    lockStyle?: boolean;
}

export interface ResolvedFx {
    styles: AnimationStyle[];
    easing: (t: number) => number;
}

export function resolveFx(config: AnimationTargetConfig | undefined, params: RiceFxParams): ResolvedFx {
    return {
        styles: params.lockStyle ? [params.style] : (config?.styles ?? [params.style]),
        easing: easingFnFor(config, params.easing ?? cubicOut),
    };
}

export function buildFxCss(
    styles: AnimationStyle[],
    contextDirection: SlideDirection,
    base: { opacity: number; transform: string; filter?: string },
): (t: number, u: number) => string {
    const baseTransform = base.transform && base.transform !== 'none' ? `${base.transform} ` : '';
    const baseFilter = base.filter && base.filter !== 'none' ? `${base.filter} ` : '';
    const slide = styles.find((s) => s.kind === 'slide');
    const popin = styles.find((s) => s.kind === 'popin');
    const blur = styles.find((s) => s.kind === 'blur');

    let x = 0;
    let y = 0;
    if (slide) {
        const distance = slide.distance ?? 16;
        const direction = slide.direction ?? contextDirection;
        x = direction === 'left' ? -distance : direction === 'right' ? distance : 0;
        y = direction === 'top' ? -distance : direction === 'bottom' ? distance : 0;
    }
    const delta = popin ? 1 - popin.scale : 0;
    const radius = blur?.radius ?? 8;

    return (t, u) => {
        let css = '';
        if (slide || popin) {
            let transform = baseTransform;
            if (slide) transform += `translate(${x * u}px, ${y * u}px)`;
            if (popin) transform += `${slide ? ' ' : ''}scale(${1 - delta * u})`;
            css += `transform: ${transform}; `;
        }
        css += `opacity: ${t * base.opacity}`;
        if (blur) {
            css += `; filter: ${baseFilter}blur(${radius * u}px)`;
        }
        return css;
    };
}

export function riceFx(node: Element, params: RiceFxParams): TransitionConfig {
    const config = riceState.compiled.animations?.targets[params.target];
    const resolved = resolveFx(config, params);
    const computed = getComputedStyle(node);
    const base = {
        opacity: Number(computed.opacity) || 1,
        transform: computed.transform,
        filter: computed.filter,
    };
    return {
        duration: animMs(params.target, params.duration),
        easing: resolved.easing,
        css: buildFxCss(resolved.styles, params.direction ?? 'bottom', base),
    };
}
