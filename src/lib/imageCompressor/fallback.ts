import type { WorkerInput, WorkerOutput } from './types';

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

function resizeToCanvas(
    source: HTMLImageElement | HTMLCanvasElement,
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

function applyUnsharpMask(
    canvas: HTMLCanvasElement,
    radius: number = 1,
    amount: number = 0.3,
): ImageData {
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;
    const imageData = ctx.getImageData(0, 0, w, h);
    const src = imageData.data;

    const blurred = new Uint8ClampedArray(src);

    for (let pass = 0; pass < 3; pass++) {
        const tmp = new Uint8ClampedArray(blurred);
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                let r = 0, g = 0, b = 0, count = 0;
                for (let dx = -radius; dx <= radius; dx++) {
                    const nx = x + dx;
                    if (nx >= 0 && nx < w) {
                        const idx = (y * w + nx) * 4;
                        r += tmp[idx];
                        g += tmp[idx + 1];
                        b += tmp[idx + 2];
                        count++;
                    }
                }
                const idx = (y * w + x) * 4;
                blurred[idx] = r / count;
                blurred[idx + 1] = g / count;
                blurred[idx + 2] = b / count;
            }
        }
        const tmp2 = new Uint8ClampedArray(blurred);
        for (let x = 0; x < w; x++) {
            for (let y = 0; y < h; y++) {
                let r = 0, g = 0, b = 0, count = 0;
                for (let dy = -radius; dy <= radius; dy++) {
                    const ny = y + dy;
                    if (ny >= 0 && ny < h) {
                        const idx = (ny * w + x) * 4;
                        r += tmp2[idx];
                        g += tmp2[idx + 1];
                        b += tmp2[idx + 2];
                        count++;
                    }
                }
                const idx = (y * w + x) * 4;
                blurred[idx] = r / count;
                blurred[idx + 1] = g / count;
                blurred[idx + 2] = b / count;
            }
        }
    }

    for (let i = 0; i < src.length; i += 4) {
        src[i]     = Math.min(255, Math.max(0, src[i]     + amount * (src[i]     - blurred[i])));
        src[i + 1] = Math.min(255, Math.max(0, src[i + 1] + amount * (src[i + 1] - blurred[i + 1])));
        src[i + 2] = Math.min(255, Math.max(0, src[i + 2] + amount * (src[i + 2] - blurred[i + 2])));
    }

    ctx.putImageData(imageData, 0, 0);
    return imageData;
}

async function encodeWebpWasm(imageData: ImageData, maxSizeBytes: number): Promise<ArrayBuffer> {
    const { default: encode } = await import('@jsquash/webp/encode');
    return encode(imageData, {
        quality: 100,
        target_size: maxSizeBytes,
        method: 4,
        pass: 6,
        sns_strength: 80,
        filter_type: 1,
        autofilter: 1,
        preprocessing: 2,
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

export async function compressFallback(input: WorkerInput): Promise<WorkerOutput> {
    const { bitmap, targetWidth, targetHeight, outputType, maxSizeBytes, initialQuality, maxQuality, minQuality, maxIterations } = input;

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = bitmap.width;
    srcCanvas.height = bitmap.height;
    const srcCtx = srcCanvas.getContext('2d')!;
    srcCtx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const canvas = resizeToCanvas(srcCanvas, targetWidth, targetHeight);

    const imageData = applyUnsharpMask(canvas, 1, 0.3);

    if (maxSizeBytes !== undefined) {
        if (outputType === 'image/avif') {
            try {
                const buf = await encodeAvifWasm(imageData, maxSizeBytes);
                if (buf.byteLength <= maxSizeBytes) {
                    return { blob: new Blob([buf], { type: 'image/avif' }), width: targetWidth, height: targetHeight };
                }
            } catch {
            }
        }

        if (outputType === 'image/webp' || outputType === 'image/avif') {
            try {
                const buf = await encodeWebpWasm(imageData, maxSizeBytes);
                if (buf.byteLength <= maxSizeBytes) {
                    return { blob: new Blob([buf], { type: 'image/webp' }), width: targetWidth, height: targetHeight };
                }
            } catch {
            }
        }
    }

    const canvasType = outputType === 'image/avif' ? 'image/webp' : outputType;

    if (maxSizeBytes === undefined) {
        const blob = await canvasToBlob(canvas, canvasType, initialQuality);
        return { blob, width: targetWidth, height: targetHeight };
    }

    let lo = minQuality;
    let hi = maxQuality;
    let bestBlob: Blob | null = null;

    for (let i = 0; i < maxIterations; i++) {
        const mid = (lo + hi) / 2;
        const blob = await canvasToBlob(canvas, canvasType, mid);

        if (blob.size <= maxSizeBytes) {
            bestBlob = blob;
            lo = mid;
            if (blob.size >= maxSizeBytes * 0.95) break;
        } else {
            hi = mid;
        }
    }

    if (!bestBlob) {
        bestBlob = await canvasToBlob(canvas, canvasType, minQuality);
    }

    return { blob: bestBlob, width: targetWidth, height: targetHeight };
}
