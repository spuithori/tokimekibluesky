export function blobToDataUrl(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read blob as data URL'));
        reader.readAsDataURL(blob);
    });
}

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
