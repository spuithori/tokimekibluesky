import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import {AtpAgent} from "@atproto/api";

export const load = async ({request, cookies, fetch}) => {
    const token = await cookies.get('session');
    if (!token) {
        throw redirect(302, '/login');
    }

    const agent = new AtpAgent({
        service: 'https://bsky.social',
    });

    if (!agent.hasSession) {
        await agent.resumeSession(JSON.parse(token));
    }

    return {
        session: agent.session,
    }
}