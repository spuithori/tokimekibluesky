import type { ThemeToken } from '../format';
import { contrastRatio, hexToOklch, oklchToHex, type Oklch } from './color';

export type ShadowPreset = 'none' | 'soft' | 'strong';
export type SurfacePreset = 'solid' | 'glass';
export type DeckLayout = 'separate' | 'joined';

export interface Seeds {
    accent?: string;
    background?: string;
    text?: string | null;
    radius?: number;
    shadow?: ShadowPreset;
    surface?: SurfacePreset;
    layout?: DeckLayout;
}

export interface SeedBase {
    accent: string;
    background: string;
    radius: number;
}

export const DEFAULT_SEEDS: Required<Seeds> = {
    accent: '#f182ac',
    background: '#f6e9ef',
    text: null,
    radius: 8,
    shadow: 'none',
    surface: 'solid',
    layout: 'joined',
};

export interface DerivedTheme {
    tokens: ThemeToken[];
    dark: ThemeToken[];
}

const SHADOWS: Record<ShadowPreset, { light: [string, string, string]; dark: [string, string, string] }> = {
    none: {
        light: ['none', '0 1px 3px rgba(0,0,0,.08)', '0 10px 30px rgba(0,0,0,.18)'],
        dark: ['none', '0 1px 3px rgba(0,0,0,.4)', '0 10px 30px rgba(0,0,0,.5)'],
    },
    soft: {
        light: ['0 1px 3px rgba(0,0,0,.07)', '0 4px 12px rgba(0,0,0,.1)', '0 12px 32px rgba(0,0,0,.18)'],
        dark: ['0 1px 3px rgba(0,0,0,.35)', '0 4px 12px rgba(0,0,0,.45)', '0 12px 32px rgba(0,0,0,.55)'],
    },
    strong: {
        light: ['0 4px 14px rgba(0,0,0,.12)', '0 8px 24px rgba(0,0,0,.16)', '0 16px 48px rgba(0,0,0,.24)'],
        dark: ['0 4px 14px rgba(0,0,0,.45)', '0 8px 24px rgba(0,0,0,.55)', '0 16px 48px rgba(0,0,0,.6)'],
    },
};

function onColor(fill: string): string {
    return contrastRatio(fill, '#ffffff') >= contrastRatio(fill, '#111111') ? '#ffffff' : '#111111';
}

function readableOn(accent: Oklch, surface: string, min: number): string {
    let color = { ...accent };
    let hex = oklchToHex(color);
    for (let i = 0; i < 40 && contrastRatio(hex, surface) < min; i++) {
        color = { ...color, l: Math.min(0.98, color.l + 0.02) };
        hex = oklchToHex(color);
    }
    return hex;
}

const token = (name: string, value: string): ThemeToken => ({ name, value });

export function deriveTheme(seeds: Seeds, base: SeedBase = DEFAULT_SEEDS): DerivedTheme {
    const tokens: ThemeToken[] = [];
    const dark: ThemeToken[] = [];
    const radius = Math.max(0, Math.min(32, Math.round(seeds.radius ?? base.radius)));

    if (seeds.accent !== undefined || seeds.background !== undefined || seeds.text) {
        const accent = oklchToHex(hexToOklch(seeds.accent ?? base.accent));
        const canvas = hexToOklch(seeds.background ?? base.background);
        const tint = (k: number, max: number) => Math.min(canvas.c * k, max);
        const at = (l: number, k: number, max: number) => oklchToHex({ l, c: tint(k, max), h: canvas.h });
        const text1 = seeds.text ? oklchToHex(hexToOklch(seeds.text)) : at(0.18, 0.4, 0.02);
        const text2 = at(0.5, 0.35, 0.02);
        tokens.push(
            token('--current-theme-color', accent),
            token('--primary-color', accent),
            token('--base-bg-color', oklchToHex(canvas)),
            token('--bg-color-1', at(0.995, 0.15, 0.004)),
            token('--bg-color-2', at(0.962, 0.5, 0.012)),
            token('--bg-color-3', at(0.982, 0.3, 0.008)),
            token('--border-color-1', at(0.9, 0.5, 0.014)),
            token('--border-color-2', at(0.92, 0.45, 0.012)),
            token('--text-color-1', text1),
            token('--text-color-2', text2),
            token('--text-color-3', text2),
            token('--on-accent', onColor(accent)),
            token('--state-hover', `color-mix(in srgb, ${accent} 10%, transparent)`),
            token('--state-selected', `color-mix(in srgb, ${accent} 16%, transparent)`),
        );
        const darkBg1 = at(0.23, 0.6, 0.02);
        const darkAccent = readableOn(hexToOklch(accent), darkBg1, 3);
        dark.push(
            token('--primary-color', darkAccent),
            token('--base-dark-bg-color', at(0.17, 0.8, 0.03)),
            token('--app-bg-color', 'var(--base-dark-bg-color)'),
            token('--base-bg-color', at(0.2, 0.7, 0.025)),
            token('--bg-color-1', darkBg1),
            token('--bg-color-2', at(0.28, 0.6, 0.02)),
            token('--bg-color-3', at(0.25, 0.6, 0.02)),
            token('--border-color-1', at(0.34, 0.5, 0.018)),
            token('--border-color-2', at(0.31, 0.5, 0.018)),
            token('--text-color-1', at(0.94, 0.2, 0.01)),
            token('--text-color-2', at(0.74, 0.25, 0.015)),
            token('--text-color-3', at(0.62, 0.25, 0.015)),
            token('--on-accent', onColor(darkAccent)),
        );
    }

    if (seeds.radius !== undefined) {
        tokens.push(
            token('--radius-control', `${Math.round(radius * 0.6)}px`),
            token('--radius-card', `${radius}px`),
            token('--radius-overlay', `${Math.min(radius + 6, 32)}px`),
        );
    }

    if (seeds.shadow !== undefined) {
        const { light, dark: darkShadows } = SHADOWS[seeds.shadow];
        tokens.push(token('--elevation-1', light[0]), token('--elevation-2', light[1]), token('--elevation-3', light[2]));
        dark.push(token('--elevation-1', darkShadows[0]), token('--elevation-2', darkShadows[1]), token('--elevation-3', darkShadows[2]));
    }

    if (seeds.layout === 'joined') {
        tokens.push(
            token('--decks-gap', '0'),
            token('--deck-border-radius', '0'),
            token('--deck-border-width', '0'),
            token('--deck-border-right', '1px solid var(--border-color-2)'),
            token('--decks-border', '1px solid var(--border-color-2)'),
            token('--decks-border-left', '1px solid var(--border-color-2)'),
            token('--decks-border-bottom', 'none'),
            token('--decks-border-radius', radius ? `${radius}px ${radius}px 0 0` : '0'),
        );
    } else if (seeds.layout === 'separate') {
        tokens.push(
            token('--decks-gap', '8px'),
            token('--deck-border-radius', `${radius}px`),
            token('--deck-border-width', '0'),
            token('--deck-border-right', 'none'),
            token('--decks-border', 'none'),
            token('--decks-border-left', 'none'),
            token('--decks-border-bottom', 'none'),
            token('--decks-border-radius', '0'),
        );
    }

    if (seeds.surface === 'glass') {
        tokens.push(
            token('--surface-panel', 'color-mix(in srgb, var(--bg-color-1) 72%, transparent)'),
            token('--deck-heading-backdrop-filter', 'blur(20px)'),
        );
    } else if (seeds.surface === 'solid') {
        tokens.push(token('--deck-heading-backdrop-filter', 'none'));
    }

    return { tokens, dark };
}
