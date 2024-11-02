import {AtpSessionData, AtpSessionEvent, BskyAgent} from "@atproto/api";
import {accountsDb} from "$lib/db";
import {Agent} from "$lib/agent";
import {missingAccounts} from "$lib/stores";

let _missingAccounts = [];

async function resume(account) {
    const ag = new BskyAgent({
        service: account.service,
        persistSession: async (evt: AtpSessionEvent, sess?: AtpSessionData) => {
            const id = await accountsDb.accounts.put({
                id: account.id,
                session: sess || account.session,
                did: account.did,
                service: account.service,
                avatar: account.avatar || '',
                name: account.name || '',
                following: account.following || undefined,
                notification: account.notification || ['reply', 'like', 'repost', 'follow', 'quote', 'mention'],
                feeds: account.feeds || [],
                lists: account.lists || [],
                cloudBookmarks: account.cloudBookmarks || [],
            })
        }
    })

    ag.resumeSession(account.session)
        .then(value => {
            //
        })
        .catch(error => {
            console.log(error);

            if (error.message === 'Failed to fetch') {
                console.log('Connection failed. Try resumeSession 3 seconds.');
                setTimeout(() => {
                    resume(account);
                }, 3000);

                return;
            }

            _missingAccounts = [..._missingAccounts, account];
            missingAccounts.set(_missingAccounts);
        });

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

    results.forEach(result => {
        agentsMap.set(result.id, new Agent(result.agent));
    });

    return agentsMap;
}