import type { Actions } from './$types';
import { error, redirect, Cookies } from '@sveltejs/kit';

export const actions: Actions = {
    logout: async (event) => {
        event.cookies.delete('auth_app');

        throw redirect(302, '/login');
    }
};
