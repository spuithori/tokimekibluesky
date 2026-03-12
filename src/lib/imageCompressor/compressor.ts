import type { CompressOptions, PreviewCompressOptions, WorkerInput, WorkerOutput } from './types';
import { blobToDataUrl, calcTargetDimensions } from './utils';

export { blobToDataUrl } from './utils';

const canUseWorker = typeof Worker !== 'undefined'
    && typeof OffscreenCanvas !== 'undefined';

let workerInstance: Worker | null = null;

function getWorker(): Worker {
    if (!workerInstance) {
        workerInstance = new Worker(
            new URL('./worker.ts', import.meta.url),
            { type: 'module' },
        );
    }
    return workerInstance;
}

function runInWorker(input: WorkerInput): Promise<WorkerOutput> {
    return new Promise((resolve, reject) => {
        const worker = getWorker();

        const handler = (e: MessageEvent) => {
            worker.removeEventListener('message', handler);
            worker.removeEventListener('error', errHandler);
            if (e.data.error) {
                reject(new Error(e.data.error));
            } else {
                resolve(e.data as WorkerOutput);
            }
        };

        const errHandler = (e: ErrorEvent) => {
            worker.removeEventListener('message', handler);
            worker.removeEventListener('error', errHandler);
            reject(new Error(e.message));
        };

        worker.addEventListener('message', handler);
        worker.addEventListener('error', errHandler);
        worker.postMessage(input, [input.bitmap]);
    });
}

async function runFallback(input: WorkerInput): Promise<WorkerOutput> {
    const { compressFallback } = await import('./fallback');
    return compressFallback(input);
}

async function processImage(input: WorkerInput): Promise<WorkerOutput> {
    if (canUseWorker) {
        return runInWorker(input);
    }
    return runFallback(input);
}

export async function compressImage(
    file: File | Blob,
    options?: CompressOptions,
): Promise<Blob> {
    const {
        outputType = 'image/webp',
        maxWidthOrHeight = 2000,
        maxSizeMB,
        initialQuality = 0.92,
        maxQuality = 0.95,
        minQuality = 0.7,
        maxIterations = 8,
    } = options ?? {};

    const bitmap = await createImageBitmap(file);
    const { width, height } = calcTargetDimensions(bitmap.width, bitmap.height, maxWidthOrHeight);

    const result = await processImage({
        bitmap,
        targetWidth: width,
        targetHeight: height,
        outputType,
        maxSizeBytes: maxSizeMB !== undefined ? maxSizeMB * 1024 * 1024 : undefined,
        initialQuality,
        maxQuality,
        minQuality,
        maxIterations,
    });

    return result.blob;
}

export async function compressForPreview(
    file: File | Blob,
    options?: PreviewCompressOptions,
): Promise<Blob> {
    const {
        outputType = 'image/webp',
        maxWidthOrHeight = 1024,
        quality = 0.8,
    } = options ?? {};

    const bitmap = await createImageBitmap(file);
    const { width, height } = calcTargetDimensions(bitmap.width, bitmap.height, maxWidthOrHeight);

    const result = await processImage({
        bitmap,
        targetWidth: width,
        targetHeight: height,
        outputType,
        maxSizeBytes: undefined,
        initialQuality: quality,
        maxQuality: quality,
        minQuality: quality,
        maxIterations: 1,
    });

    return result.blob;
}
