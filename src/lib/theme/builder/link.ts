import { LIMITS, validateThemeRecord, type ThemeRecord } from '../format';

export const THEME_LINK_PREFIX = '#theme=';

const LINK_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/avif'];
const PLACEHOLDER_CID = 'bafkreiaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

export interface LinkImage {
    key: string;
    mimeType: string;
    bytes: Uint8Array;
}

function toBase64Url(bytes: Uint8Array): string {
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function transform(bytes: Uint8Array<ArrayBuffer>, stream: CompressionStream | DecompressionStream): Promise<Uint8Array<ArrayBuffer>> {
    return new Uint8Array(await new Response(new Response(bytes).body!.pipeThrough(stream)).arrayBuffer());
}

export function linkableRecord(record: ThemeRecord): ThemeRecord {
    const { images: _images, thumbnail: _thumbnail, cover: _cover, screenshots: _screenshots, ...rest } = record;
    return rest;
}

export async function encodeThemeHash(record: ThemeRecord, images: readonly LinkImage[] = []): Promise<string> {
    const payload = images.length
        ? { ...linkableRecord(record), linkImages: images.map((image) => ({ key: image.key, mimeType: image.mimeType, data: toBase64Url(image.bytes) })) }
        : linkableRecord(record);
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    return THEME_LINK_PREFIX + toBase64Url(await transform(bytes, new CompressionStream('gzip')));
}

function readLinkImages(value: unknown): Record<string, Blob> | null {
    if (value === undefined) return {};
    if (!Array.isArray(value) || value.length > LIMITS.images) return null;
    const images: Record<string, Blob> = {};
    for (const item of value as Array<Record<string, unknown>>) {
        const { key, mimeType, data } = item ?? {};
        if (typeof key !== 'string' || !/^[a-zA-Z0-9_-]{1,64}$/.test(key) || key in images) return null;
        if (typeof mimeType !== 'string' || !LINK_IMAGE_TYPES.includes(mimeType) || typeof data !== 'string') return null;
        let bytes: Uint8Array<ArrayBuffer>;
        try {
            bytes = fromBase64Url(data);
        } catch {
            return null;
        }
        if (bytes.length === 0 || bytes.length > LIMITS.imageSize) return null;
        images[key] = new Blob([bytes], { type: mimeType });
    }
    return images;
}

export async function decodeThemeHash(hash: string): Promise<{ record: ThemeRecord; images: Record<string, Blob> } | null> {
    if (!hash.startsWith(THEME_LINK_PREFIX)) return null;
    let value: unknown;
    try {
        const bytes = await transform(fromBase64Url(hash.slice(THEME_LINK_PREFIX.length)), new DecompressionStream('gzip'));
        value = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
        return null;
    }
    if (!value || typeof value !== 'object') return null;
    const { linkImages, ...rest } = value as Record<string, unknown>;
    const images = readLinkImages(linkImages);
    if (!images) return null;
    const refs = Object.entries(images).map(([key, blob]) => ({ key, image: { $type: 'blob', ref: { $link: PLACEHOLDER_CID }, mimeType: blob.type, size: blob.size } }));
    const base = linkableRecord(rest as unknown as ThemeRecord);
    const check = validateThemeRecord(refs.length ? { ...base, images: refs } : base);
    return check.ok ? { record: check.record, images } : null;
}
