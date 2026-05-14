// @vitest-environment node
// jsdom's Blob lacks a working arrayBuffer(); Node's Blob is spec-compliant.
import { describe, it, expect } from 'vitest';
import { isHeicImage } from './utils';

function ascii(s: string): number[] {
    return Array.from(s, (c) => c.charCodeAt(0));
}

function makeBlob(bytes: number[], type = ''): Blob {
    return new Blob([new Uint8Array(bytes)], { type });
}

// box size (4) + 'ftyp' (4) + major brand (4) + minor version (4)
const BOX_SIZE = [0x00, 0x00, 0x00, 0x20];
const FTYP = ascii('ftyp');
const MINOR = [0x00, 0x00, 0x00, 0x00];

describe('isHeicImage', () => {
    it('detects a HEIC file with major brand "heic"', async () => {
        const blob = makeBlob([...BOX_SIZE, ...FTYP, ...ascii('heic'), ...MINOR, ...ascii('mif1')]);
        expect(await isHeicImage(blob)).toBe(true);
    });

    it('detects a HEIC file with major brand "heix"', async () => {
        const blob = makeBlob([...BOX_SIZE, ...FTYP, ...ascii('heix'), ...MINOR]);
        expect(await isHeicImage(blob)).toBe(true);
    });

    it('detects HEIC declared only in a compatible brand', async () => {
        const blob = makeBlob([...BOX_SIZE, ...FTYP, ...ascii('mp41'), ...MINOR, ...ascii('isom'), ...ascii('heic')]);
        expect(await isHeicImage(blob)).toBe(true);
    });

    it('sniffs the bytes regardless of the File.type label (iOS mislabels HEIC as image/jpeg)', async () => {
        const blob = makeBlob([...BOX_SIZE, ...FTYP, ...ascii('heic'), ...MINOR], 'image/jpeg');
        expect(await isHeicImage(blob)).toBe(true);
    });

    it('does not flag a real JPEG', async () => {
        const blob = makeBlob(
            [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01],
            'image/jpeg',
        );
        expect(await isHeicImage(blob)).toBe(false);
    });

    it('does not flag a PNG', async () => {
        const blob = makeBlob(
            [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52],
            'image/png',
        );
        expect(await isHeicImage(blob)).toBe(false);
    });

    it('does not flag an AVIF (ftyp box but "avif" major brand)', async () => {
        const blob = makeBlob([...BOX_SIZE, ...FTYP, ...ascii('avif'), ...MINOR, ...ascii('mif1')], 'image/avif');
        expect(await isHeicImage(blob)).toBe(false);
    });

    it('returns false for input shorter than an ftyp header', async () => {
        const blob = makeBlob([0x00, 0x00, 0x00]);
        expect(await isHeicImage(blob)).toBe(false);
    });
});
