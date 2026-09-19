import { json } from '@sveltejs/kit';
import { AI_GATEWAY_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';
import { rejectStalePolicy } from '$lib/server/aiPolicy';
import { ALT_CATEGORIES, ALT_IMAGE_MAX_BYTES, ALT_IMAGE_TYPES, ALT_LANGUAGE_PATTERN, generateAltText, type AltCategory } from '$lib/server/altText';

const NO_STORE = { 'Cache-Control': 'no-store' };

export const POST: RequestHandler = async ({ request, url }) => {
    const stale = rejectStalePolicy(url);
    if (stale) {
        return stale;
    }

    const category = url.searchParams.get('category') as AltCategory;
    const language = url.searchParams.get('language') ?? '';
    const mediaType = (request.headers.get('content-type') ?? '').split(';')[0].trim();
    if (!ALT_CATEGORIES.includes(category) || !ALT_LANGUAGE_PATTERN.test(language)) {
        return json({ error: 'bad_request' }, { status: 400, headers: NO_STORE });
    }
    if (!ALT_IMAGE_TYPES.includes(mediaType)) {
        return json({ error: 'unsupported_media_type' }, { status: 415, headers: NO_STORE });
    }
    if (Number(request.headers.get('content-length') ?? 0) > ALT_IMAGE_MAX_BYTES) {
        return json({ error: 'too_large' }, { status: 413, headers: NO_STORE });
    }

    const image = new Uint8Array(await request.arrayBuffer());
    if (!image.byteLength || image.byteLength > ALT_IMAGE_MAX_BYTES) {
        return json({ error: 'too_large' }, { status: 413, headers: NO_STORE });
    }

    try {
        return json({ text: await generateAltText(image, mediaType, category, language, AI_GATEWAY_API_KEY) }, { headers: NO_STORE });
    } catch (e) {
        console.error(e);
        return json({ error: 'failed' }, { status: 502, headers: NO_STORE });
    }
};
