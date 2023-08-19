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
                following: account.following || undefined,
            })
        }
    })

    ag.resumeSession(account.session);

    return {
        id: account.id,
        agent: ag,
    };
}

export async function resumeAccountsSession (accounts) {
    let agentsMap = new Map<number, Agent>();
    let promises = [];

    for (const account of accounts) {
        promises = [...promises, resume(account)];
    }

    const results = await Promise.all(promises);

    console.log(results);

    results.forEach(result => {
        //agentsArray = [...agentsArray, new Agent(result)];
        agentsMap.set(result.id, new Agent(result.agent));
    });

    return agentsMap;
}