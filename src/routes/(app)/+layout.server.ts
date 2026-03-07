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
    const primaryDid = locals.user.primaryDid;
    const primarySessionPromise = oauthClient.restore(primaryDid);

    const [profileResults, timelineData] = await Promise.all([
        Promise.allSettled(
            locals.user.dids.map(async (did): Promise<ServerAccount> => {
                const session = did === primaryDid
                    ? await primarySessionPromise
                    : await oauthClient.restore(did);
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
        ),
        (async () => {
            try {
                const session = await primarySessionPromise;
                const res = await session.fetchHandler(
                    '/xrpc/app.bsky.feed.getTimeline?limit=20',
                    { method: 'GET', headers: {} }
                );
                if (res.ok) return await res.json();
            } catch {}
            return null;
        })(),
    ]);

    const validAccounts: ServerAccount[] = [];
    for (const r of profileResults) {
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
        prefetch: timelineData ? { timeline: timelineData } : null,
    };
};
