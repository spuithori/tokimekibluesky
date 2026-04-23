import type { CompressOptions, PreviewCompressOptions, WorkerInput, WorkerOutput } from './types';
import { blobToDataUrl, calcTargetDimensions } from './utils';

export { blobToDataUrl } from './utils';

export interface CompressStats {
    blob: Blob;
    width: number;
    height: number;
    originalSize: number;
    originalWidth: number;
    originalHeight: number;
    timings: Record<string, number>;
    runtime: 'worker' | 'fallback';
}

const canUseWorker = typeof Worker !== 'undefined'
    && typeof OffscreenCanvas !== 'undefined';

const SKIP_WASM_BYTES_THRESHOLD = 10 * 1024 * 1024;

async function stripJpegMetadata(blob: Blob): Promise<Blob> {
    if (blob.type !== 'image/jpeg') return blob;

    const buffer = new Uint8Array(await blob.arrayBuffer());
    if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return blob;

    const kept: Array<{ start: number; end: number }> = [];
    let outputSize = 2;
    let i = 2;

    while (i < buffer.length - 1) {
        if (buffer[i] !== 0xff) break;
        const marker = buffer[i + 1];

        if (marker === 0xff) { i++; continue; }

        if (marker === 0x00 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
            kept.push({ start: i, end: i + 2 });
            outputSize += 2;
            i += 2;
            continue;
        }

        if (marker === 0xda) {
            kept.push({ start: i, end: buffer.length });
            outputSize += buffer.length - i;
            break;
        }

        if (marker === 0xd9) {
            kept.push({ start: i, end: i + 2 });
            outputSize += 2;
            break;
        }

        if (i + 4 > buffer.length) break;
        const length = (buffer[i + 2] << 8) | buffer[i + 3];
        const segEnd = i + 2 + length;
        if (segEnd > buffer.length) break;

        if (marker !== 0xe1 && marker !== 0xfe) {
            kept.push({ start: i, end: segEnd });
            outputSize += segEnd - i;
        }

        i = segEnd;
    }

    if (outputSize >= buffer.length) return blob;

    const output = new Uint8Array(outputSize);
    output[0] = 0xff;
    output[1] = 0xd8;
    let offset = 2;
    for (const seg of kept) {
        output.set(buffer.subarray(seg.start, seg.end), offset);
        offset += seg.end - seg.start;
    }

    return new Blob([output], { type: 'image/jpeg' });
}

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

function isDev(): boolean {
    try {
        return typeof import.meta !== 'undefined' && (import.meta as any).env?.DEV === true;
    } catch {
        return false;
    }
}

function logStats(label: string, stats: CompressStats): void {
    const ratio = stats.originalSize > 0 ? (stats.blob.size / stats.originalSize) : 0;
    const summary = {
        input: `${(stats.originalSize / 1024).toFixed(1)}KB ${stats.originalWidth}x${stats.originalHeight}`,
        output: `${(stats.blob.size / 1024).toFixed(1)}KB ${stats.width}x${stats.height} (${(ratio * 100).toFixed(1)}%)`,
        runtime: stats.runtime,
    };
    /* eslint-disable no-console */
    console.groupCollapsed(`[compressImage] ${label} total=${stats.timings.total?.toFixed(1) ?? '?'}ms`);
    console.table(summary);
    console.table(stats.timings);
    console.groupEnd();
    /* eslint-enable no-console */
}

export async function compressImageWithStats(
    file: File | Blob,
    options?: CompressOptions,
): Promise<CompressStats> {
    const {
        outputType = 'image/webp',
        maxWidthOrHeight = 2000,
        maxSizeMB,
        initialQuality = 0.92,
        maxQuality = 0.95,
        minQuality = 0.7,
        maxIterations = 8,
    } = options ?? {};

    const timings: Record<string, number> = {};
    const tStart = performance.now();
    const originalSize = file.size;

    const tBitmapStart = performance.now();
    const bitmap = await createImageBitmap(file);
    timings.createImageBitmap = performance.now() - tBitmapStart;

    const originalWidth = bitmap.width;
    const originalHeight = bitmap.height;
    const maxSizeBytes = maxSizeMB !== undefined ? maxSizeMB * 1024 * 1024 : undefined;

    const sizeOk = maxSizeBytes === undefined || originalSize <= maxSizeBytes;
    const dimsOk = originalWidth <= maxWidthOrHeight && originalHeight <= maxWidthOrHeight;

    if (sizeOk && dimsOk) {
        bitmap.close();

        const tStripStart = performance.now();
        const strippedBlob = await stripJpegMetadata(file);
        timings.stripExif = performance.now() - tStripStart;
        timings.shortCircuit = 1;
        timings.total = performance.now() - tStart;

        const stats: CompressStats = {
            blob: strippedBlob,
            width: originalWidth,
            height: originalHeight,
            originalSize,
            originalWidth,
            originalHeight,
            timings,
            runtime: canUseWorker ? 'worker' : 'fallback',
        };

        if (isDev()) {
            logStats('compressImage (short-circuit)', stats);
        }

        return stats;
    }

    const { width, height } = calcTargetDimensions(originalWidth, originalHeight, maxWidthOrHeight);
    const skipWasm = originalSize > SKIP_WASM_BYTES_THRESHOLD;

    const tProcessStart = performance.now();
    const result = await processImage({
        bitmap,
        targetWidth: width,
        targetHeight: height,
        outputType,
        maxSizeBytes,
        initialQuality,
        maxQuality,
        minQuality,
        maxIterations,
        skipWasm,
    });
    const processElapsed = performance.now() - tProcessStart;

    if (maxSizeBytes !== undefined && result.blob.size > maxSizeBytes) {
        throw new Error(
            `compressImage: unable to compress below ${(maxSizeBytes / 1024 / 1024).toFixed(2)}MB `
            + `(final: ${(result.blob.size / 1024 / 1024).toFixed(2)}MB, `
            + `${result.width}x${result.height})`,
        );
    }

    const workerTimings = result.timings ?? {};
    for (const [key, value] of Object.entries(workerTimings)) {
        if (key === 'total') {
            timings.workerTotal = value;
        } else {
            timings[key] = value;
        }
    }
    const workerTotal = typeof workerTimings.total === 'number' ? workerTimings.total : 0;
    timings.workerRoundTrip = Math.max(0, processElapsed - workerTotal);
    timings.total = performance.now() - tStart;

    const stats: CompressStats = {
        blob: result.blob,
        width: result.width,
        height: result.height,
        originalSize,
        originalWidth,
        originalHeight,
        timings,
        runtime: canUseWorker ? 'worker' : 'fallback',
    };

    if (isDev()) {
        logStats('compressImage', stats);
    }

    return stats;
}

export async function compressImage(
    file: File | Blob,
    options?: CompressOptions,
): Promise<Blob> {
    const stats = await compressImageWithStats(file, options);
    return stats.blob;
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
