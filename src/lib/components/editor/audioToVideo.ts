export const AUDIO_VIDEO_WIDTH = 1280;
export const AUDIO_VIDEO_HEIGHT = 720;
export const AUDIO_MAX_DURATION_SEC = 180;

const DIRECT_POST_LIMIT = 4 * 1000 * 1000;
const ENDPOINT = '/api/audio-to-video';
const BLOB_TOKEN_ENDPOINT = '/api/audio-blob-token';

export type AudioConversionErrorKind = 'too_long' | 'too_large' | 'unsupported' | 'failed';

export class AudioToVideoError extends Error {
    kind: AudioConversionErrorKind;
    constructor(kind: AudioConversionErrorKind, message?: string) {
        super(message || kind);
        this.name = 'AudioToVideoError';
        this.kind = kind;
    }
}

export type AudioMeta = {
    isAudio: true;
    title?: string;
    artist?: string;
    durationMs?: number;
};

export type AudioConversionResult = {
    bytes: ArrayBuffer;
    blob: Blob;
    mimeType: 'video/mp4';
    ext: 'mp4';
    width: number;
    height: number;
    audioMeta: AudioMeta;
};

function safeDecode(value: string | null): string {
    if (!value) return '';
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
}

export async function convertAudioToVideo(file: File): Promise<AudioConversionResult> {
    let response: Response;

    try {
        if (file.size <= DIRECT_POST_LIMIT) {
            response = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': file.type || 'application/octet-stream' },
                body: file,
            });
        } else {
            const { upload } = await import('@vercel/blob/client');
            const blob = await upload(file.name || 'audio', file, {
                access: 'public',
                handleUploadUrl: BLOB_TOKEN_ENDPOINT,
                contentType: file.type || undefined,
            });
            response = await fetch(ENDPOINT, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blobUrl: blob.url }),
            });
        }
    } catch (e) {
        throw new AudioToVideoError('failed', (e as Error)?.message);
    }

    if (!response.ok) {
        if (response.status === 422) throw new AudioToVideoError('too_long');
        if (response.status === 413) throw new AudioToVideoError('too_large');
        if (response.status === 415) throw new AudioToVideoError('unsupported');
        throw new AudioToVideoError('failed', `status ${response.status}`);
    }

    const bytes = await response.arrayBuffer();
    const durationMs = Number(response.headers.get('X-Audio-Duration-Ms')) || 0;
    const title = safeDecode(response.headers.get('X-Audio-Title'));
    const artist = safeDecode(response.headers.get('X-Audio-Artist'));

    return {
        bytes,
        blob: new Blob([bytes], { type: 'video/mp4' }),
        mimeType: 'video/mp4',
        ext: 'mp4',
        width: AUDIO_VIDEO_WIDTH,
        height: AUDIO_VIDEO_HEIGHT,
        audioMeta: {
            isAudio: true,
            title: title || undefined,
            artist: artist || undefined,
            durationMs: durationMs || undefined,
        },
    };
}
