import { LIMITS } from '../format';

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const AUTO_KEYWORD = 'Software';
const AUTO_VALUE = 'TOKIMEKI Theme Builder';

export const ICON_UPLOAD_SIZE = 512;
export const COVER_WIDTH = 1500;
export const COVER_HEIGHT = 500;

let crcTable: Uint32Array | null = null;

function crc32(bytes: Uint8Array): number {
    if (!crcTable) {
        crcTable = new Uint32Array(256);
        for (let n = 0; n < 256; n++) {
            let c = n;
            for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
            crcTable[n] = c >>> 0;
        }
    }
    let crc = 0xffffffff;
    for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    return (crc ^ 0xffffffff) >>> 0;
}

function isPng(bytes: Uint8Array): boolean {
    return bytes.length > 33 && PNG_SIGNATURE.every((b, i) => bytes[i] === b);
}

function readUint32(bytes: Uint8Array, offset: number): number {
    return ((bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3]) >>> 0;
}

function textChunk(keyword: string, value: string): Uint8Array {
    const data = new TextEncoder().encode(`tEXt${keyword}\0${value}`);
    const chunk = new Uint8Array(data.length + 8);
    const view = new DataView(chunk.buffer);
    view.setUint32(0, data.length - 4);
    chunk.set(data, 4);
    view.setUint32(data.length + 4, crc32(data));
    return chunk;
}

export function markAutoIcon(png: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
    if (!isPng(png)) return png;
    const afterHeader = 8 + 12 + readUint32(png, 8);
    const chunk = textChunk(AUTO_KEYWORD, AUTO_VALUE);
    const out = new Uint8Array(png.length + chunk.length);
    out.set(png.subarray(0, afterHeader), 0);
    out.set(chunk, afterHeader);
    out.set(png.subarray(afterHeader), afterHeader + chunk.length);
    return out;
}

export function isAutoIcon(bytes: Uint8Array): boolean {
    if (!isPng(bytes)) return false;
    const expected = `${AUTO_KEYWORD}\0${AUTO_VALUE}`;
    const decoder = new TextDecoder('latin1');
    let offset = 8;
    while (offset + 8 <= bytes.length) {
        const length = readUint32(bytes, offset);
        const type = decoder.decode(bytes.subarray(offset + 4, offset + 8));
        if (type === 'IDAT' || type === 'IEND') return false;
        if (type === 'tEXt' && decoder.decode(bytes.subarray(offset + 8, offset + 8 + length)) === expected) return true;
        offset += 12 + length;
    }
    return false;
}

async function encode(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function fitImage(source: Blob, width: number, height: number): Promise<Blob> {
    const bitmap = await createImageBitmap(source, { resizeWidth: width, resizeHeight: height, resizeQuality: 'high' });
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d is not available');
    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();
    for (const quality of [0.9, 0.8, 0.7, 0.6]) {
        const webp = await encode(canvas, 'image/webp', quality);
        const blob = webp?.type === 'image/webp' ? webp : await encode(canvas, 'image/jpeg', quality);
        if (blob && blob.size <= LIMITS.previewSize) return blob;
    }
    throw new Error('the image is too large');
}
