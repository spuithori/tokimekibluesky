import type { CompressOptions, PreviewCompressOptions, WorkerInput, WorkerOutput } from './types';
import { calcTargetDimensions, getIntrinsicSize, isHeicImage } from './utils';
import { runInPool } from './workerPool';

export { blobToDataUrl } from './utils';

/** Result of {@link compressImageWithStats} — the compressed blob plus
 *  per-phase timing information for instrumentation. */
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

async function runFallback(input: WorkerInput): Promise<WorkerOutput> {
    const { compressFallback } = await import('./fallback');
    return compressFallback(input);
}

async function processImage(input: WorkerInput, priority: 'preview' | 'compress'): Promise<WorkerOutput> {
    if (canUseWorker) {
        return runInPool(input, { priority });
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

/**
 * Compress an image and return both the compressed blob and detailed
 * timing/size statistics. Prefer {@link compressImage} when you only
 * need the resulting blob.
 *
 * Short-circuits if the input already fits both `maxSizeMB` and
 * `maxWidthOrHeight` (and isn't HEIC), returning the original bytes
 * with EXIF stripped for JPEG inputs.
 *
 * Throws if the result cannot be compressed below `maxSizeMB` even
 * after exhausting the WASM (WebP → MozJPEG) and `<canvas>` paths.
 */
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

    const tSizeStart = performance.now();
    const [intrinsic, isHeic] = await Promise.all([
        getIntrinsicSize(file),
        isHeicImage(file),
    ]);
    timings.intrinsicSize = performance.now() - tSizeStart;

    const maxSizeBytes = maxSizeMB !== undefined ? maxSizeMB * 1024 * 1024 : undefined;

    const sizeOk = maxSizeBytes === undefined || originalSize <= maxSizeBytes;
    const dimsOk = intrinsic !== null
        && intrinsic.width <= maxWidthOrHeight && intrinsic.height <= maxWidthOrHeight;

    // HEIC bytes are never a web-safe upload format — even when small enough to
    // short-circuit — so always route them through the re-encode path below.
    if (intrinsic !== null && sizeOk && dimsOk && !isHeic) {
        const tStripStart = performance.now();
        const strippedBlob = await stripJpegMetadata(file);
        timings.stripExif = performance.now() - tStripStart;
        timings.shortCircuit = 1;
        timings.total = performance.now() - tStart;

        const stats: CompressStats = {
            blob: strippedBlob,
            width: intrinsic.width,
            height: intrinsic.height,
            originalSize,
            originalWidth: intrinsic.width,
            originalHeight: intrinsic.height,
            timings,
            runtime: canUseWorker ? 'worker' : 'fallback',
        };

        if (isDev()) {
            logStats('compressImage (short-circuit)', stats);
        }

        return stats;
    }

    const target = intrinsic !== null
        ? calcTargetDimensions(intrinsic.width, intrinsic.height, maxWidthOrHeight)
        : null;

    const tProcessStart = performance.now();
    const result = await processImage({
        file,
        originalSize,
        maxWidthOrHeight,
        targetWidth: target?.width,
        targetHeight: target?.height,
        outputType,
        maxSizeBytes,
        initialQuality,
        maxQuality,
        minQuality,
        maxIterations,
    }, 'compress');
    const processElapsed = performance.now() - tProcessStart;

    const originalWidth = intrinsic?.width ?? result.sourceWidth ?? result.width;
    const originalHeight = intrinsic?.height ?? result.sourceHeight ?? result.height;

    if (maxSizeBytes !== undefined && result.blob.size > maxSizeBytes) {
        timings.overTarget = 1;
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

/**
 * Compress an image and return only the resulting blob.
 *
 * Thin wrapper over {@link compressImageWithStats} for callers that
 * don't need the timing/statistics payload.
 */
export async function compressImage(
    file: File | Blob,
    options?: CompressOptions,
): Promise<Blob> {
    const stats = await compressImageWithStats(file, options);
    return stats.blob;
}

/**
 * Fast preview-only compression — single-pass encode at a fixed
 * quality with a smaller default dimension cap (1024px). Skips the
 * size-binary-search and short-circuit logic used by
 * {@link compressImageWithStats}.
 */
export async function compressForPreview(
    file: File | Blob,
    options?: PreviewCompressOptions,
): Promise<Blob> {
    const {
        outputType = 'image/webp',
        maxWidthOrHeight = 1024,
        quality = 0.8,
    } = options ?? {};

    const intrinsic = await getIntrinsicSize(file);
    const target = intrinsic !== null
        ? calcTargetDimensions(intrinsic.width, intrinsic.height, maxWidthOrHeight)
        : null;

    const result = await processImage({
        file,
        originalSize: file.size,
        maxWidthOrHeight,
        targetWidth: target?.width,
        targetHeight: target?.height,
        outputType,
        maxSizeBytes: undefined,
        initialQuality: quality,
        maxQuality: quality,
        minQuality: quality,
        maxIterations: 1,
    }, 'preview');

    return result.blob;
}
