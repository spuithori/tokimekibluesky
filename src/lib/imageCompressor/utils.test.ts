// @vitest-environment node
// jsdom's Blob lacks a working arrayBuffer(); Node's Blob is spec-compliant.
// FileReader is unavailable in node, so blobToDataUrl tests stub it (see below).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isHeicImage, calcTargetDimensions, blobToDataUrl } from './utils';

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

    it('detects a HEIC file with major brand "heim"', async () => {
        const blob = makeBlob([...BOX_SIZE, ...FTYP, ...ascii('heim'), ...MINOR]);
        expect(await isHeicImage(blob)).toBe(true);
    });

    it('detects a HEIC file with major brand "heis"', async () => {
        const blob = makeBlob([...BOX_SIZE, ...FTYP, ...ascii('heis'), ...MINOR]);
        expect(await isHeicImage(blob)).toBe(true);
    });

    it('detects an HEVC variant ("hevc")', async () => {
        const blob = makeBlob([...BOX_SIZE, ...FTYP, ...ascii('hevc'), ...MINOR]);
        expect(await isHeicImage(blob)).toBe(true);
    });

    it('detects an HEVC variant ("hevx")', async () => {
        const blob = makeBlob([...BOX_SIZE, ...FTYP, ...ascii('hevx'), ...MINOR]);
        expect(await isHeicImage(blob)).toBe(true);
    });

    it('detects HEIC images that only declare "mif1" major brand', async () => {
        const blob = makeBlob([...BOX_SIZE, ...FTYP, ...ascii('mif1'), ...MINOR]);
        expect(await isHeicImage(blob)).toBe(true);
    });

    it('detects "msf1" as a HEIF sequence variant', async () => {
        const blob = makeBlob([...BOX_SIZE, ...FTYP, ...ascii('msf1'), ...MINOR]);
        expect(await isHeicImage(blob)).toBe(true);
    });

    it('detects HEIC declared only in a compatible brand', async () => {
        const blob = makeBlob([...BOX_SIZE, ...FTYP, ...ascii('mp41'), ...MINOR, ...ascii('isom'), ...ascii('heic')]);
        expect(await isHeicImage(blob)).toBe(true);
    });

    it('detects HEIC declared as the second compatible brand', async () => {
        const blob = makeBlob([...BOX_SIZE, ...FTYP, ...ascii('mp42'), ...MINOR, ...ascii('isom'), ...ascii('heic')]);
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

    it('does not flag an AVIS (AVIF image sequence)', async () => {
        const blob = makeBlob([...BOX_SIZE, ...FTYP, ...ascii('avis'), ...MINOR, ...ascii('mif1')], 'image/avif');
        expect(await isHeicImage(blob)).toBe(false);
    });

    it('does not flag an unrelated MP4 ftyp box (no HEIC brand anywhere)', async () => {
        const blob = makeBlob([...BOX_SIZE, ...FTYP, ...ascii('mp42'), ...MINOR, ...ascii('isom'), ...ascii('mp42')]);
        expect(await isHeicImage(blob)).toBe(false);
    });

    it('returns false when ftyp marker is at the wrong offset', async () => {
        // 'ftyp' at offset 8 instead of 4
        const blob = makeBlob([
            0x00, 0x00, 0x00, 0x20,
            0x00, 0x00, 0x00, 0x00,
            ...FTYP, ...ascii('heic'), ...MINOR,
        ]);
        expect(await isHeicImage(blob)).toBe(false);
    });

    it('returns false for an empty blob', async () => {
        const blob = makeBlob([]);
        expect(await isHeicImage(blob)).toBe(false);
    });

    it('returns false for input shorter than an ftyp header', async () => {
        const blob = makeBlob([0x00, 0x00, 0x00]);
        expect(await isHeicImage(blob)).toBe(false);
    });

    it('returns false for input exactly 15 bytes (below 16-byte minimum)', async () => {
        const blob = makeBlob(new Array(15).fill(0));
        expect(await isHeicImage(blob)).toBe(false);
    });

    it('does not throw and returns false when blob.arrayBuffer() rejects', async () => {
        const brokenBlob = {
            slice: () => ({
                arrayBuffer: () => Promise.reject(new Error('IO failed')),
            }),
        } as unknown as Blob;
        expect(await isHeicImage(brokenBlob)).toBe(false);
    });
});

describe('calcTargetDimensions', () => {
    it('returns source dimensions unchanged when both axes are within the limit', () => {
        expect(calcTargetDimensions(800, 600, 2000)).toEqual({ width: 800, height: 600 });
    });

    it('returns source dimensions unchanged at exact equality with the limit', () => {
        expect(calcTargetDimensions(2000, 2000, 2000)).toEqual({ width: 2000, height: 2000 });
    });

    it('scales down a landscape image keeping aspect ratio (wider axis dominates)', () => {
        const result = calcTargetDimensions(4000, 2000, 2000);
        expect(result.width).toBe(2000);
        expect(result.height).toBe(1000);
    });

    it('scales down a portrait image keeping aspect ratio (taller axis dominates)', () => {
        const result = calcTargetDimensions(2000, 4000, 2000);
        expect(result.width).toBe(1000);
        expect(result.height).toBe(2000);
    });

    it('scales down a square image proportionally', () => {
        expect(calcTargetDimensions(4000, 4000, 2000)).toEqual({ width: 2000, height: 2000 });
    });

    it('rounds non-integer results', () => {
        // 3000 / 1000 = 3.0 -> 3:1 ratio; scaling to maxWH=2000 -> 2000x666.67 -> 667
        const result = calcTargetDimensions(3000, 1000, 2000);
        expect(result.width).toBe(2000);
        expect(result.height).toBe(667);
    });

    it('handles extreme aspect ratios without distortion', () => {
        // 3840x1 ratio scaled to 2000 should yield 2000 wide
        const result = calcTargetDimensions(3840, 1, 2000);
        expect(result.width).toBe(2000);
        // 3840 -> 2000 means scale = 2000/3840 ≈ 0.5208; height 1*0.5208 ≈ 0.52 -> rounds to 1
        expect(result.height).toBe(1);
    });

    it('preserves aspect ratio for moderate downscaling', () => {
        const result = calcTargetDimensions(3000, 1500, 2000);
        expect(result.width).toBe(2000);
        expect(result.height).toBe(1000);
    });

    it('does not upscale when source is smaller than max', () => {
        expect(calcTargetDimensions(100, 50, 2000)).toEqual({ width: 100, height: 50 });
    });

    it('returns source unchanged when one axis equals the limit and the other is smaller', () => {
        expect(calcTargetDimensions(2000, 1000, 2000)).toEqual({ width: 2000, height: 1000 });
        expect(calcTargetDimensions(1000, 2000, 2000)).toEqual({ width: 1000, height: 2000 });
    });

    it('scales correctly at the limit boundary +1', () => {
        // 2001x1000 must downscale: ratio = 2000/2001 ≈ 0.9995, result ≈ 2000x999.5 -> 2000x1000
        const result = calcTargetDimensions(2001, 1000, 2000);
        expect(result.width).toBe(2000);
        // 1000 * (2000/2001) ≈ 999.5 → rounds to 1000
        expect(result.height).toBe(1000);
    });
});

describe('blobToDataUrl', () => {
    // jsdom's FileReader is available but its Blob.arrayBuffer() is broken (forcing
    // this file to node env); FileReader itself is not in node. Stub it minimally.
    let originalFileReader: typeof FileReader | undefined;

    interface StubInstance {
        result: string | null;
        onload: (() => void) | null;
        onerror: ((err?: unknown) => void) | null;
        readAsDataURL: (blob: Blob) => void;
    }

    function installStub(opts: {
        succeed?: (blob: Blob) => string;
        fail?: boolean;
    }): void {
        const StubFR = function (this: StubInstance) {
            this.result = null;
            this.onload = null;
            this.onerror = null;
            this.readAsDataURL = (blob: Blob) => {
                queueMicrotask(() => {
                    if (opts.fail) {
                        this.onerror?.();
                    } else {
                        this.result = opts.succeed!(blob);
                        this.onload?.();
                    }
                });
            };
        } as unknown as typeof FileReader;
        (globalThis as { FileReader?: typeof FileReader }).FileReader = StubFR;
    }

    beforeEach(() => {
        originalFileReader = (globalThis as { FileReader?: typeof FileReader }).FileReader;
    });

    afterEach(() => {
        if (originalFileReader === undefined) {
            delete (globalThis as { FileReader?: typeof FileReader }).FileReader;
        } else {
            (globalThis as { FileReader?: typeof FileReader }).FileReader = originalFileReader;
        }
    });

    it('resolves with a data URL when FileReader.onload fires', async () => {
        installStub({ succeed: () => 'data:image/png;base64,AAAA' });
        const result = await blobToDataUrl(new Blob(['x'], { type: 'image/png' }));
        expect(result).toBe('data:image/png;base64,AAAA');
    });

    it('rejects with a descriptive Error when FileReader.onerror fires', async () => {
        installStub({ fail: true });
        await expect(blobToDataUrl(new Blob(['x']))).rejects.toThrow('Failed to read blob as data URL');
    });

    it('resolves with empty data URL for empty Blob', async () => {
        installStub({ succeed: () => 'data:;base64,' });
        const result = await blobToDataUrl(new Blob([], { type: '' }));
        expect(result).toBe('data:;base64,');
    });

    it('passes the original blob to readAsDataURL', async () => {
        let captured: Blob | null = null;
        installStub({
            succeed: (blob) => {
                captured = blob;
                return 'data:text/plain;base64,Zm9v';
            },
        });
        const input = new Blob(['foo'], { type: 'text/plain' });
        await blobToDataUrl(input);
        expect(captured).toBe(input);
    });

    it('returns a Promise (does not throw synchronously)', () => {
        installStub({ succeed: () => 'data:,' });
        const p = blobToDataUrl(new Blob(['x']));
        expect(p).toBeInstanceOf(Promise);
    });
});
