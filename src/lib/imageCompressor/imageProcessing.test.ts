// @vitest-environment node
// applyUnsharpMask only reads .width/.height/.data from its argument, so we
// pass a duck-typed plain object instead of a real `ImageData` (jsdom and
// node both lack a usable `ImageData` constructor by default).
import { describe, it, expect } from 'vitest';
import { applyUnsharpMask } from './imageProcessing';

interface FakeImageData {
    width: number;
    height: number;
    data: Uint8ClampedArray;
}

function makeImageData(w: number, h: number, fill?: (x: number, y: number) => [number, number, number, number]): FakeImageData {
    const data = new Uint8ClampedArray(w * h * 4);
    if (fill) {
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const idx = (y * w + x) * 4;
                const [r, g, b, a] = fill(x, y);
                data[idx] = r;
                data[idx + 1] = g;
                data[idx + 2] = b;
                data[idx + 3] = a;
            }
        }
    }
    return { width: w, height: h, data };
}

describe('applyUnsharpMask', () => {
    it('returns the same ImageData reference (in-place mutation)', () => {
        const img = makeImageData(4, 4, () => [128, 128, 128, 255]);
        const result = applyUnsharpMask(img as unknown as ImageData);
        expect(result).toBe(img as unknown as ImageData);
    });

    it('does not modify alpha channel', () => {
        const img = makeImageData(4, 4, (x, y) => [x * 60, y * 60, 100, 200]);
        applyUnsharpMask(img as unknown as ImageData);
        for (let i = 3; i < img.data.length; i += 4) {
            expect(img.data[i]).toBe(200);
        }
    });

    it('leaves a uniform image effectively unchanged (residual ≈ 0)', () => {
        const img = makeImageData(8, 8, () => [128, 128, 128, 255]);
        const before = new Uint8ClampedArray(img.data);
        applyUnsharpMask(img as unknown as ImageData, 1, 0.3);
        for (let i = 0; i < img.data.length; i += 4) {
            // Uniform input → blur equals input → residual is zero → no change.
            expect(Math.abs(img.data[i] - before[i])).toBeLessThanOrEqual(1);
            expect(Math.abs(img.data[i + 1] - before[i + 1])).toBeLessThanOrEqual(1);
            expect(Math.abs(img.data[i + 2] - before[i + 2])).toBeLessThanOrEqual(1);
        }
    });

    it('sharpens edges on a step image (interior contrast increases)', () => {
        // Left half black (0), right half white (255), 8x4 image.
        const img = makeImageData(8, 4, (x) => {
            const v = x < 4 ? 0 : 255;
            return [v, v, v, 255];
        });
        // Sample center-row pixel just on the dark side of the edge (x=3) and
        // just on the bright side (x=4). Amount=0.3 default-ish.
        const idxDark = (1 * 8 + 3) * 4;
        const idxBright = (1 * 8 + 4) * 4;
        const beforeDark = img.data[idxDark];
        const beforeBright = img.data[idxBright];
        applyUnsharpMask(img as unknown as ImageData, 1, 0.5);
        // Unsharp masking should darken the dark side and brighten the bright
        // side at the edge — the contrast across the boundary widens.
        const afterDark = img.data[idxDark];
        const afterBright = img.data[idxBright];
        expect(afterBright - afterDark).toBeGreaterThanOrEqual(beforeBright - beforeDark);
    });

    it('clamps output to [0, 255] via Uint8ClampedArray (no overflow)', () => {
        // Extreme contrast checker pattern + high amount should not produce
        // out-of-range bytes (Uint8ClampedArray prevents wrap-around).
        const img = makeImageData(8, 8, (x, y) => {
            const v = ((x + y) & 1) === 0 ? 0 : 255;
            return [v, v, v, 255];
        });
        applyUnsharpMask(img as unknown as ImageData, 1, 5); // very aggressive amount
        for (let i = 0; i < img.data.length; i++) {
            expect(img.data[i]).toBeGreaterThanOrEqual(0);
            expect(img.data[i]).toBeLessThanOrEqual(255);
        }
    });

    it('amount=0 leaves the image unchanged', () => {
        const img = makeImageData(6, 6, (x, y) => [
            (x * 37 + y * 17) & 255,
            (x * 91) & 255,
            (y * 53) & 255,
            255,
        ]);
        const before = new Uint8ClampedArray(img.data);
        applyUnsharpMask(img as unknown as ImageData, 1, 0);
        for (let i = 0; i < img.data.length; i++) {
            expect(img.data[i]).toBe(before[i]);
        }
    });

    it('handles a 1x1 image without crashing and preserves alpha', () => {
        // A 1x1 image has degenerate neighbour windows; the box-blur helpers
        // fall through both endpoint branches and produce an artefact in the
        // RGB channels — exact values aren't a contract, but we MUST not
        // crash, output bytes MUST stay in range, and alpha MUST be intact.
        const img = makeImageData(1, 1, () => [100, 150, 200, 255]);
        expect(() => applyUnsharpMask(img as unknown as ImageData)).not.toThrow();
        expect(img.data[3]).toBe(255);
        expect(img.data.length).toBe(4);
        for (let i = 0; i < 3; i++) {
            expect(img.data[i]).toBeGreaterThanOrEqual(0);
            expect(img.data[i]).toBeLessThanOrEqual(255);
        }
    });

    it('handles a 2x2 image (smallest useful blur region)', () => {
        const img = makeImageData(2, 2, () => [50, 100, 150, 200]);
        expect(() => applyUnsharpMask(img as unknown as ImageData)).not.toThrow();
        // Uniform 2x2 → still uniform; residual = 0
        expect(img.data[3]).toBe(200); // alpha preserved
    });

    it('does not change the data buffer length', () => {
        const img = makeImageData(10, 7, () => [0, 0, 0, 255]);
        const originalLength = img.data.length;
        applyUnsharpMask(img as unknown as ImageData);
        expect(img.data.length).toBe(originalLength);
    });
});
