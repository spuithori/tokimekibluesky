import {AtpSessionData, AtpSessionEvent, BskyAgent} from "@atproto/api";
import {accountsDb} from "$lib/db";
import {Agent} from "$lib/agent";
import {settingsState} from "$lib/classes/settingsState.svelte";
import {appState} from "$lib/classes/appState.svelte";

let _missingAccounts = [];

async function resume(account, proxy: string | undefined) {
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
    });

    if (proxy) {
        await ag.configureProxy(proxy);
    }

    await ag.resumeSession(account.session)
        .then(value => {
            setTimeout(() => {
                settingsState.setPdsRequestReady();
            }, 1000);
        })
        .catch(error => {
            console.log(error);

            if (error.message === 'Token has expired') {
                _missingAccounts = [..._missingAccounts, account];
                appState.missingAccounts = _missingAccounts;
            } else {
                console.log('Connection failed. Try resumeSession 3 seconds.');
                setTimeout(() => {
                    resume(account, proxy);
                }, 3000);

                return;
            }
        });

    return {
        id: account.id,
        agent: ag,
    };
}

export async function resumeAccountsSession (accounts, proxy: string | undefined) {
    let agentsMap = new Map<number, Agent>();
    let promises = [];

    for (const account of accounts) {
        promises = [...promises, resume(account, proxy)];
    }

    const results = await Promise.all(promises);

    results.forEach(result => {
        agentsMap.set(result.id, new Agent(result.agent));
    });

    return agentsMap;
}