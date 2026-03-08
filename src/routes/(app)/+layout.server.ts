import type { LayoutServerLoad } from './$types';
import { prefetchTimeline } from '$lib/server/prefetch.js';

export const load: LayoutServerLoad = async ({ locals, url }) => {
    if (!locals.user) {
        return { user: null };
    }

    const accounts = locals.userSession?.accounts
        || locals.user.dids.map(did => ({ did }));

    const shouldPrefetch = url.pathname === '/';

    return {
        user: {
            primaryDid: locals.user.primaryDid,
            dids: locals.user.dids,
            accounts,
            invalidDids: []
        },
        prefetch: shouldPrefetch
            ? { timeline: prefetchTimeline(locals.user.primaryDid) }
            : null
    };
};
