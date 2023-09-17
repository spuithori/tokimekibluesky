import { MeiliSearch } from 'meilisearch';
import { MEILISEARCH_URL, MEILISEARCH_API_KEY } from '$env/static/private';

export async function POST ({ request }) {
    if (request.method === 'POST') {
        const client = new MeiliSearch({
            host: MEILISEARCH_URL,
            apiKey: MEILISEARCH_API_KEY,
        })

        const req = await request.json();
        const {q, limit, offset, hashtags} = req;

        let tag = hashtags ? decodeURIComponent(hashtags) : '';
        if (tag.slice(0, 1) === '#') {
            tag = tag.slice(1);
        }

        const res = await client.index('posts').search(decodeURIComponent(q), {
            offset: offset,
            limit: limit,
            showMatchesPosition: true,
            showRankingScore: true,
            sort: ['createdAt:desc'],
            filter: tag ? ['hashtags IN [' + tag + ']'] : [],
        });

        console.log(res);

        return new Response(JSON.stringify(res), { status: 200 });
    }
}