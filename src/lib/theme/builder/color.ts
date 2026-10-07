export interface Oklch {
    l: number;
    c: number;
    h: number;
}

const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function isHexColor(value: string): boolean {
    return HEX.test(value.trim());
}

function parseHex(hex: string): [number, number, number] {
    const match = HEX.exec(hex.trim());
    if (!match) throw new Error(`not a hex color: ${hex}`);
    const digits = match[1].length === 3 ? match[1].split('').map((d) => d + d).join('') : match[1];
    return [0, 2, 4].map((i) => parseInt(digits.slice(i, i + 2), 16) / 255) as [number, number, number];
}

const toLinear = (v: number) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
const fromLinear = (v: number) => (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);

function linearToOklab([r, g, b]: [number, number, number]): [number, number, number] {
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
}

function oklabToLinear([L, a, b]: [number, number, number]): [number, number, number] {
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    return [
        4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
        -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
        -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ];
}

export function hexToOklch(hex: string): Oklch {
    const [L, a, b] = linearToOklab(parseHex(hex).map(toLinear) as [number, number, number]);
    const c = Math.hypot(a, b);
    const h = c < 1e-4 ? 0 : ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
    return { l: L, c, h };
}

function linearOf({ l, c, h }: Oklch): [number, number, number] {
    const rad = (h * Math.PI) / 180;
    return oklabToLinear([l, c * Math.cos(rad), c * Math.sin(rad)]);
}

const inGamut = (rgb: number[]) => rgb.every((v) => v >= -1e-4 && v <= 1 + 1e-4);

export function oklchToHex(color: Oklch): string {
    const l = Math.min(1, Math.max(0, color.l));
    let c = Math.max(0, color.c);
    if (!inGamut(linearOf({ l, c, h: color.h }))) {
        let lo = 0;
        let hi = c;
        for (let i = 0; i < 24; i++) {
            const mid = (lo + hi) / 2;
            if (inGamut(linearOf({ l, c: mid, h: color.h }))) lo = mid;
            else hi = mid;
        }
        c = lo;
    }
    const rgb = linearOf({ l, c, h: color.h }).map((v) => Math.round(Math.min(1, Math.max(0, fromLinear(Math.min(1, Math.max(0, v))))) * 255));
    return `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function relativeLuminance(hex: string): number {
    const [r, g, b] = parseHex(hex).map(toLinear);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
    const x = relativeLuminance(a);
    const y = relativeLuminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

export function cssColorToHex(value: string): string | null {
    const hex = (channels: number[]) => `#${channels.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('')}`;
    const rgb = /rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(value);
    if (rgb) return hex(rgb.slice(1, 4).map(Number));
    const srgb = /color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)/.exec(value);
    if (srgb) return hex(srgb.slice(1, 4).map((v) => Number(v) * 255));
    return isHexColor(value) ? value : null;
}
