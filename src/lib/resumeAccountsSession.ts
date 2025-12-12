import { AtpSessionData, AtpSessionEvent, BskyAgent, Agent as AtpAgent } from "@atproto/api";
import { accountsDb, type Account } from "$lib/db";
import { Agent } from "$lib/agent";
import { settingsState } from "$lib/classes/settingsState.svelte";
import { appState } from "$lib/classes/appState.svelte";
import { restoreSession } from "$lib/oauth";
import type { OAuthSession } from "@atproto/oauth-client-browser";

let _missingAccounts: Account[] = [];

async function resumePasswordAccount(account: Account, proxy: string | undefined) {
    const ag = new BskyAgent({
        service: account.service,
        persistSession: async (evt: AtpSessionEvent, sess?: AtpSessionData) => {
            await accountsDb.accounts.put({
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
                isOAuth: false,
            });
        }
    });

    if (proxy) {
        await ag.configureProxy(proxy);
    }

    await ag.resumeSession(account.session!)
        .then(() => {
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
                    resumePasswordAccount(account, proxy);
                }, 3000);

                return;
            }
        });

    return {
        id: account.id!,
        agent: ag,
        isOAuth: false,
    };
}

async function resumeOAuthAccount(account: Account): Promise<{
    id: number;
    agent: AtpAgent;
    isOAuth: true;
    oauthSession: OAuthSession;
    handle?: string;
} | null> {
    try {
        const oauthSession = await restoreSession(account.oauthDid || account.did);

        if (!oauthSession) {
            console.log('Failed to restore OAuth session for:', account.did);
            _missingAccounts = [..._missingAccounts, account];
            appState.missingAccounts = _missingAccounts;
            return null;
        }

        const ag = new AtpAgent(oauthSession);
        let handle: string | undefined;
        try {
            const profile = await ag.getProfile({ actor: oauthSession.did });
            handle = profile.data.handle;
        } catch (e) {
            console.warn('Failed to fetch handle for OAuth account:', e);
        }

        setTimeout(() => {
            settingsState.setPdsRequestReady();
        }, 1000);

        return {
            id: account.id!,
            agent: ag,
            isOAuth: true,
            oauthSession: oauthSession,
            handle: handle,
        };
    } catch (error) {
        console.error('OAuth session restore error:', error);
        _missingAccounts = [..._missingAccounts, account];
        appState.missingAccounts = _missingAccounts;
        return null;
    }
}

async function resume(account: Account, proxy: string | undefined) {
    if (account.isOAuth) {
        return resumeOAuthAccount(account);
    } else {
        return resumePasswordAccount(account, proxy);
    }
}

export async function resumeAccountsSession(accounts: Account[], proxy: string | undefined) {
    let agentsMap = new Map<number, Agent>();
    let promises: Promise<any>[] = [];

    for (const account of accounts) {
        promises = [...promises, resume(account, proxy)];
    }

    const results = await Promise.all(promises);

    results.forEach(result => {
        if (result && result.agent) {
            const agent = new Agent(result.agent, result.isOAuth, result.oauthSession);

            if (result.handle) {
                agent.setHandle(result.handle);
            }
            agentsMap.set(result.id, agent);
        }
    });

    return agentsMap;
}