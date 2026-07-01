import { flushSync } from 'svelte';

const DEFAULT_DURATION = 220;
const DEFAULT_EASING = 'cubic-bezier(0.2, 0, 0, 1)';

export function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

export function captureRects<K>(els: HTMLElement[], keyOf: (el: HTMLElement) => K): Map<K, DOMRect> {
    const map = new Map<K, DOMRect>();
    for (const el of els) map.set(keyOf(el), el.getBoundingClientRect());
    return map;
}

export interface FlipOptions {
    duration?: number;
    easing?: string;
    registry?: Map<unknown, Animation>;
}

export function flipTo<K>(
    els: HTMLElement[],
    keyOf: (el: HTMLElement) => K,
    first: Map<K, DOMRect>,
    opts: FlipOptions = {},
): Animation[] {
    const duration = opts.duration ?? DEFAULT_DURATION;
    const easing = opts.easing ?? DEFAULT_EASING;
    const anims: Animation[] = [];
    for (const el of els) {
        const key = keyOf(el);
        const f = first.get(key);
        if (!f) continue;
        const l = el.getBoundingClientRect();
        const dx = f.left - l.left;
        const dy = f.top - l.top;
        if (!dx && !dy) continue;
        opts.registry?.get(key)?.cancel();
        const anim = el.animate(
            [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
            { duration, easing, fill: 'none' },
        );
        if (opts.registry) {
            opts.registry.set(key, anim);
            anim.finished
                .then(() => {
                    if (opts.registry?.get(key) === anim) opts.registry.delete(key);
                })
                .catch(() => {});
        }
        anims.push(anim);
    }
    return anims;
}

const TILE_SELECTOR = '.deck-row[data-tile-id]';
const tileKeyOf = (el: HTMLElement) => el.dataset.tileId;

export function animateLayout(mutate: () => void, opts: { exiting?: string[] } = {}): void {
    if (typeof document === 'undefined' || prefersReducedMotion()) {
        mutate();
        return;
    }
    const root = document.querySelector('.deck');
    if (!root) {
        mutate();
        return;
    }

    const before = [...root.querySelectorAll<HTMLElement>(TILE_SELECTOR)];
    const first = captureRects(before, tileKeyOf);
    const scrolls = new Map<string | undefined, number>();
    for (const el of before) scrolls.set(tileKeyOf(el), el.scrollTop);

    const exitClones = makeExitClones(before, opts.exiting);

    flushSync(mutate);

    const after = [...root.querySelectorAll<HTMLElement>(TILE_SELECTOR)];
    flipTo(after, tileKeyOf, first);

    for (const el of after) {
        const key = tileKeyOf(el);
        const saved = scrolls.get(key);
        if (saved) el.scrollTop = saved;
        if (key && !first.has(key)) {
            el.animate(
                [
                    { opacity: '0', transform: 'scale(0.96)' },
                    { opacity: '1', transform: 'scale(1)' },
                ],
                { duration: 200, easing: DEFAULT_EASING, fill: 'none' },
            );
        }
    }

    for (const clone of exitClones) {
        const anim = clone.animate(
            [
                { opacity: '1', transform: 'scale(1)' },
                { opacity: '0', transform: 'scale(0.96)' },
            ],
            { duration: 180, easing: DEFAULT_EASING, fill: 'forwards' },
        );
        anim.finished.then(() => clone.remove()).catch(() => clone.remove());
    }
}

function makeExitClones(before: HTMLElement[], exiting?: string[]): HTMLElement[] {
    if (!exiting?.length) return [];
    const clones: HTMLElement[] = [];
    for (const el of before) {
        const id = tileKeyOf(el);
        if (!id || !exiting.includes(id)) continue;
        const r = el.getBoundingClientRect();
        const clone = el.cloneNode(true) as HTMLElement;
        Object.assign(clone.style, {
            position: 'fixed',
            left: `${r.left}px`,
            top: `${r.top}px`,
            width: `${r.width}px`,
            height: `${r.height}px`,
            margin: '0',
            zIndex: '9998',
            pointerEvents: 'none',
        });
        clone.removeAttribute('data-tile-id');
        document.body.appendChild(clone);
        clones.push(clone);
    }
    return clones;
}
