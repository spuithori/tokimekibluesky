import { validateThemeRecord, type ThemeRecord } from '../format';

export const THEME_LINK_PREFIX = '#theme=';

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

export async function encodeThemeHash(record: ThemeRecord): Promise<string> {
    const bytes = new TextEncoder().encode(JSON.stringify(linkableRecord(record)));
    return THEME_LINK_PREFIX + toBase64Url(await transform(bytes, new CompressionStream('gzip')));
}

export async function decodeThemeHash(hash: string): Promise<ThemeRecord | null> {
    if (!hash.startsWith(THEME_LINK_PREFIX)) return null;
    let value: unknown;
    try {
        const bytes = await transform(fromBase64Url(hash.slice(THEME_LINK_PREFIX.length)), new DecompressionStream('gzip'));
        value = JSON.parse(new TextDecoder().decode(bytes));
    } catch {
        return null;
    }
    const check = validateThemeRecord(value);
    return check.ok ? linkableRecord(check.record) : null;
}
