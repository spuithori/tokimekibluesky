import type { WebpEncodeResult, WorkerInput, WorkerOutput } from './types';
import { applyUnsharpMask } from './imageProcessing';
import { calcTargetDimensions, projectWebpQuality, nextResolutionForTarget } from './utils';

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (blob) resolve(blob);
                else reject(new Error('toBlob returned null'));
            },
            type,
            quality,
        );
    });
}

let webpBlobSupported: boolean | null = null;

async function encodeCanvasBlob(
    canvas: HTMLCanvasElement,
    requestedType: string,
    quality: number,
): Promise<Blob> {
    let canvasType = requestedType;

    if (canvasType === 'image/webp' && webpBlobSupported === false) {
        canvasType = 'image/jpeg';
    }

    const blob = await canvasToBlob(canvas, canvasType, quality);

    if (canvasType === 'image/webp') {
        if (blob.type !== 'image/webp') {
            webpBlobSupported = false;
            return await canvasToBlob(canvas, 'image/jpeg', quality);
        }
        webpBlobSupported = true;
    }

    return blob;
}

function resizeToCanvas(
    source: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
    targetWidth: number,
    targetHeight: number,
): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
    return canvas;
}

/**
 * Read the canvas pixels into an `ImageData`, apply the shared
 * unsharp mask in place, then write the sharpened pixels back so the
 * `canvas.toBlob()` fallback path (used when WASM is skipped) sees
 * the sharpened image too.
 */
function sharpenCanvas(
    canvas: HTMLCanvasElement,
    amount: number = 0.3,
): ImageData {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyUnsharpMask(imageData, 1, amount);
    ctx.putImageData(imageData, 0, 0);
    return imageData;
}

const WEBP_BASE_PARAMS = {
    method: 2,  // R8 D 採用: 4→2 で 2x speedup, SSIM 完全保持 (worst -0.003)
    sns_strength: 80,
    filter_type: 1,
    autofilter: 0,
    use_sharp_yuv: 0,
    filter_strength: 60,
    segments: 4,
} as const;

// R8 R-E V5: heavy file (mp>=5 AND bpp_mp>=200k) は qStart=85 から開始
function smartGuessQStart(inputBytes: number, width: number, height: number): number {
    const mp = (width * height) / 1_000_000;
    if (mp < 5) return 95;
    const bppMp = inputBytes / mp;
    if (bppMp < 200_000) return 95;
    return 85;
}

async function encodeWebpWasm(
    imageData: ImageData,
    maxSizeBytes: number | undefined,
    inputBytes: number,
): Promise<WebpEncodeResult> {
    const { default: encode } = await import('@jsquash/webp/encode');

    const startQ = maxSizeBytes !== undefined
        ? smartGuessQStart(inputBytes, imageData.width, imageData.height)
        : 95;

    // Step 1: qStart fast-path (95 for light files, 85 for heavy files)
    const startBuf = await encode(imageData, { ...WEBP_BASE_PARAMS, quality: startQ });
    if (maxSizeBytes === undefined || startBuf.byteLength <= maxSizeBytes) {
        return { buf: startBuf, quality: startQ, fallbackNeeded: false };
    }

    // Step 2: descent search (lo=70 hi=startQ-1, 3 iter)
    let lo = 70, hi = startQ - 1;
    let bestBuf: ArrayBuffer | null = null;
    let bestQ = 70;
    let prevQ = startQ;
    let prevSize = startBuf.byteLength;
    for (let i = 0; i < 3; i++) {
        const mid = projectWebpQuality(maxSizeBytes, prevQ, prevSize, lo, hi);
        if (mid === prevQ) break;
        const buf = await encode(imageData, { ...WEBP_BASE_PARAMS, quality: mid });
        prevQ = mid;
        prevSize = buf.byteLength;
        if (buf.byteLength <= maxSizeBytes) {
            bestBuf = buf;
            bestQ = mid;
            lo = mid;
            if (buf.byteLength >= maxSizeBytes * 0.95) break;
        } else {
            hi = mid;
        }
    }

    // Step 3: 何も 2MB 内に収まらない場合は q=70 で last-resort encode
    if (!bestBuf) {
        bestBuf = await encode(imageData, { ...WEBP_BASE_PARAMS, quality: 70 });
        bestQ = 70;
    }

    return {
        buf: bestBuf,
        quality: bestQ,
        fallbackNeeded: bestBuf.byteLength > maxSizeBytes,
    };
}

const MIN_RESOLUTION_DIMENSION = 320;
const MAX_RESOLUTION_LEVELS = 10;

export async function compressFallback(input: WorkerInput): Promise<WorkerOutput> {
    const { file, originalSize, maxWidthOrHeight, targetWidth, targetHeight, outputType, maxSizeBytes, initialQuality, maxQuality, minQuality, maxIterations } = input;

    const timings: Record<string, number> = {};
    const tStart = performance.now();

    const tDecodeStart = performance.now();
    const bitmap = await createImageBitmap(file);
    timings.decode = performance.now() - tDecodeStart;

    const haveTarget = targetWidth !== undefined && targetHeight !== undefined;
    const { width: tw, height: th } = haveTarget
        ? { width: targetWidth!, height: targetHeight! }
        : calcTargetDimensions(bitmap.width, bitmap.height, maxWidthOrHeight);
    const sourceWidth = haveTarget ? undefined : bitmap.width;
    const sourceHeight = haveTarget ? undefined : bitmap.height;

    if (maxSizeBytes === undefined) {
        const canvas = resizeToCanvas(bitmap, tw, th);
        bitmap.close();
        const tUnsharpStart = performance.now();
        sharpenCanvas(canvas, 0.3);
        timings.unsharpMask = performance.now() - tUnsharpStart;
        const tConvertStart = performance.now();
        const blob = await encodeCanvasBlob(canvas, outputType, initialQuality);
        timings.convertToBlobLoop = performance.now() - tConvertStart;
        timings.total = performance.now() - tStart;
        return { blob, width: tw, height: th, sourceWidth, sourceHeight, timings };
    }

    const maxBytes = maxSizeBytes;

    async function encodeCanvasToFit(c: HTMLCanvasElement): Promise<{ blob: Blob; fits: boolean; minSize: number }> {
        const tLoopStart = performance.now();
        let lo = minQuality;
        let hi = maxQuality;
        let bestBlob: Blob | null = null;
        let bestQuality = minQuality;
        let iterations = 0;

        for (let i = 0; i < maxIterations; i++) {
            iterations++;
            const mid = (lo + hi) / 2;
            const blob = await encodeCanvasBlob(c, outputType, mid);

            if (blob.size <= maxBytes) {
                bestBlob = blob;
                bestQuality = mid;
                lo = mid;
                if (blob.size >= maxBytes * 0.95) break;
            } else {
                hi = mid;
            }
        }

        if (bestBlob) {
            timings.convertToBlobLoop = performance.now() - tLoopStart;
            timings.convertToBlobIterations = iterations;
            timings.convertToBlobQuality = bestQuality;
            return { blob: bestBlob, fits: true, minSize: bestBlob.size };
        }

        iterations++;
        const floorBlob = await encodeCanvasBlob(c, outputType, minQuality);
        timings.convertToBlobLoop = performance.now() - tLoopStart;
        timings.convertToBlobIterations = iterations;
        timings.convertToBlobQuality = minQuality;
        return { blob: floorBlob, fits: floorBlob.size <= maxBytes, minSize: floorBlob.size };
    }

    let curW = tw, curH = th;
    let resultBlob: Blob | undefined;

    for (let level = 0; level <= MAX_RESOLUTION_LEVELS; level++) {
        const tResizeStart = performance.now();
        const canvas = resizeToCanvas(bitmap, curW, curH);
        timings.resize = performance.now() - tResizeStart;

        const tUnsharpStart = performance.now();
        const imageData = sharpenCanvas(canvas, 0.3);
        timings.unsharpMask = performance.now() - tUnsharpStart;

        let minSize: number;

        if (outputType === 'image/webp') {
            try {
                const tWebpStart = performance.now();
                const result = await encodeWebpWasm(imageData, maxBytes, originalSize);
                timings.encodeWebp = performance.now() - tWebpStart;
                timings.encodeWebpSizeKB = result.buf.byteLength / 1024;
                timings.encodeWebpQuality = result.quality;
                resultBlob = new Blob([result.buf], { type: 'image/webp' });
                if (!result.fallbackNeeded) {
                    timings.encodeWebpAccepted = 1;
                    break;
                }
                timings.encodeWebpAccepted = 0;
                minSize = result.buf.byteLength;
            } catch {
                const r = await encodeCanvasToFit(canvas);
                resultBlob = r.blob;
                if (r.fits) break;
                minSize = r.minSize;
            }
        } else {
            const r = await encodeCanvasToFit(canvas);
            resultBlob = r.blob;
            if (r.fits) break;
            minSize = r.minSize;
        }

        const next = nextResolutionForTarget(curW, curH, minSize, maxBytes, MIN_RESOLUTION_DIMENSION);
        if (!next) break;
        curW = next.width;
        curH = next.height;
        timings.resolutionLevels = (timings.resolutionLevels ?? 0) + 1;
    }

    bitmap.close();
    timings.total = performance.now() - tStart;
    return { blob: resultBlob!, width: curW, height: curH, sourceWidth, sourceHeight, timings };
}
