export const DECK_WIDTH_MIN = 240;
export const DECK_WIDTH_MAX = 1200;
export const DECK_WIDTH_DEFAULT = 400;

export const SINGLE_WIDTH_MIN = 360;
export const SINGLE_WIDTH_MAX = 1000;
export const SINGLE_WIDTH_DEFAULT = 528;

const DECK_PRESET_PX: Record<string, number> = {
    xxs: 280, xs: 320, small: 350, medium: 400, large: 450, xl: 500, xxl: 550,
};

export function clampWidth(px: number, min: number, max: number): number {
    if (Number.isNaN(px)) return min;
    return Math.round(Math.max(min, Math.min(max, px)));
}

export function clampDeckWidth(px: number): number {
    return clampWidth(px, DECK_WIDTH_MIN, DECK_WIDTH_MAX);
}

export function clampSingleWidth(px: number): number {
    return clampWidth(px, SINGLE_WIDTH_MIN, SINGLE_WIDTH_MAX);
}

export function resolveDeckWidthPx(width: number | string | undefined | null): number {
    if (typeof width === 'number') return width;
    return DECK_PRESET_PX[width ?? 'medium'] ?? DECK_WIDTH_DEFAULT;
}

export function tileWeightForTargetWidth(targetPx: number, otherWeightsSum: number, containerPx: number): number {
    if (!Number.isFinite(targetPx) || !Number.isFinite(otherWeightsSum) || !Number.isFinite(containerPx)) return DECK_WIDTH_DEFAULT;
    if (otherWeightsSum <= 0 || containerPx <= 2) return DECK_WIDTH_DEFAULT;
    const t = Math.max(1, Math.min(targetPx, containerPx - 1));
    return clampDeckWidth((t * otherWeightsSum) / (containerPx - t));
}

export function tilePxForWeight(weight: number, otherWeightsSum: number, containerPx: number): number {
    if (!Number.isFinite(weight) || !Number.isFinite(otherWeightsSum) || !Number.isFinite(containerPx)) return DECK_WIDTH_DEFAULT;
    const total = weight + otherWeightsSum;
    if (weight <= 0 || total <= 0 || containerPx <= 0) return DECK_WIDTH_DEFAULT;
    return Math.round((containerPx * weight) / total);
}

export const SHELL_WIDTH_MIN = 720;
export const SHELL_WIDTH_MAX = 2400;
export const SHELL_WIDTH_DEFAULT = 1280;

export function clampShellWidth(px: number): number {
    return clampWidth(px, SHELL_WIDTH_MIN, SHELL_WIDTH_MAX);
}

export function parseShellWidthPx(value: string | undefined | null): number | null {
    if (!value) return null;
    const match = /^(\d*\.?\d+)px$/.exec(value.trim());
    if (!match) return null;
    const px = Number.parseFloat(match[1]);
    return Number.isFinite(px) ? px : null;
}
