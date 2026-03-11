import type { WorkerInput, WorkerOutput } from './types';

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

function applyUnsharpMask(
    canvas: OffscreenCanvas,
    radius: number = 1,
    amount: number = 0.3,
): void {
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
}

async function compress(input: WorkerInput): Promise<WorkerOutput> {
    const { bitmap, targetWidth, targetHeight, outputType, maxSizeBytes, initialQuality, maxQuality, minQuality, maxIterations } = input;

    const canvas = resizeToCanvas(bitmap, targetWidth, targetHeight);
    bitmap.close();

    applyUnsharpMask(canvas, 1, 0.3);

    if (maxSizeBytes === undefined) {
        const blob = await canvas.convertToBlob({ type: outputType, quality: initialQuality });
        return { blob, width: targetWidth, height: targetHeight };
    }

    let lo = minQuality;
    let hi = maxQuality;
    let bestBlob: Blob | null = null;

    for (let i = 0; i < maxIterations; i++) {
        const mid = (lo + hi) / 2;
        const blob = await canvas.convertToBlob({ type: outputType, quality: mid });

        if (blob.size <= maxSizeBytes) {
            bestBlob = blob;
            lo = mid;
            if (blob.size >= maxSizeBytes * 0.95) break;
        } else {
            hi = mid;
        }
    }

    if (!bestBlob) {
        bestBlob = await canvas.convertToBlob({ type: outputType, quality: minQuality });
    }

    return { blob: bestBlob, width: targetWidth, height: targetHeight };
}

self.onmessage = async (e: MessageEvent<WorkerInput>) => {
    try {
        const result = await compress(e.data);
        self.postMessage(result);
    } catch (err) {
        self.postMessage({ error: (err as Error).message });
    }
};
