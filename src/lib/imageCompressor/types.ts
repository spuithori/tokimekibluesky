/** User-supplied options for {@link compressImage} / {@link compressImageWithStats}. */
export interface CompressOptions {
    outputType?: string;
    maxWidthOrHeight?: number;
    maxSizeMB?: number;
    initialQuality?: number;
    maxQuality?: number;
    minQuality?: number;
    maxIterations?: number;
}

/** User-supplied options for {@link compressForPreview}. */
export interface PreviewCompressOptions {
    outputType?: string;
    maxWidthOrHeight?: number;
    quality?: number;
}

/** Payload sent to the worker / fallback compress routine. */
export interface WorkerInput {
    id?: number;
    bitmap: ImageBitmap;
    originalSize: number;  // R8 R-E V5 smart-guess 用 (input bytes)
    targetWidth: number;
    targetHeight: number;
    outputType: string;
    maxSizeBytes: number | undefined;
    initialQuality: number;
    maxQuality: number;
    minQuality: number;
    maxIterations: number;
    skipWasm?: boolean;
}

/** Result returned by the worker / fallback compress routine. */
export interface WorkerOutput {
    id?: number;
    blob: Blob;
    width: number;
    height: number;
    timings?: Record<string, number>;
}

/**
 * Result of the WebP F1+ encode path:
 * `quality` is the quality factor that was finally accepted (95/85 fast-path
 * or descent-search winner), and `fallbackNeeded` is true when even the
 * last-resort q=70 encode still exceeded `maxSizeBytes` — signalling the
 * caller to fall through to MozJPEG.
 */
export interface WebpEncodeResult {
    buf: ArrayBuffer;
    quality: number;
    fallbackNeeded: boolean;
}
