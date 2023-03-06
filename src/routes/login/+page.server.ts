import type { PageServerLoad, Actions } from '../../../../.svelte-kit/types/src/routes';
import { fail, redirect, Cookies } from '@sveltejs/kit';
import {AtpAgent, AtpSessionEvent, AtpSessionData} from '@atproto/api';
import { dev } from '$app/environment';

export const actions: Actions = {
    default: async ({request, cookies }) => {
        const formData = await request.formData();

        if (!formData.get('email') || !formData.get('password')) {
            return fail(400, {
                error: 'Missing email or password'
            });
        }

        const { email } = formData.get('email')
        const { password } = formData.get('password')
        let sessd = {};

        const agent = new AtpAgent({
            service: 'https://bsky.social',
            persistSession: (evt: AtpSessionEvent, sess?: AtpSessionData) => {
                sessd = sess
            }
        })

        await agent.login({identifier: formData.get('email'), password: formData.get('password')})

        cookies.set('session', JSON.stringify(sessd), {
            httpOnly: true,
            path: '/',
            secure: true,
            sameSite: 'strict',
            maxAge: 60 * 60 * 24,
        });

        throw redirect(302, '/')
    }
};
