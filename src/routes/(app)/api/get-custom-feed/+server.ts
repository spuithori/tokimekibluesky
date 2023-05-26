import { CUSTOM_FEED_API } from '$env/static/private';

export async function POST ({ request }) {
    if (request.method === 'POST') {
        const json = await request.json();
        const feed = json.feed;
        const cursor = json.cursor;
        const host = feed.split(':')[3]?.split('/')[0];
        const uri = 'https://' + host + '/xrpc/app.bsky.feed.getFeedSkeleton?feed=';
        const id = feed.split('/').slice(-1)[0];
        const aturi = 'at://did:web:' + host + '/app.bsky.feed.generator/';
        const cursorOp = cursor ? '&cursor=' + cursor : '';

        const res = await fetch(uri + aturi + encodeURIComponent(id) + '&limit=20' + cursorOp , {
            method: 'GET',
        });
        const resjson = await res.json();

        return new Response(JSON.stringify(resjson), { status: 200 });
    }
}