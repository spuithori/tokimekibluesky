export interface CompressOptions {
    outputType?: string;
    maxWidthOrHeight?: number;
    maxSizeMB?: number;
    initialQuality?: number;
    maxQuality?: number;
    minQuality?: number;
    maxIterations?: number;
}

export interface PreviewCompressOptions {
    outputType?: string;
    maxWidthOrHeight?: number;
    quality?: number;
}

export interface WorkerInput {
    id?: number;
    bitmap: ImageBitmap;
    targetWidth: number;
    targetHeight: number;
    outputType: string;
    maxSizeBytes: number | undefined;
    initialQuality: number;
    maxQuality: number;
    minQuality: number;
    maxIterations: number;
}

export interface WorkerOutput {
    id?: number;
    blob: Blob;
    width: number;
    height: number;
}
