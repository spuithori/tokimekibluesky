import type { HandleClientError } from '@sveltejs/kit';
import { recordError } from '$lib/errorLog';

export const handleError: HandleClientError = ({ error, message }) => {
    console.error(error);
    recordError(error, 'sveltekit');

    return {
        message,
    };
};
