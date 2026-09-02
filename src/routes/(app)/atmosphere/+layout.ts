import type { LayoutLoad } from './$types';

export const load = (({ url: { pathname } }) => {
    return {
        pathname,
    };
}) satisfies LayoutLoad;
