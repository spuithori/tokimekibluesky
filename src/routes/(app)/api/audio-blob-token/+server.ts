import { handleUpload } from '@vercel/blob/client';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const config = { runtime: 'nodejs24.x' };

const ACCEPTED_MIME = [
    'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/x-m4a', 'audio/m4a',
    'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg', 'application/ogg',
    'audio/flac', 'audio/x-flac', 'audio/webm',
];

export const POST: RequestHandler = async ({ request }) => {
    const body = await request.json();
    try {
        const result = await handleUpload({
            request,
            body,
            onBeforeGenerateToken: async () => ({
                allowedContentTypes: ACCEPTED_MIME,
                maximumSizeInBytes: 80 * 1000 * 1000,
                addRandomSuffix: true,
            }),
            onUploadCompleted: async () => {},
        });
        return json(result);
    } catch (e) {
        console.error('audio-blob-token failed', e);
        return json({ error: (e as Error).message }, { status: 400 });
    }
};
