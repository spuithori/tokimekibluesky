/** Read a `Blob` and resolve to a `data:` URL containing its base64 bytes. */
export function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read blob as data URL'));
        reader.readAsDataURL(blob);
    });
}

/**
 * Compute target dimensions that fit inside a `maxWidthOrHeight` box
 * while preserving aspect ratio. Returns the original dimensions
 * unchanged when the image already fits.
 */
export function calcTargetDimensions(
    srcWidth: number,
    srcHeight: number,
    maxWidthOrHeight: number,
): { width: number; height: number } {
    if (srcWidth <= maxWidthOrHeight && srcHeight <= maxWidthOrHeight) {
        return { width: srcWidth, height: srcHeight };
    }
    const ratio = Math.min(maxWidthOrHeight / srcWidth, maxWidthOrHeight / srcHeight);
    return {
        width: Math.round(srcWidth * ratio),
        height: Math.round(srcHeight * ratio),
    };
}

export function nextResolutionForTarget(
    width: number,
    height: number,
    oversizedBytes: number,
    maxSizeBytes: number,
    minDimension: number,
): { width: number; height: number } | null {
    const SAFETY = 0.85;
    const MIN_STEP = 0.4;
    const MAX_STEP = 0.92;
    let scale = Math.sqrt((maxSizeBytes / oversizedBytes) * SAFETY);
    if (!(scale > 0) || scale >= 1) scale = MAX_STEP;
    scale = Math.min(MAX_STEP, Math.max(MIN_STEP, scale));
    const floorScale = minDimension / Math.max(width, height);
    if (floorScale >= 1) return null;
    scale = Math.max(scale, floorScale);
    return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function projectWebpQuality(
    maxSizeBytes: number,
    prevQ: number,
    prevSize: number,
    lo: number,
    hi: number,
): number {
    if (hi - lo < 2) return prevQ;
    const estimate = prevSize > 0
        ? Math.round(prevQ * maxSizeBytes / prevSize)
        : Math.round((lo + hi) / 2);
    return Math.max(lo + 1, Math.min(hi - 1, estimate));
}

const JPEG_SOF_MARKERS = new Set([
    0xc0, 0xc1, 0xc2, 0xc3,
    0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb,
    0xcd, 0xce, 0xcf,
]);

function jpegIntrinsicSize(b: Uint8Array): { width: number; height: number } | null {
    if (b.length < 4 || b[0] !== 0xff || b[1] !== 0xd8) return null;
    let i = 2;
    while (i < b.length - 1) {
        if (b[i] !== 0xff) return null;
        const marker = b[i + 1];
        if (marker === 0xff) { i++; continue; }
        if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { i += 2; continue; }
        if (marker === 0xd9 || marker === 0xda) return null;
        if (i + 4 > b.length) return null;
        const length = (b[i + 2] << 8) | b[i + 3];
        if (JPEG_SOF_MARKERS.has(marker)) {
            if (i + 9 > b.length) return null;
            const height = (b[i + 5] << 8) | b[i + 6];
            const width = (b[i + 7] << 8) | b[i + 8];
            return width > 0 && height > 0 ? { width, height } : null;
        }
        i += 2 + length;
    }
    return null;
}

function pngIntrinsicSize(b: Uint8Array): { width: number; height: number } | null {
    if (b.length < 24) return null;
    if (b[0] !== 0x89 || b[1] !== 0x50 || b[2] !== 0x4e || b[3] !== 0x47
        || b[4] !== 0x0d || b[5] !== 0x0a || b[6] !== 0x1a || b[7] !== 0x0a) return null;
    if (b[12] !== 0x49 || b[13] !== 0x48 || b[14] !== 0x44 || b[15] !== 0x52) return null;
    const width = (b[16] << 24 | b[17] << 16 | b[18] << 8 | b[19]) >>> 0;
    const height = (b[20] << 24 | b[21] << 16 | b[22] << 8 | b[23]) >>> 0;
    return width > 0 && height > 0 ? { width, height } : null;
}

function webpIntrinsicSize(b: Uint8Array): { width: number; height: number } | null {
    if (b.length < 30) return null;
    if (b[0] !== 0x52 || b[1] !== 0x49 || b[2] !== 0x46 || b[3] !== 0x46) return null;
    if (b[8] !== 0x57 || b[9] !== 0x45 || b[10] !== 0x42 || b[11] !== 0x50) return null;
    const fourcc = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (fourcc === 'VP8 ') {
        const width = ((b[26] | (b[27] << 8)) & 0x3fff);
        const height = ((b[28] | (b[29] << 8)) & 0x3fff);
        return width > 0 && height > 0 ? { width, height } : null;
    }
    if (fourcc === 'VP8L') {
        if (b[20] !== 0x2f) return null;
        const b0 = b[21], b1 = b[22], b2 = b[23], b3 = b[24];
        const width = 1 + (((b1 & 0x3f) << 8) | b0);
        const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
        return { width, height };
    }
    if (fourcc === 'VP8X') {
        const width = 1 + (b[24] | (b[25] << 8) | (b[26] << 16));
        const height = 1 + (b[27] | (b[28] << 8) | (b[29] << 16));
        return { width, height };
    }
    return null;
}

export async function getIntrinsicSize(blob: Blob): Promise<{ width: number; height: number } | null> {
    try {
        const b = new Uint8Array(await blob.slice(0, 131072).arrayBuffer());
        return jpegIntrinsicSize(b) ?? pngIntrinsicSize(b) ?? webpIntrinsicSize(b);
    } catch {
        return null;
    }
}

const HEIC_FTYP_BRANDS = new Set([
    'heic', 'heix', 'heim', 'heis',
    'hevc', 'hevx', 'hevm', 'hevs',
    'mif1', 'msf1',
]);

// iOS (through iOS 26) can hand the file picker raw HEIC bytes while still
// labelling File.type as image/jpeg, so the format must be sniffed from the
// ISO-BMFF ftyp header rather than trusted from the MIME type.
export async function isHeicImage(blob: Blob): Promise<boolean> {
    try {
        const header = new Uint8Array(await blob.slice(0, 32).arrayBuffer());
        if (header.length < 16) return false;
        // The ftyp box type occupies bytes 4-7.
        if (header[4] !== 0x66 || header[5] !== 0x74 || header[6] !== 0x79 || header[7] !== 0x70) {
            return false;
        }
        const brandAt = (offset: number): string => String.fromCharCode(
            header[offset], header[offset + 1], header[offset + 2], header[offset + 3],
        );
        const majorBrand = brandAt(8);
        if (majorBrand === 'avif' || majorBrand === 'avis') return false;
        if (HEIC_FTYP_BRANDS.has(majorBrand)) return true;
        // Compatible brands follow the major brand and minor version, 4 bytes each.
        for (let offset = 16; offset + 4 <= header.length; offset += 4) {
            if (HEIC_FTYP_BRANDS.has(brandAt(offset))) return true;
        }
        return false;
    } catch {
        return false;
    }
}
