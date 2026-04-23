import type { WorkerInput, WorkerOutput } from './types';
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

function applyUnsharpMask(
    canvas: OffscreenCanvas,
    _radius: number = 1,
    amount: number = 0.3,
): ImageData {
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
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

    ctx.putImageData(imageData, 0, 0);
    return imageData;
}

async function encodeWebpWasm(imageData: ImageData): Promise<ArrayBuffer> {
    return encodeWebp(imageData, {
        quality: 95,
        method: 4,
        sns_strength: 80,
        filter_type: 1,
        autofilter: 1,
        use_sharp_yuv: 1,
        filter_sharpness: 3,
        segments: 4,
    });
}

async function encodeAvifWasm(imageData: ImageData, maxSizeBytes: number): Promise<ArrayBuffer> {
    const { default: encodeAvif } = await import('@jsquash/avif/encode');

    let lo = 30, hi = 95;
    let bestBuf: ArrayBuffer | null = null;

    for (let i = 0; i < 6; i++) {
        const mid = Math.round((lo + hi) / 2);
        const buf = await encodeAvif(imageData, {
            quality: mid,
            speed: 6,
            enableSharpYUV: true,
            subsample: 1,
        });
        if (buf.byteLength <= maxSizeBytes) {
            bestBuf = buf;
            lo = mid;
            if (buf.byteLength >= maxSizeBytes * 0.90) break;
        } else {
            hi = mid;
        }
    }

    if (!bestBuf) {
        bestBuf = await encodeAvif(imageData, {
            quality: 30,
            speed: 6,
            enableSharpYUV: true,
            subsample: 1,
        });
    }

    return bestBuf;
}

let webpBlobSupported: boolean | null = null;

async function encodeCanvasBlob(
    canvas: OffscreenCanvas,
    requestedType: string,
    quality: number,
): Promise<Blob> {
    let canvasType = requestedType === 'image/avif' ? 'image/webp' : requestedType;

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
    const { bitmap, targetWidth, targetHeight, outputType, maxSizeBytes, initialQuality, maxQuality, minQuality, maxIterations, skipWasm } = input;

    const timings: Record<string, number> = {};
    const tStart = performance.now();
    if (skipWasm) timings.skipWasm = 1;

    const tResizeStart = performance.now();
    const canvas = resizeToCanvas(bitmap, targetWidth, targetHeight);
    bitmap.close();
    timings.resize = performance.now() - tResizeStart;

    const tUnsharpStart = performance.now();
    const imageData = applyUnsharpMask(canvas, 1, 0.3);
    timings.unsharpMask = performance.now() - tUnsharpStart;

    if (maxSizeBytes !== undefined && !skipWasm) {
        if (outputType === 'image/avif') {
            try {
                const tAvifStart = performance.now();
                const buf = await encodeAvifWasm(imageData, maxSizeBytes);
                timings.encodeAvif = performance.now() - tAvifStart;
                if (buf.byteLength <= maxSizeBytes) {
                    timings.total = performance.now() - tStart;
                    return { blob: new Blob([buf], { type: 'image/avif' }), width: targetWidth, height: targetHeight, timings };
                }
            } catch {
            }
        }

        if (outputType === 'image/webp' || outputType === 'image/avif') {
            try {
                const tWebpStart = performance.now();
                const buf = await encodeWebpWasm(imageData);
                timings.encodeWebp = performance.now() - tWebpStart;
                timings.encodeWebpSizeKB = buf.byteLength / 1024;
                if (buf.byteLength <= maxSizeBytes) {
                    timings.encodeWebpAccepted = 1;
                    timings.total = performance.now() - tStart;
                    return { blob: new Blob([buf], { type: 'image/webp' }), width: targetWidth, height: targetHeight, timings };
                }
                timings.encodeWebpAccepted = 0;
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
