// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { WorkerInput } from './types';
import { compressFallback } from './fallback';

const closeSpy = vi.fn();

function makeInput(overrides: Partial<WorkerInput> = {}): WorkerInput {
    return {
        file: new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' }),
        originalSize: 3,
        maxWidthOrHeight: 2000,
        outputType: 'image/webp',
        maxSizeBytes: 2 * 1024 * 1024,
        initialQuality: 0.8,
        maxQuality: 0.95,
        minQuality: 0.7,
        maxIterations: 6,
        ...overrides,
    };
}

beforeEach(() => {
    closeSpy.mockClear();

    vi.stubGlobal('createImageBitmap', vi.fn(async () => ({
        width: 4000,
        height: 3000,
        close: closeSpy,
    } as unknown as ImageBitmap)));

    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
        throw new Error('canvas 2d context unavailable (test)');
    });
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
});

describe('compressFallback — ImageBitmap は例外経路でも必ず close される (H-2)', () => {
    it('サイズ上限ありのループ経路で処理が throw しても bitmap.close() に到達する', async () => {
        await expect(compressFallback(makeInput())).rejects.toThrow();
        expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('サイズ上限なしの短絡経路で処理が throw しても bitmap.close() に到達する', async () => {
        await expect(compressFallback(makeInput({ maxSizeBytes: undefined }))).rejects.toThrow();
        expect(closeSpy).toHaveBeenCalledTimes(1);
    });
});
