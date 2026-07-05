import { riceState } from './riceState.svelte';
import { prefersReducedMotion } from '$lib/animations/flip';

export function animMs(target: string, fallback: number): number {
    if (prefersReducedMotion()) return 0;
    const animations = riceState.compiled.animations;
    if (!animations) return fallback;
    if (!animations.enabled) return 0;
    return animations.targets[target]?.duration ?? fallback;
}

export function animEasing(target: string, fallback: string): string {
    const animations = riceState.compiled.animations;
    if (!animations?.enabled) return fallback;
    return animations.targets[target]?.easing ?? fallback;
}
