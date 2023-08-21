import {AtpAgent, AtpSessionData, AtpSessionEvent} from "@atproto/api";
import {accountsDb} from "$lib/db";
import {Agent} from "$lib/agent";

async function resume(account) {
    const ag = new AtpAgent({
        service: account.service,
        persistSession: async (evt: AtpSessionEvent, sess?: AtpSessionData) => {
            if (sess) {
                account.session = sess;
            }

            const id = await accountsDb.accounts.put({
                id: account.id,
                session: account.session,
                did: sess.did,
                service: account.service,
                avatar: account.avatar || '',
                following: account.following || undefined,
                notification: account.notification || ['reply', 'like', 'repost', 'follow', 'quote', 'mention'],
            })
        }
    })

    ag.resumeSession(account.session);
    getAvatar(ag, account);

    return {
        id: account.id,
        agent: ag,
    };
}

async function getAvatar(ag, account) {
    const res = await ag.api.app.bsky.actor.getProfile({actor: account.did});
    const avatar = res.data.avatar || '';

    const aid = await accountsDb.accounts.update(account.id, {
        avatar: avatar
    })
}

export async function resumeAccountsSession (accounts) {
    let agentsMap = new Map<number, Agent>();
    let promises = [];

    for (const account of accounts) {
        promises = [...promises, resume(account)];
    }

    const results = await Promise.all(promises);

    results.forEach(result => {
        //agentsArray = [...agentsArray, new Agent(result)];
        agentsMap.set(result.id, new Agent(result.agent));
    });

    return agentsMap;
}