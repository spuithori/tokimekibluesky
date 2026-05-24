/**
 * Image post-processing helpers shared by the Web Worker encoder
 * (worker.ts) and the main-thread fallback (fallback.ts).
 *
 * Every function operates on raw `ImageData` so it can be reused
 * regardless of whether the source canvas is an `OffscreenCanvas` or
 * a DOM `HTMLCanvasElement`.
 */

/**
 * Three-pixel horizontal box blur. Writes to `dst`; reads from `src`.
 * Endpoints (x=0, x=w-1) use a 2-sample window; interior pixels use 3.
 */
function horizontalBoxBlur3(
    src: Uint8ClampedArray,
    dst: Uint8ClampedArray,
    w: number,
    h: number,
): void {
    for (let y = 0; y < h; y++) {
        const rowOffset = y * w * 4;
        const idx0 = rowOffset;
        dst[idx0]     = (src[idx0]     + src[idx0 + 4]) / 2;
        dst[idx0 + 1] = (src[idx0 + 1] + src[idx0 + 5]) / 2;
        dst[idx0 + 2] = (src[idx0 + 2] + src[idx0 + 6]) / 2;
        dst[idx0 + 3] = src[idx0 + 3];

        const end = w - 1;
        for (let x = 1; x < end; x++) {
            const idx = rowOffset + x * 4;
            dst[idx]     = (src[idx - 4] + src[idx]     + src[idx + 4]) / 3;
            dst[idx + 1] = (src[idx - 3] + src[idx + 1] + src[idx + 5]) / 3;
            dst[idx + 2] = (src[idx - 2] + src[idx + 2] + src[idx + 6]) / 3;
            dst[idx + 3] = src[idx + 3];
        }

        if (w >= 2) {
            const idxE = rowOffset + end * 4;
            dst[idxE]     = (src[idxE - 4] + src[idxE]    ) / 2;
            dst[idxE + 1] = (src[idxE - 3] + src[idxE + 1]) / 2;
            dst[idxE + 2] = (src[idxE - 2] + src[idxE + 2]) / 2;
            dst[idxE + 3] = src[idxE + 3];
        }
    }
}

/**
 * Three-pixel vertical box blur. Writes to `dst`; reads from `src`.
 * Endpoints (y=0, y=h-1) use a 2-sample window; interior pixels use 3.
 */
function verticalBoxBlur3(
    src: Uint8ClampedArray,
    dst: Uint8ClampedArray,
    w: number,
    h: number,
): void {
    const stride = w * 4;

    for (let x = 0; x < w; x++) {
        const idx = x * 4;
        dst[idx]     = (src[idx]     + src[idx + stride]    ) / 2;
        dst[idx + 1] = (src[idx + 1] + src[idx + stride + 1]) / 2;
        dst[idx + 2] = (src[idx + 2] + src[idx + stride + 2]) / 2;
        dst[idx + 3] = src[idx + 3];
    }

    const endRow = h - 1;
    for (let y = 1; y < endRow; y++) {
        const rowOffset = y * stride;
        for (let x = 0; x < w; x++) {
            const idx = rowOffset + x * 4;
            const idxU = idx - stride;
            const idxD = idx + stride;
            dst[idx]     = (src[idxU]     + src[idx]     + src[idxD])     / 3;
            dst[idx + 1] = (src[idxU + 1] + src[idx + 1] + src[idxD + 1]) / 3;
            dst[idx + 2] = (src[idxU + 2] + src[idx + 2] + src[idxD + 2]) / 3;
            dst[idx + 3] = src[idx + 3];
        }
    }

    if (h >= 2) {
        const rowOffset = endRow * stride;
        for (let x = 0; x < w; x++) {
            const idx = rowOffset + x * 4;
            dst[idx]     = (src[idx - stride]     + src[idx]    ) / 2;
            dst[idx + 1] = (src[idx - stride + 1] + src[idx + 1]) / 2;
            dst[idx + 2] = (src[idx - stride + 2] + src[idx + 2]) / 2;
            dst[idx + 3] = src[idx + 3];
        }
    }
}

/**
 * Apply an in-place unsharp mask to RGB channels of an `ImageData`.
 *
 * Three passes of 3x3 separable box blur approximate a Gaussian blur,
 * then the residual `src - blurred` is added back scaled by `amount`.
 * Alpha is left untouched.
 *
 * The `_radius` parameter is accepted for API symmetry with the legacy
 * helper but is unused: the kernel is fixed at three taps.
 */
export function applyUnsharpMask(
    imageData: ImageData,
    _radius: number = 1,
    amount: number = 0.3,
): ImageData {
    const w = imageData.width;
    const h = imageData.height;
    const src = imageData.data;
    const n = src.length;

    let input = new Uint8ClampedArray(src);
    let output = new Uint8ClampedArray(n);

    for (let pass = 0; pass < 3; pass++) {
        horizontalBoxBlur3(input, output, w, h);
        let tmp = input; input = output; output = tmp;
        verticalBoxBlur3(input, output, w, h);
        tmp = input; input = output; output = tmp;
    }

    const blurred = input;

    for (let i = 0; i < n; i += 4) {
        src[i]     = src[i]     + amount * (src[i]     - blurred[i]);
        src[i + 1] = src[i + 1] + amount * (src[i + 1] - blurred[i + 1]);
        src[i + 2] = src[i + 2] + amount * (src[i + 2] - blurred[i + 2]);
    }

    return imageData;
}
