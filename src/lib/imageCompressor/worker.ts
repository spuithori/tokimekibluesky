import type { WebpEncodeResult, WorkerInput, WorkerOutput } from './types';
import { applyUnsharpMask } from './imageProcessing';
import encodeWebp from '@jsquash/webp/encode';

function resizeToCanvas(
    bitmap: ImageBitmap,
    targetWidth: number,
    targetHeight: number,
): OffscreenCanvas {
    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
    return canvas;
}

/**
 * Read the canvas pixels into an `ImageData`, apply the shared
 * unsharp mask in place, then write the sharpened pixels back so the
 * `canvas.convertToBlob()` fallback path (used when WASM is skipped)
 * sees the sharpened image too.
 */
function sharpenCanvas(
    canvas: OffscreenCanvas,
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
    const startQ = maxSizeBytes !== undefined
        ? smartGuessQStart(inputBytes, imageData.width, imageData.height)
        : 95;

    // Step 1: qStart fast-path (95 for light files, 85 for heavy files)
    const startBuf = await encodeWebp(imageData, { ...WEBP_BASE_PARAMS, quality: startQ });
    if (maxSizeBytes === undefined || startBuf.byteLength <= maxSizeBytes) {
        return { buf: startBuf, quality: startQ, fallbackNeeded: false };
    }

    // Step 2: descent search (lo=70 hi=startQ-1, 3 iter)
    let lo = 70, hi = startQ - 1;
    let bestBuf: ArrayBuffer | null = null;
    let bestQ = 70;
    for (let i = 0; i < 3; i++) {
        const mid = Math.round((lo + hi) / 2);
        const buf = await encodeWebp(imageData, { ...WEBP_BASE_PARAMS, quality: mid });
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
        bestBuf = await encodeWebp(imageData, { ...WEBP_BASE_PARAMS, quality: 70 });
        bestQ = 70;
    }

    return {
        buf: bestBuf,
        quality: bestQ,
        fallbackNeeded: bestBuf.byteLength > maxSizeBytes,
    };
}

const MOZJPEG_BASE_PARAMS = {
    progressive: true,
    optimize_coding: true,
    chroma_subsample: 2,  // 4:2:0
    auto_subsample: true,
} as const;

async function encodeMozJpegWasm(imageData: ImageData, maxSizeBytes: number): Promise<ArrayBuffer> {
    const { default: encodeJpeg } = await import('@jsquash/jpeg/encode');

    // Step 1: q=85 fast-path
    const q85buf = await encodeJpeg(imageData, { ...MOZJPEG_BASE_PARAMS, quality: 85 });
    if (q85buf.byteLength <= maxSizeBytes) return q85buf;

    // Step 2: descent search (lo=60 hi=80, 3 iter)
    let lo = 60, hi = 80;
    let bestBuf: ArrayBuffer | null = null;
    for (let i = 0; i < 3; i++) {
        const mid = Math.round((lo + hi) / 2);
        const buf = await encodeJpeg(imageData, { ...MOZJPEG_BASE_PARAMS, quality: mid });
        if (buf.byteLength <= maxSizeBytes) {
            bestBuf = buf;
            lo = mid;
            if (buf.byteLength >= maxSizeBytes * 0.95) break;
        } else {
            hi = mid;
        }
    }

    // Step 3: last-resort q=60
    if (!bestBuf) {
        bestBuf = await encodeJpeg(imageData, { ...MOZJPEG_BASE_PARAMS, quality: 60 });
    }
    return bestBuf;
}

let webpBlobSupported: boolean | null = null;

async function encodeCanvasBlob(
    canvas: OffscreenCanvas,
    requestedType: string,
    quality: number,
): Promise<Blob> {
    let canvasType = requestedType;

    if (canvasType === 'image/webp' && webpBlobSupported === false) {
        canvasType = 'image/jpeg';
    }

    const blob = await canvas.convertToBlob({ type: canvasType, quality });

    if (canvasType === 'image/webp') {
        if (blob.type !== 'image/webp') {
            webpBlobSupported = false;
            return await canvas.convertToBlob({ type: 'image/jpeg', quality });
        }
        webpBlobSupported = true;
    }

    return blob;
}

async function compress(input: WorkerInput): Promise<WorkerOutput> {
    const { bitmap, originalSize, targetWidth, targetHeight, outputType, maxSizeBytes, initialQuality, maxQuality, minQuality, maxIterations, skipWasm } = input;

    const timings: Record<string, number> = {};
    const tStart = performance.now();
    if (skipWasm) timings.skipWasm = 1;

    const tResizeStart = performance.now();
    const canvas = resizeToCanvas(bitmap, targetWidth, targetHeight);
    bitmap.close();
    timings.resize = performance.now() - tResizeStart;

    const tUnsharpStart = performance.now();
    const imageData = sharpenCanvas(canvas, 0.3);
    timings.unsharpMask = performance.now() - tUnsharpStart;

    if (maxSizeBytes !== undefined && !skipWasm) {
        if (outputType === 'image/webp') {
            try {
                const tWebpStart = performance.now();
                const result = await encodeWebpWasm(imageData, maxSizeBytes, originalSize);
                timings.encodeWebp = performance.now() - tWebpStart;
                timings.encodeWebpSizeKB = result.buf.byteLength / 1024;
                timings.encodeWebpQuality = result.quality;
                if (!result.fallbackNeeded) {
                    timings.encodeWebpAccepted = 1;
                    timings.total = performance.now() - tStart;
                    return { blob: new Blob([result.buf], { type: 'image/webp' }), width: targetWidth, height: targetHeight, timings };
                }
                timings.encodeWebpAccepted = 0;

                // G9: fallback to MozJPEG for uncompressible images
                try {
                    const tMozStart = performance.now();
                    const mozBuf = await encodeMozJpegWasm(imageData, maxSizeBytes);
                    timings.encodeMozJpeg = performance.now() - tMozStart;
                    timings.encodeMozJpegSizeKB = mozBuf.byteLength / 1024;
                    if (mozBuf.byteLength <= maxSizeBytes) {
                        timings.encodeMozJpegAccepted = 1;
                        timings.total = performance.now() - tStart;
                        return { blob: new Blob([mozBuf], { type: 'image/jpeg' }), width: targetWidth, height: targetHeight, timings };
                    }
                    timings.encodeMozJpegAccepted = 0;
                } catch {
                }
            } catch {
            }
        }
    }

    if (maxSizeBytes === undefined) {
        const tConvertStart = performance.now();
        const blob = await encodeCanvasBlob(canvas, outputType, initialQuality);
        timings.convertToBlobLoop = performance.now() - tConvertStart;
        timings.total = performance.now() - tStart;
        return { blob, width: targetWidth, height: targetHeight, timings };
    }

    const tLoopStart = performance.now();
    let lo = minQuality;
    let hi = maxQuality;
    let bestBlob: Blob | null = null;
    let bestQuality = minQuality;
    let iterations = 0;

    for (let i = 0; i < maxIterations; i++) {
        iterations++;
        const mid = (lo + hi) / 2;
        const blob = await encodeCanvasBlob(canvas, outputType, mid);

        if (blob.size <= maxSizeBytes) {
            bestBlob = blob;
            bestQuality = mid;
            lo = mid;
            if (blob.size >= maxSizeBytes * 0.95) break;
        } else {
            hi = mid;
        }
    }

    if (!bestBlob) {
        iterations++;
        bestBlob = await encodeCanvasBlob(canvas, outputType, minQuality);
        bestQuality = minQuality;
    }

    timings.convertToBlobLoop = performance.now() - tLoopStart;
    timings.convertToBlobIterations = iterations;
    timings.convertToBlobQuality = bestQuality;
    timings.total = performance.now() - tStart;
    return { blob: bestBlob, width: targetWidth, height: targetHeight, timings };
}

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
    const id = e.data.id;
    try {
        const result = await compress(e.data);
        self.postMessage({ ...result, id });
    } catch (err) {
        self.postMessage({ error: (err as Error).message, id });
    }
};
