// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { WorkerInput } from './types';
import { compressImageWithStats, compressForPreview } from './compressor';

const compressFallback = vi.hoisted(() => vi.fn());
vi.mock('./fallback', () => ({ compressFallback }));

function ascii(s: string): number[] {
    return Array.from(s, (c) => c.charCodeAt(0));
}

const SOF_TAIL = [0x00, 0x11, 0x08, 0x02, 0x58, 0x03, 0x20];

function exifApp1(orientation: number): number[] {
    const payload = [
        ...ascii('Exif'), 0x00, 0x00,
        0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
        0x01, 0x00,
        0x12, 0x01, 0x03, 0x00, 0x01, 0x00, 0x00, 0x00, orientation, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00,
    ];
    const length = payload.length + 2;
    return [0xff, 0xe1, (length >> 8) & 0xff, length & 0xff, ...payload];
}

function jpegBlob(orientation?: number): Blob {
    const bytes = orientation === undefined
        ? [0xff, 0xd8, 0xff, 0xc0, ...SOF_TAIL]
        : [0xff, 0xd8, ...exifApp1(orientation), 0xff, 0xc0, ...SOF_TAIL];
    return new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' });
}

beforeEach(() => {
    compressFallback.mockReset();
    compressFallback.mockImplementation(async (input: WorkerInput) => ({
        blob: new Blob([new Uint8Array([1])], { type: 'image/webp' }),
        width: input.targetWidth ?? 320,
        height: input.targetHeight ?? 240,
        timings: {},
    }));
});

describe('compressImageWithStats orientation gating', () => {
    it('short-circuits an upright JPEG that fits size and dimension limits', async () => {
        const stats = await compressImageWithStats(jpegBlob(), { maxSizeMB: 2, maxWidthOrHeight: 2000 });
        expect(compressFallback).not.toHaveBeenCalled();
        expect(stats.width).toBe(800);
        expect(stats.height).toBe(600);
    });

    it('short-circuits a JPEG with explicit orientation 1', async () => {
        const stats = await compressImageWithStats(jpegBlob(1), { maxSizeMB: 2, maxWidthOrHeight: 2000 });
        expect(compressFallback).not.toHaveBeenCalled();
        expect(stats.timings.shortCircuit).toBe(1);
    });

    it('re-encodes an EXIF-rotated JPEG even when it fits the limits', async () => {
        await compressImageWithStats(jpegBlob(6), { maxSizeMB: 2, maxWidthOrHeight: 2000 });
        expect(compressFallback).toHaveBeenCalledTimes(1);
    });

    it('withholds fused resize targets for an EXIF-rotated JPEG', async () => {
        await compressImageWithStats(jpegBlob(6), { maxSizeMB: 2, maxWidthOrHeight: 500 });
        const input = compressFallback.mock.calls[0][0] as WorkerInput;
        expect(input.targetWidth).toBeUndefined();
        expect(input.targetHeight).toBeUndefined();
        expect(input.maxWidthOrHeight).toBe(500);
    });

    it('passes fused resize targets for an oversized upright JPEG', async () => {
        await compressImageWithStats(jpegBlob(), { maxSizeMB: 2, maxWidthOrHeight: 500 });
        const input = compressFallback.mock.calls[0][0] as WorkerInput;
        expect(input.targetWidth).toBe(500);
        expect(input.targetHeight).toBe(375);
    });

    it('treats mirrored orientations (2-4) as non-upright', async () => {
        await compressImageWithStats(jpegBlob(2), { maxSizeMB: 2, maxWidthOrHeight: 2000 });
        expect(compressFallback).toHaveBeenCalledTimes(1);
        const input = compressFallback.mock.calls[0][0] as WorkerInput;
        expect(input.targetWidth).toBeUndefined();
    });
});

describe('compressForPreview orientation gating', () => {
    it('withholds targets for an EXIF-rotated JPEG', async () => {
        await compressForPreview(jpegBlob(8), { maxWidthOrHeight: 400 });
        const input = compressFallback.mock.calls[0][0] as WorkerInput;
        expect(input.targetWidth).toBeUndefined();
        expect(input.targetHeight).toBeUndefined();
    });

    it('passes targets for an upright JPEG', async () => {
        await compressForPreview(jpegBlob(), { maxWidthOrHeight: 400 });
        const input = compressFallback.mock.calls[0][0] as WorkerInput;
        expect(input.targetWidth).toBe(400);
        expect(input.targetHeight).toBe(300);
    });
});
