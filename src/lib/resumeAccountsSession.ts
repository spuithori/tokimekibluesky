import {AtpAgent, AtpSessionData, AtpSessionEvent} from "@atproto/api";
import {accountsDb} from "$lib/db";
import {Agent} from "$lib/agent";

async function resume(account) {
    const ag = new AtpAgent({
        service: account.service,
        persistSession: async (evt: AtpSessionEvent, sess?: AtpSessionData) => {
            const profile = await getAvatar(ag, account);

            const id = await accountsDb.accounts.put({
                id: account.id,
                session: sess || account.session,
                did: account.did,
                service: account.service,
                avatar: profile.avatar,
                name: profile.displayName,
                following: account.following || undefined,
                notification: account.notification || ['reply', 'like', 'repost', 'follow', 'quote', 'mention'],
                feeds: account.feeds || [],
                lists: account.lists || [],
            })
        }
    })

    ag.resumeSession(account.session);

    return {
        id: account.id,
        agent: ag,
    };
}

async function getAvatar(ag, account) {
    const res = await ag.api.app.bsky.actor.getProfile({actor: account.did});
    return {
        avatar: res.data.avatar || '',
        displayName: res.data.displayName || '',
    }
}

export async function resumeAccountsSession (accounts) {
    let agentsMap = new Map<number, Agent>();
    let promises = [];

    for (const account of accounts) {
        promises = [...promises, resume(account)];
    }

    const results = await Promise.all(promises);

    results.forEach(result => {
        agentsMap.set(result.id, new Agent(result.agent));
    });

    return agentsMap;
}