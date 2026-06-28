import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { convertAudioToVideo, AudioToVideoError, AUDIO_VIDEO_WIDTH, AUDIO_VIDEO_HEIGHT } from './audioToVideo';

function makeFile(size: number, type = 'audio/mpeg', name = 'song.mp3'): File {
    return new File([new Uint8Array(size)], name, { type });
}

function mockResponse(opts: {
    ok?: boolean;
    status?: number;
    headers?: Record<string, string>;
    body?: ArrayBuffer;
}): Response {
    const { ok = true, status = 200, headers = {}, body = new ArrayBuffer(8) } = opts;
    return {
        ok,
        status,
        headers: { get: (k: string) => (k in headers ? headers[k] : null) },
        arrayBuffer: async () => body,
    } as unknown as Response;
}

describe('convertAudioToVideo', () => {
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('posts small files directly and returns mp4 + decoded metadata', async () => {
        fetchMock.mockResolvedValue(
            mockResponse({
                headers: {
                    'X-Audio-Title': encodeURIComponent('テスト曲'),
                    'X-Audio-Artist': encodeURIComponent('アーティスト'),
                    'X-Audio-Duration-Ms': '125000',
                },
                body: new ArrayBuffer(16),
            }),
        );

        const file = makeFile(1000, 'audio/mpeg');
        const result = await convertAudioToVideo(file);

        expect(fetchMock).toHaveBeenCalledTimes(1);
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('/api/audio-to-video');
        expect(init.method).toBe('POST');
        expect(init.body).toBe(file);
        expect(init.headers['Content-Type']).toBe('audio/mpeg');

        expect(result.mimeType).toBe('video/mp4');
        expect(result.ext).toBe('mp4');
        expect(result.width).toBe(AUDIO_VIDEO_WIDTH);
        expect(result.height).toBe(AUDIO_VIDEO_HEIGHT);
        expect(result.bytes.byteLength).toBe(16);
        expect(result.audioMeta).toEqual({
            isAudio: true,
            title: 'テスト曲',
            artist: 'アーティスト',
            durationMs: 125000,
        });
    });

    it('maps 422 to a too_long error', async () => {
        fetchMock.mockResolvedValue(mockResponse({ ok: false, status: 422 }));
        await expect(convertAudioToVideo(makeFile(1000))).rejects.toMatchObject({ kind: 'too_long' });
    });

    it('maps 413 to too_large and 415 to unsupported', async () => {
        fetchMock.mockResolvedValueOnce(mockResponse({ ok: false, status: 413 }));
        await expect(convertAudioToVideo(makeFile(1000))).rejects.toMatchObject({ kind: 'too_large' });

        fetchMock.mockResolvedValueOnce(mockResponse({ ok: false, status: 415 }));
        await expect(convertAudioToVideo(makeFile(1000))).rejects.toMatchObject({ kind: 'unsupported' });
    });

    it('throws an AudioToVideoError on unexpected failure', async () => {
        fetchMock.mockResolvedValue(mockResponse({ ok: false, status: 500 }));
        const err = await convertAudioToVideo(makeFile(1000)).catch((e) => e);
        expect(err).toBeInstanceOf(AudioToVideoError);
        expect(err.kind).toBe('failed');
    });
});
