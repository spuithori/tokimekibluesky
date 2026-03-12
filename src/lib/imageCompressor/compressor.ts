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

let nextMessageId = 0;
const pendingRequests = new Map<number, { resolve: (v: WorkerOutput) => void; reject: (e: Error) => void }>();

function ensureWorkerListener(): void {
    const worker = getWorker();
    if ((worker as any).__listenerAttached) return;
    (worker as any).__listenerAttached = true;

    worker.addEventListener('message', (e: MessageEvent) => {
        const data = e.data;
        const pending = pendingRequests.get(data.id);
        if (!pending) return;
        pendingRequests.delete(data.id);
        if (data.error) {
            pending.reject(new Error(data.error));
        } else {
            pending.resolve(data as WorkerOutput);
        }
    });

    worker.addEventListener('error', (e: ErrorEvent) => {
        for (const [id, pending] of pendingRequests) {
            pending.reject(new Error(e.message));
        }
        pendingRequests.clear();
    });
}

function runInWorker(input: WorkerInput): Promise<WorkerOutput> {
    return new Promise((resolve, reject) => {
        ensureWorkerListener();
        const id = nextMessageId++;
        input.id = id;
        pendingRequests.set(id, { resolve, reject });
        getWorker().postMessage(input, [input.bitmap]);
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
