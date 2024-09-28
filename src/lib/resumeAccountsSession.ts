import {AtpSessionData, AtpSessionEvent, BskyAgent} from "@atproto/api";
import {accountsDb} from "$lib/db";
import {Agent} from "$lib/agent";
import {missingAccounts} from "$lib/stores";

let _missingAccounts = [];

async function resume(account) {
    const ag = new BskyAgent({
        service: account.service,
        persistSession: async (evt: AtpSessionEvent, sess?: AtpSessionData) => {
            let profile;

            try {
                profile = await getAvatar(ag, account);
            } catch (e) {
                if (e.message === 'The server gave an invalid response and may be out of date.') {
                    console.error(e.message);

                    await ag.upsertProfile(_profile => {
                        const profile = _profile || {};
                        profile.pinnedPost = undefined;

                        return profile;
                    });

                    profile = await getAvatar(ag, account);
                }
            }

            const id = await accountsDb.accounts.put({
                id: account.id,
                session: sess || account.session,
                did: account.did,
                service: account.service,
                avatar: profile ? profile.avatar : '',
                name: profile ? profile.displayName : '',
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
            _missingAccounts = [..._missingAccounts, account];
            missingAccounts.set(_missingAccounts);
        });

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