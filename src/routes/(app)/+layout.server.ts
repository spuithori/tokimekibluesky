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
        try {
            await agent.resumeSession(JSON.parse(token));
        } catch (e) {
            throw redirect(302, '/login');
        }
    }

    return {
        session: JSON.parse(token),
    }

    /* try {
        const session = JSON.parse(token)
        return {
            session: JSON.parse(token),
        }
    } catch (e) {
        throw redirect(302, '/login');
    } */
}
