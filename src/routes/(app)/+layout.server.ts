import type { LayoutServerLoad } from './$types';
import { getOAuthClient } from '$lib/server/oauth-client.js';

interface ServerAccount {
    did: string;
    handle?: string;
    avatar?: string;
    displayName?: string;
}

export const load: LayoutServerLoad = async ({ locals }) => {
    if (!locals.user) {
        return { user: null };
    }

    const oauthClient = await getOAuthClient();
    const results = await Promise.allSettled(
        locals.user.dids.map(async (did): Promise<ServerAccount> => {
            const session = await oauthClient.restore(did);
            try {
                const res = await session.fetchHandler(
                    `/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`,
                    { method: 'GET', headers: {} }
                );
                if (res.ok) {
                    const profile = await res.json();
                    return {
                        did,
                        handle: profile?.handle,
                        avatar: profile?.avatar,
                        displayName: profile?.displayName,
                    };
                }
            } catch {}
            return { did };
        })
    );

    const validAccounts: ServerAccount[] = [];
    for (const r of results) {
        if (r.status === 'fulfilled') {
            validAccounts.push(r.value);
        }
    }

    const invalidDids = locals.user.dids.filter(
        did => !validAccounts.some(a => a.did === did)
    );

    return {
        user: {
            primaryDid: locals.user.primaryDid,
            dids: locals.user.dids,
            accounts: validAccounts,
            invalidDids,
        },
    };
};
