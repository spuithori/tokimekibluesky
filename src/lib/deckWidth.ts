export const DECK_WIDTH_MIN = 240;
export const DECK_WIDTH_MAX = 1200;
export const DECK_WIDTH_DEFAULT = 400;

export const SINGLE_WIDTH_MIN = 360;
export const SINGLE_WIDTH_MAX = 1000;
export const SINGLE_WIDTH_DEFAULT = 528;

const DECK_PRESET_PX: Record<string, number> = {
    xxs: 280, xs: 320, small: 350, medium: 400, large: 450, xl: 500, xxl: 550,
};

const SINGLE_PRESET_PX: Record<string, number> = {
    xxs: 380, xs: 420, small: 460, medium: 528, large: 600, xl: 680, xxl: 760,
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

export function resolveSingleWidthPx(width: number | string | undefined | null): number {
    if (typeof width === 'number') return width;
    return SINGLE_PRESET_PX[width ?? 'medium'] ?? SINGLE_WIDTH_DEFAULT;
}
