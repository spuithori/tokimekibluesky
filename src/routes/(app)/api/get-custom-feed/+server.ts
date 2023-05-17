import { CUSTOM_FEED_API } from '$env/static/private';

export async function POST ({ request }) {
    if (request.method === 'POST') {
        const json = await request.json();
        const feed = json.feed;
        const cursor = json.cursor;
        const res = await fetch(CUSTOM_FEED_API + feed + '&limit=20&cursor=' + cursor , {
            method: 'GET',
        });

        return new Response(JSON.stringify(await res.json()), { status: 200 });
    }
}