import type { HandleFetch } from '@sveltejs/kit';

export const handleFetch = (({ event, request, fetch }) => {
    if (request.url.startsWith('https://bsky.social/')) {
        request.headers.set('cookie', event.request.headers.get('cookie'));
    }

    return fetch(request);
}) satisfies HandleFetch;