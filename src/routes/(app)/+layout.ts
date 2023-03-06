import type { PageLoad } from './$types';
import { AtpAgent } from "@atproto/api";
import { redirect } from "@sveltejs/kit";
import Cookies from 'js-cookie';
import { browser } from "$app/environment";

/* const token = Cookies.get('token');
const agent = new AtpAgent({
    service: 'https://bsky.social',
});

export const load = (async ({ fetch, cookies }) => {
    if (browser) {
        try {
            await agent.resumeSession(JSON.parse(token));

            return { agent: agent };
        } catch (e) {
            console.log(e)
            throw redirect(302, '/login');
        }
    }
}) satisfies PageLoad;
*/