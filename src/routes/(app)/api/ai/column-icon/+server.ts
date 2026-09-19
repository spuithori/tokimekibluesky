import { json } from '@sveltejs/kit';
import { AI_GATEWAY_API_KEY } from '$env/static/private';
import type { RequestHandler } from './$types';
import { rejectStalePolicy } from '$lib/server/aiPolicy';
import { COLUMN_ICON_DESCRIPTION_MAX, COLUMN_ICON_NAME_MAX, judgeColumnIcon } from '$lib/server/columnIcon';

export const GET: RequestHandler = async ({ url }) => {
    const stale = rejectStalePolicy(url);
    if (stale) {
        return stale;
    }

    const name = url.searchParams.get('name') ?? '';
    const description = url.searchParams.get('description') ?? '';
    if ((!name && !description) || name.length > COLUMN_ICON_NAME_MAX || description.length > COLUMN_ICON_DESCRIPTION_MAX) {
        return json({ icon: null }, { status: 400, headers: { 'Cache-Control': 'public, s-maxage=86400' } });
    }

    try {
        return json({ icon: await judgeColumnIcon(name, description, AI_GATEWAY_API_KEY) }, {
            headers: { 'Cache-Control': 'public, s-maxage=2592000, stale-while-revalidate=5184000' },
        });
    } catch (e) {
        console.error(e);
        return json({ icon: null }, { headers: { 'Cache-Control': 'public, s-maxage=300' } });
    }
};
