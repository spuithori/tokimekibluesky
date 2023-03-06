import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import {AtpAgent} from "@atproto/api";

export const load = async ({request, cookies, fetch}) => {
    const token = await cookies.get('session');
    if (!token) {
        throw redirect(302, '/login');
    }

    /* const agent = new AtpAgent({
        service: 'https://bsky.social',
    });

    console.log(agent.hasSession)

    if (!agent.hasSession) {
        await agent.resumeSession(JSON.parse(token));
    }

    console.log(agent.hasSession) */

    return {
        session: JSON.parse(token),
    }
}