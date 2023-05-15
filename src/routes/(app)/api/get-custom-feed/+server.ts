import { CUSTOM_FEED_API } from '$env/static/private';

export async function POST ({ request }) {
    if (request.method === 'POST') {
        const json = await request.json();
        const feed = json.feed;
        const res = await fetch(CUSTOM_FEED_API + feed, {
            method: 'GET',
        });

        return new Response(JSON.stringify(await res.json()), { status: 200 });
    }
}