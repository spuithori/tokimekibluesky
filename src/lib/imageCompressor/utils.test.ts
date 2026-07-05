// @vitest-environment node
// jsdom's Blob lacks a working arrayBuffer(); Node's Blob is spec-compliant.
// FileReader is unavailable in node, so blobToDataUrl tests stub it (see below).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isHeicImage, calcTargetDimensions, blobToDataUrl, getIntrinsicSize, projectWebpQuality, nextResolutionForTarget } from './utils';

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

describe('getIntrinsicSize', () => {
    const SOF_TAIL = [0x00, 0x11, 0x08, 0x02, 0x58, 0x03, 0x20];

    it('reads JPEG SOF0 dimensions', async () => {
        const blob = makeBlob([0xff, 0xd8, 0xff, 0xc0, ...SOF_TAIL]);
        expect(await getIntrinsicSize(blob)).toEqual({ width: 800, height: 600 });
    });

    it('reads JPEG SOF2 (progressive) dimensions', async () => {
        const blob = makeBlob([0xff, 0xd8, 0xff, 0xc2, ...SOF_TAIL]);
        expect(await getIntrinsicSize(blob)).toEqual({ width: 800, height: 600 });
    });

    it('scans past a leading APP1/EXIF segment to find SOF', async () => {
        const blob = makeBlob([
            0xff, 0xd8,
            0xff, 0xe1, 0x00, 0x06, 0xaa, 0xbb, 0xcc, 0xdd,
            0xff, 0xc0, ...SOF_TAIL,
        ]);
        expect(await getIntrinsicSize(blob)).toEqual({ width: 800, height: 600 });
    });

    it('reads PNG IHDR dimensions', async () => {
        const blob = makeBlob([
            0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
            0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
            0x00, 0x00, 0x03, 0x20, 0x00, 0x00, 0x02, 0x58,
        ]);
        expect(await getIntrinsicSize(blob)).toEqual({ width: 800, height: 600 });
    });

    it('reads WebP lossy (VP8 ) dimensions', async () => {
        const blob = makeBlob([
            0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
            0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x9d, 0x01, 0x2a, 0x20, 0x03, 0x58, 0x02,
        ]);
        expect(await getIntrinsicSize(blob)).toEqual({ width: 800, height: 600 });
    });

    it('reads WebP lossless (VP8L) dimensions', async () => {
        const blob = makeBlob([
            0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
            0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x4c,
            0x00, 0x00, 0x00, 0x00,
            0x2f, 0x1f, 0xc3, 0x95, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x00,
        ]);
        expect(await getIntrinsicSize(blob)).toEqual({ width: 800, height: 600 });
    });

    it('reads WebP extended (VP8X) canvas dimensions', async () => {
        const blob = makeBlob([
            0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
            0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58,
            0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
            0x1f, 0x03, 0x00, 0x57, 0x02, 0x00,
        ]);
        expect(await getIntrinsicSize(blob)).toEqual({ width: 800, height: 600 });
    });

    it('returns null for HEIC', async () => {
        const blob = makeBlob([...BOX_SIZE, ...FTYP, ...ascii('heic'), ...MINOR, ...ascii('mif1')]);
        expect(await getIntrinsicSize(blob)).toBeNull();
    });

    it('returns null for truncated JPEG (no SOF)', async () => {
        const blob = makeBlob([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00]);
        expect(await getIntrinsicSize(blob)).toBeNull();
    });

    it('returns null for garbage bytes', async () => {
        const blob = makeBlob([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08]);
        expect(await getIntrinsicSize(blob)).toBeNull();
    });

    it('returns null for an empty blob', async () => {
        expect(await getIntrinsicSize(makeBlob([]))).toBeNull();
    });

    it('does not throw and returns null when arrayBuffer rejects', async () => {
        const broken = {
            slice: () => ({ arrayBuffer: () => Promise.reject(new Error('IO failed')) }),
        } as unknown as Blob;
        expect(await getIntrinsicSize(broken)).toBeNull();
    });

    function exifApp1(orientation: number, little = true): number[] {
        const tiff = little
            ? [0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00]
            : [0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08];
        const entryCount = little ? [0x01, 0x00] : [0x00, 0x01];
        const entry = little
            ? [0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, orientation, 0x00, 0x00, 0x00]
            : [0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, orientation, 0x00, 0x00];
        const payload = [...ascii('Exif'), 0x00, 0x00, ...tiff, ...entryCount, ...entry, 0x00, 0x00, 0x00, 0x00];
        const length = payload.length + 2;
        return [0xff, 0xe1, (length >> 8) & 0xff, length & 0xff, ...payload];
    }

    it('reads EXIF orientation 6 (little-endian TIFF) from a portrait JPEG', async () => {
        const blob = makeBlob([0xff, 0xd8, ...exifApp1(6), 0xff, 0xc0, ...SOF_TAIL]);
        expect(await getIntrinsicSize(blob)).toEqual({ width: 800, height: 600, orientation: 6 });
    });

    it('reads EXIF orientation 3 (big-endian TIFF)', async () => {
        const blob = makeBlob([0xff, 0xd8, ...exifApp1(3, false), 0xff, 0xc0, ...SOF_TAIL]);
        expect(await getIntrinsicSize(blob)).toEqual({ width: 800, height: 600, orientation: 3 });
    });

    it('reads EXIF orientation 1 explicitly', async () => {
        const blob = makeBlob([0xff, 0xd8, ...exifApp1(1), 0xff, 0xc0, ...SOF_TAIL]);
        expect(await getIntrinsicSize(blob)).toEqual({ width: 800, height: 600, orientation: 1 });
    });

    it('skips a non-EXIF APP1 (XMP) and reads orientation from a later EXIF APP1', async () => {
        const xmpPayload = ascii('http://ns.adobe.com/xap/1.0/');
        const xmpLength = xmpPayload.length + 2;
        const xmpApp1 = [0xff, 0xe1, (xmpLength >> 8) & 0xff, xmpLength & 0xff, ...xmpPayload];
        const blob = makeBlob([0xff, 0xd8, ...xmpApp1, ...exifApp1(8), 0xff, 0xc0, ...SOF_TAIL]);
        expect(await getIntrinsicSize(blob)).toEqual({ width: 800, height: 600, orientation: 8 });
    });

    it('leaves orientation undefined for an out-of-range orientation value', async () => {
        const blob = makeBlob([0xff, 0xd8, ...exifApp1(9), 0xff, 0xc0, ...SOF_TAIL]);
        expect(await getIntrinsicSize(blob)).toEqual({ width: 800, height: 600 });
    });

    it('leaves orientation undefined for a malformed EXIF payload', async () => {
        const blob = makeBlob([
            0xff, 0xd8,
            0xff, 0xe1, 0x00, 0x06, 0xaa, 0xbb, 0xcc, 0xdd,
            0xff, 0xc0, ...SOF_TAIL,
        ]);
        expect(await getIntrinsicSize(blob)).toEqual({ width: 800, height: 600 });
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

describe('projectWebpQuality', () => {
    it('projects lower quality when the previous encode overshot the target', () => {
        expect(projectWebpQuality(1000, 90, 2000, 70, 89)).toBe(71);
    });

    it('lands inside the bracket for a near-target overshoot', () => {
        expect(projectWebpQuality(1000, 85, 1100, 70, 84)).toBe(77);
    });

    it('clamps an over-large estimate to hi - 1', () => {
        expect(projectWebpQuality(10000, 80, 1000, 70, 84)).toBe(83);
    });

    it('clamps an under-small estimate to lo + 1', () => {
        expect(projectWebpQuality(100, 80, 2000, 70, 84)).toBe(71);
    });

    it('returns prevQ when the bracket has no integer room (signals stop)', () => {
        expect(projectWebpQuality(1000, 80, 1500, 75, 76)).toBe(80);
        expect(projectWebpQuality(1000, 80, 1500, 75, 75)).toBe(80);
    });

    it('falls back to the midpoint when prevSize is zero', () => {
        expect(projectWebpQuality(1000, 80, 0, 70, 90)).toBe(80);
    });

    it('always returns a value strictly inside the bracket when room exists', () => {
        for (const prevSize of [500, 1000, 1500, 3000]) {
            const q = projectWebpQuality(1000, 88, prevSize, 70, 88);
            expect(q).toBeGreaterThan(70);
            expect(q).toBeLessThan(88);
        }
    });
});

describe('nextResolutionForTarget', () => {
    it('reduces hard when the floor size is far over target (clamped near MIN_STEP)', () => {
        expect(nextResolutionForTarget(4000, 3000, 10_000_000, 2_000_000, 320)).toEqual({ width: 1649, height: 1237 });
    });

    it('reduces gently when only slightly over target', () => {
        expect(nextResolutionForTarget(4000, 3000, 2_100_000, 2_000_000, 320)).toEqual({ width: 3599, height: 2699 });
    });

    it('never reduces by less than MAX_STEP even at a marginal overshoot', () => {
        expect(nextResolutionForTarget(1000, 1000, 1_000_001, 1_000_000, 320)).toEqual({ width: 920, height: 920 });
    });

    it('clamps the jump so the larger axis never drops below the floor', () => {
        expect(nextResolutionForTarget(400, 300, 10_000_000, 2_000_000, 320)).toEqual({ width: 320, height: 240 });
    });

    it('returns null once already at or below the floor', () => {
        expect(nextResolutionForTarget(320, 240, 10_000_000, 2_000_000, 320)).toBeNull();
        expect(nextResolutionForTarget(300, 200, 10_000_000, 2_000_000, 320)).toBeNull();
    });

    it('guards a degenerate scale >= 1 (oversized not actually over) to MAX_STEP', () => {
        expect(nextResolutionForTarget(1000, 1000, 1_000_000, 2_000_000, 320)).toEqual({ width: 920, height: 920 });
    });

    it('always makes progress (smaller than current) across a range of overshoots', () => {
        for (const oversized of [2_100_000, 5_000_000, 20_000_000]) {
            const r = nextResolutionForTarget(2000, 1500, oversized, 2_000_000, 320);
            expect(r).not.toBeNull();
            expect(Math.max(r!.width, r!.height)).toBeLessThan(2000);
        }
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
