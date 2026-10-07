import { contrastRatio, cssColorToHex } from './color';
import { markAutoIcon } from './image';

export const ICON_SIZE = 256;

export interface ThumbnailPalette {
    canvas: string;
    surface: string;
    text1: string;
    muted: string;
    accent: string;
    radius: number;
}

const FIRST_COLOR = /(rgba?\([^)]*\))/;

function resolveBackground(probe: HTMLElement, name: string, fallback: string): string {
    probe.style.background = `var(${name}, ${fallback})`;
    const style = getComputedStyle(probe);
    const color = style.backgroundColor;
    if (color && color !== 'rgba(0, 0, 0, 0)' && color !== 'transparent') return color;
    return FIRST_COLOR.exec(style.backgroundImage)?.[1] ?? fallback;
}

function resolveColor(probe: HTMLElement, name: string, fallback: string): string {
    probe.style.color = `var(${name}, ${fallback})`;
    return getComputedStyle(probe).color || fallback;
}

function resolveLength(probe: HTMLElement, property: 'borderTopLeftRadius', name: string): number {
    probe.style[property] = `var(${name}, 0px)`;
    return Number.parseFloat(getComputedStyle(probe)[property]) || 0;
}

export function readPalette(app: HTMLElement): ThumbnailPalette {
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.pointerEvents = 'none';
    app.append(probe);
    try {
        return {
            canvas: resolveBackground(probe, '--app-bg-color', '#ffffff'),
            surface: resolveBackground(probe, '--deck-content-bg-color', 'var(--bg-color-1, #ffffff)'),
            text1: resolveColor(probe, '--text-color-1', '#000000'),
            muted: resolveBackground(probe, '--bg-color-2', '#f2f4f5'),
            accent: resolveColor(probe, '--primary-color', '#f182ac'),
            radius: resolveLength(probe, 'borderTopLeftRadius', '--deck-border-radius'),
        };
    } finally {
        probe.remove();
    }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, w / 2, h / 2)));
    ctx.fill();
}

export function drawIcon(ctx: CanvasRenderingContext2D, p: ThumbnailPalette, size = ICON_SIZE): void {
    const u = size / 256;
    ctx.fillStyle = p.canvas;
    ctx.fillRect(0, 0, size, size);
    const radius = Math.min(48, Math.max(12, p.radius * 2)) * u;
    ctx.fillStyle = p.surface;
    roundRect(ctx, 40 * u, 40 * u, 176 * u, 176 * u, radius);
    ctx.fillStyle = p.accent;
    roundRect(ctx, 64 * u, 70 * u, 84 * u, 18 * u, 9 * u);
    ctx.fillStyle = p.muted;
    roundRect(ctx, 64 * u, 112 * u, 128 * u, 12 * u, 6 * u);
    roundRect(ctx, 64 * u, 138 * u, 100 * u, 12 * u, 6 * u);
    roundRect(ctx, 64 * u, 164 * u, 116 * u, 12 * u, 6 * u);
}

export async function renderIcon(app: HTMLElement): Promise<Blob> {
    const canvas = document.createElement('canvas');
    canvas.width = ICON_SIZE;
    canvas.height = ICON_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d is not available');
    drawIcon(ctx, readPalette(app));
    const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png'));
    return new Blob([markAutoIcon(new Uint8Array(await png.arrayBuffer()))], { type: 'image/png' });
}

export interface ContrastReading {
    body: number;
    button: number;
}

export function readContrast(app: HTMLElement): ContrastReading | null {
    const palette = readPalette(app);
    const probe = document.createElement('div');
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    app.append(probe);
    try {
        const onAccent = cssColorToHex(resolveColor(probe, '--on-accent', 'var(--bg-color-1, #ffffff)'));
        const text = cssColorToHex(palette.text1);
        const surface = cssColorToHex(palette.surface);
        const accent = cssColorToHex(palette.accent);
        if (!onAccent || !text || !surface || !accent) return null;
        return { body: contrastRatio(text, surface), button: contrastRatio(onAccent, accent) };
    } finally {
        probe.remove();
    }
}
