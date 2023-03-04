import type { Actions, PageServerLoad } from './$types';
import AtpAgent, {AtpSessionEvent, AtpSessionData} from '@atproto/api';
import { error, redirect, Cookies } from '@sveltejs/kit';

export const load:  PageServerLoad = async ({cookies}) => {
    try {
        const token = cookies.get('auth_app')
        let session = {}

        const agent = new AtpAgent({
            service: 'https://bsky.social',
            persistSession: (evt: AtpSessionEvent, sess?: AtpSessionData) => {
                session = sess
            }
        })
        await agent.resumeSession(JSON.parse(token))
        return session
    } catch (e) {
        console.log('ng')
        throw redirect(302, '/login')
    }
};

export const actions: Actions = {
    logout: async (event) => {
        event.cookies.delete('auth_app');

        throw redirect(302, '/login');
    }
};
