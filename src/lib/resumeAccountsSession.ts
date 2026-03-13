import { accountsDb, type Account } from "$lib/db";
import { Agent } from "$lib/agent";
import { settingsState } from "$lib/classes/settingsState.svelte";
import { appState } from "$lib/classes/appState.svelte";
import { restoreSession } from "$lib/oauth";
import { PasswordSession, type SessionData } from "$lib/password-session";
import type { OAuthSession } from "$lib/oauth/types";

let _missingAccounts: Account[] = [];

function markMissing(account: Account) {
    if (_missingAccounts.some(a => a.id === account.id)) return;
    _missingAccounts = [..._missingAccounts, account];
    appState.missingAccounts = _missingAccounts;
}

async function resumePasswordAccount(account: Account, proxy: string | undefined) {
    const passwordSession = new PasswordSession({
        service: account.service,
        persistSession: async (evt, sess?) => {
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
        },
        onExpired: () => markMissing(account),
    });

    try {
        await passwordSession.resumeSession(account.session as SessionData);
        setTimeout(() => {
            settingsState.setPdsRequestReady();
        }, 1000);
    } catch (error: any) {
        console.log(error);

        if (error.message === 'Token has expired') {
            markMissing(account);
        } else {
            console.log('Connection failed. Try resumeSession 3 seconds.');
            setTimeout(() => {
                resumePasswordAccount(account, proxy);
            }, 3000);

            return null;
        }
    }

    return {
        id: account.id!,
        fetchHandler: passwordSession.createFetchHandler(),
        did: account.did,
        handle: (account.session as SessionData)?.handle,
        service: account.service,
        isOAuth: false,
        passwordSession,
    };
}

async function resumeOAuthAccount(account: Account, retryCount = 0): Promise<{
    id: number;
    fetchHandler: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
    did: string;
    isOAuth: true;
    fetchHandlePromise?: Promise<string | undefined>;
} | null> {
    try {
        const oauthSession = await restoreSession(
            account.oauthDid || account.did,
            () => markMissing(account),
        );

        if (!oauthSession) {
            console.log('Failed to restore OAuth session for:', account.did);
            markMissing(account);
            return null;
        }

        const fetchHandler = oauthSession.fetchHandler.bind(oauthSession);

        const fetchHandlePromise = (async () => {
            try {
                const path = `/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(oauthSession.did)}`;
                const res = await fetchHandler(path, { method: 'GET' });
                if (res.ok) {
                    const data = await res.json();
                    return data.handle as string;
                }
            } catch (e) {
                console.warn('Failed to fetch handle for OAuth account:', e);
            }
            return undefined;
        })();

        setTimeout(() => {
            settingsState.setPdsRequestReady();
        }, 1000);

        return {
            id: account.id!,
            fetchHandler,
            did: oauthSession.did,
            isOAuth: true,
            fetchHandlePromise,
        };
    } catch (error) {
        console.error('OAuth session restore error:', error);
        if (retryCount < 2) {
            await new Promise(resolve => setTimeout(resolve, 3000));
            return resumeOAuthAccount(account, retryCount + 1);
        }
        markMissing(account);
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
        if (result && result.fetchHandler) {
            const agent = new Agent({
                fetchHandler: result.fetchHandler,
                did: result.did,
                handle: result.handle,
                service: result.service,
                isOAuth: result.isOAuth,
                passwordSession: result.passwordSession,
            });

            if (result.fetchHandlePromise) {
                result.fetchHandlePromise.then(handle => {
                    if (handle) {
                        agent.setHandle(handle);
                    }
                });
            }
            agentsMap.set(result.id, agent);
        }
    });

    return agentsMap;
}
