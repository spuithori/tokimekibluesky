import type { Actions } from './$types';
import { error, redirect, Cookies } from '@sveltejs/kit';

export const actions: Actions = {
    logout: async (event) => {
        event.cookies.delete('session');

        throw redirect(302, '/login');
    }
};
