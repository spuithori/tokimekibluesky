export const THEME_COLLECTION = 'tech.tokimeki.theme.theme';
export const APPROVAL_COLLECTION = 'tech.tokimeki.theme.approval';
export const LIKE_COLLECTION = 'tech.tokimeki.theme.like';
export const OFFICIAL_THEME_DID = 'did:plc:4tr5dqti7nmu6g2czpthntak';

export interface ThemeToken {
    name: string;
    value: string;
}

export interface BlobRef {
    $type?: 'blob';
    ref: { $link: string };
    mimeType: string;
    size: number;
}

export interface ThemeVariant {
    key: string;
    name: string;
    swatch: string;
    tokens: ThemeToken[];
}

export interface ThemeImage {
    key: string;
    image: BlobRef;
    alt?: string;
}

export interface ThemeRecord {
    $type?: typeof THEME_COLLECTION;
    name: string;
    description?: string;
    version: string;
    tokens: ThemeToken[];
    dark?: ThemeToken[];
    variants?: ThemeVariant[];
    images?: ThemeImage[];
    thumbnail?: BlobRef;
    cover?: BlobRef;
    tags?: string[];
    createdAt: string;
    updatedAt?: string;
}

export const LIMITS = {
    tokens: 1024,
    value: 4096,
    variants: 32,
    images: 8,
    imageSize: 2_000_000,
    previewSize: 1_000_000,
    tags: 8,
} as const;

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];
const PREVIEW_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const TOKEN_NAME = /^--[a-zA-Z0-9_-]{1,94}$/;
const KEY = /^[a-zA-Z0-9_-]{1,64}$/;
const FORBIDDEN = /[;{}\\!@<>\u0000-\u001f\u007f]|\/\*|\*\//;
const FUNCTION_CALL = /([a-zA-Z_-][a-zA-Z0-9_-]*)\(/g;
const THEME_IMAGE = /theme-image\(\s*([a-zA-Z0-9_-]+)\s*\)/g;

const ALLOWED_FUNCTIONS = new Set([
    'var', 'env', 'calc', 'min', 'max', 'clamp', 'round', 'mod', 'rem', 'abs', 'sign',
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'pow', 'sqrt', 'hypot', 'log', 'exp',
    'rgb', 'rgba', 'hsl', 'hsla', 'hwb', 'lab', 'lch', 'oklab', 'oklch', 'color', 'color-mix', 'light-dark',
    'linear-gradient', 'radial-gradient', 'conic-gradient',
    'repeating-linear-gradient', 'repeating-radial-gradient', 'repeating-conic-gradient',
    'blur', 'brightness', 'contrast', 'drop-shadow', 'grayscale', 'hue-rotate', 'invert', 'opacity', 'saturate', 'sepia',
    'translate', 'translatex', 'translatey', 'translatez', 'translate3d',
    'scale', 'scalex', 'scaley', 'scalez', 'scale3d',
    'rotate', 'rotatex', 'rotatey', 'rotatez', 'rotate3d',
    'skew', 'skewx', 'skewy', 'matrix', 'matrix3d', 'perspective',
    'cubic-bezier', 'steps', 'linear',
    'inset', 'circle', 'ellipse', 'polygon', 'rect', 'xywh',
    'fit-content', 'minmax', 'repeat',
    'theme-image',
]);

function outsideStrings(value: string): string | null {
    let out = '';
    let quote: string | null = null;
    for (const ch of value) {
        if (quote) {
            if (ch === quote) quote = null;
            out += ' ';
            continue;
        }
        if (ch === '"' || ch === "'") {
            quote = ch;
            out += ' ';
            continue;
        }
        out += ch;
    }
    return quote ? null : out;
}

export function checkTokenName(name: unknown): string | null {
    if (typeof name !== 'string' || !TOKEN_NAME.test(name)) return `トークン名が不正: ${String(name).slice(0, 100)}`;
    return null;
}

export function checkTokenValue(value: unknown, imageKeys: ReadonlySet<string> = new Set()): string | null {
    if (typeof value !== 'string') return '値が文字列ではない';
    if (value.length === 0 || value.length > LIMITS.value) return '値の長さが範囲外';
    if (FORBIDDEN.test(value)) return `使えない文字を含む: ${value.slice(0, 100)}`;
    const bare = outsideStrings(value);
    if (bare === null) return `引用符が閉じていない: ${value.slice(0, 100)}`;
    let depth = 0;
    for (const ch of bare) {
        if (ch === '(') depth++;
        else if (ch === ')' && --depth < 0) break;
    }
    if (depth !== 0) return `括弧の対応が取れていない: ${value.slice(0, 100)}`;
    for (const match of bare.matchAll(FUNCTION_CALL)) {
        const fn = match[1].toLowerCase();
        if (!ALLOWED_FUNCTIONS.has(fn)) return `使えない関数: ${fn}()`;
    }
    for (const match of bare.matchAll(/theme-image\(([^)]*)\)/g)) {
        const key = match[1].trim();
        if (!KEY.test(key) || !imageKeys.has(key)) return `存在しない画像を参照: ${key}`;
    }
    return null;
}

function checkTokenList(list: unknown, label: string, imageKeys: ReadonlySet<string>, errors: string[]): ThemeToken[] | undefined {
    if (!Array.isArray(list)) {
        errors.push(`${label} が配列ではない`);
        return undefined;
    }
    if (list.length > LIMITS.tokens) {
        errors.push(`${label} のトークンが多すぎる`);
        return undefined;
    }
    const out: ThemeToken[] = [];
    for (const item of list) {
        const name = (item as ThemeToken | null)?.name;
        const value = (item as ThemeToken | null)?.value;
        const problem = checkTokenName(name) ?? checkTokenValue(value, imageKeys);
        if (problem) {
            errors.push(`${label}: ${problem}`);
            continue;
        }
        out.push({ name: name as string, value: value as string });
    }
    return out;
}

function checkBlob(blob: unknown, types: string[], maxSize: number): BlobRef | null {
    const b = blob as BlobRef | null;
    if (!b || typeof b !== 'object') return null;
    const link = b.ref?.$link;
    if (typeof link !== 'string' || !/^b[a-z2-7]{20,}$/.test(link)) return null;
    if (typeof b.mimeType !== 'string' || !types.includes(b.mimeType)) return null;
    if (typeof b.size !== 'number' || b.size <= 0 || b.size > maxSize) return null;
    return { $type: 'blob', ref: { $link: link }, mimeType: b.mimeType, size: b.size };
}

function checkString(value: unknown, max: number): string | undefined {
    return typeof value === 'string' && value.length > 0 && value.length <= max ? value : undefined;
}

export type ThemeValidation = { ok: true; record: ThemeRecord; warnings: string[] } | { ok: false; errors: string[] };

export function validateThemeRecord(value: unknown, { strict = true } = {}): ThemeValidation {
    const errors: string[] = [];
    const v = value as Record<string, unknown> | null;
    if (!v || typeof v !== 'object' || Array.isArray(v)) return { ok: false, errors: ['レコードがオブジェクトではない'] };

    const name = checkString(v.name, 640);
    if (!name) errors.push('name が無い');
    const version = checkString(v.version, 32);
    if (!version) errors.push('version が無い');
    const createdAt = checkString(v.createdAt, 64);
    if (!createdAt) errors.push('createdAt が無い');

    const images: ThemeImage[] = [];
    if (v.images !== undefined) {
        if (!Array.isArray(v.images) || v.images.length > LIMITS.images) errors.push('images が不正');
        else {
            const seen = new Set<string>();
            for (const item of v.images as Array<Record<string, unknown>>) {
                const key = item?.key;
                const blob = checkBlob(item?.image, IMAGE_TYPES, LIMITS.imageSize);
                if (typeof key !== 'string' || !KEY.test(key) || seen.has(key) || !blob) {
                    errors.push(`画像が不正: ${String(key)}`);
                    continue;
                }
                seen.add(key);
                const alt = checkString(item.alt, 3000);
                images.push(alt ? { key, image: blob, alt } : { key, image: blob });
            }
        }
    }
    const imageKeys = new Set(images.map((i) => i.key));

    const tokens = checkTokenList(v.tokens, 'tokens', imageKeys, errors);
    const dark = v.dark === undefined ? undefined : checkTokenList(v.dark, 'dark', imageKeys, errors);

    const variants: ThemeVariant[] = [];
    if (v.variants !== undefined) {
        if (!Array.isArray(v.variants) || v.variants.length > LIMITS.variants) errors.push('variants が不正');
        else {
            const seen = new Set<string>();
            for (const item of v.variants as Array<Record<string, unknown>>) {
                const key = item?.key;
                const vname = checkString(item?.name, 640);
                const swatchProblem = checkTokenValue(item?.swatch);
                if (typeof key !== 'string' || !KEY.test(key) || seen.has(key) || !vname || swatchProblem) {
                    errors.push(`色の選択肢が不正: ${String(key)}`);
                    continue;
                }
                seen.add(key);
                const vtokens = checkTokenList(item.tokens, `variants.${key}`, imageKeys, errors) ?? [];
                variants.push({ key, name: vname, swatch: item.swatch as string, tokens: vtokens });
            }
        }
    }

    const thumbnail = v.thumbnail === undefined ? undefined : checkBlob(v.thumbnail, PREVIEW_TYPES, LIMITS.previewSize);
    if (v.thumbnail !== undefined && !thumbnail) errors.push('thumbnail が不正');
    const cover = v.cover === undefined ? undefined : checkBlob(v.cover, PREVIEW_TYPES, LIMITS.previewSize);
    if (v.cover !== undefined && !cover) errors.push('cover が不正');

    const tags = Array.isArray(v.tags)
        ? (v.tags as unknown[]).filter((t): t is string => typeof t === 'string' && t.length > 0 && t.length <= 320).slice(0, LIMITS.tags)
        : undefined;

    if (strict ? errors.length > 0 : !name || !tokens) return { ok: false, errors };

    const record: ThemeRecord = {
        $type: THEME_COLLECTION,
        name: name as string,
        version: version ?? '',
        tokens: tokens ?? [],
        createdAt: createdAt ?? '',
    };
    const description = checkString(v.description, 3000);
    if (description) record.description = description;
    if (dark) record.dark = dark;
    if (variants.length) record.variants = variants;
    if (images.length) record.images = images;
    if (thumbnail) record.thumbnail = thumbnail;
    if (cover) record.cover = cover;
    if (tags?.length) record.tags = tags;
    const updatedAt = checkString(v.updatedAt, 64);
    if (updatedAt) record.updatedAt = updatedAt;
    return { ok: true, record, warnings: errors };
}

export function resolveVariantKey(record: Pick<ThemeRecord, 'variants'>, selected: string | undefined | null): string | undefined {
    const variants = record.variants ?? [];
    if (!variants.length) return undefined;
    return variants.some((v) => v.key === selected) ? (selected as string) : variants[0].key;
}

function substituteImages(value: string, imageUrls: Readonly<Record<string, string>>): string {
    return value.replace(THEME_IMAGE, (_, key: string) => (imageUrls[key] ? `url("${imageUrls[key]}")` : 'none'));
}

export function compileTokens(tokens: readonly ThemeToken[] | undefined, imageUrls: Readonly<Record<string, string>> = {}): string {
    if (!tokens) return '';
    let out = '';
    for (const t of tokens) out += `${t.name}:${t.value.includes('theme-image(') ? substituteImages(t.value, imageUrls) : t.value};`;
    return out;
}

export function compileThemeStyle(
    record: Pick<ThemeRecord, 'tokens' | 'dark' | 'variants'>,
    { variant, dark, imageUrls = {} }: { variant?: string | null; dark: boolean; imageUrls?: Readonly<Record<string, string>> },
): string {
    const key = resolveVariantKey(record, variant);
    const chosen = key ? record.variants?.find((v) => v.key === key) : undefined;
    return compileTokens(record.tokens, imageUrls) + compileTokens(chosen?.tokens, imageUrls) + (dark ? compileTokens(record.dark, imageUrls) : '');
}

export function themeUri(did: string, rkey: string): string {
    return `at://${did}/${THEME_COLLECTION}/${rkey}`;
}
