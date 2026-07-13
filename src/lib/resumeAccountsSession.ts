import { accountsDb, type Account } from "$lib/db";
import { Agent } from "$lib/agent";
import { restoreSession } from "$lib/oauth";
import { PasswordSession, type SessionData } from "$lib/password-session";
import { BSKY_APPVIEW_PROXY } from "$lib/xrpc-client";

export type ResumePhase = 'pending' | 'retrying' | 'resumed' | 'auth-required' | 'unreachable';

export type ResumeOutcome =
    | { status: 'resumed'; agent: Agent }
    | { status: 'auth-required' }
    | { status: 'unreachable'; error: unknown; offline?: boolean };

export interface ResumeCallbacks {
    onStatus?: (account: Account, phase: ResumePhase, meta?: { attempt?: number; error?: unknown; offline?: boolean }) => void;
}

const MAX_RETRIES = 3;
const RETRY_BASE_MS = 3000;

const AUTH_ERROR_CODES = new Set(['ExpiredToken', 'InvalidToken', 'AccountTakedown']);

function isAuthError(error: any): boolean {
    return AUTH_ERROR_CODES.has(error?.error);
}

async function attemptPasswordResume(account: Account, proxy: string | undefined, callbacks?: ResumeCallbacks): Promise<ResumeOutcome> {
    const session = account.session as SessionData | null | undefined;

    if (!session?.refreshJwt) {
        return { status: 'auth-required' };
    }

    const passwordSession = new PasswordSession({
        service: account.service,
        persistSession: async (evt, sess?) => {
            await accountsDb.accounts.put({
                id: account.id,
                session: evt === 'expired' ? null : (sess ?? account.session),
                did: account.did,
                handle: sess?.handle || account.handle || session.handle || undefined,
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
        onExpired: () => callbacks?.onStatus?.(account, 'auth-required'),
        loadLatestSession: async () => {
            const latest = await accountsDb.accounts.get(account.id!);
            return latest?.session as SessionData | undefined;
        },
    });

    try {
        await passwordSession.resumeSession(session);
    } catch (error: any) {
        if (isAuthError(error)) {
            return { status: 'auth-required' };
        }
        throw error;
    }

    const agent = new Agent({
        fetchHandler: passwordSession.createFetchHandler(),
        did: account.did,
        handle: session.handle,
        service: account.service,
        isOAuth: false,
        passwordSession,
        appViewProxy: proxy,
    });

    return { status: 'resumed', agent };
}

async function fetchOAuthHandle(
    fetchHandler: (input: string | URL | Request, init?: RequestInit) => Promise<Response>,
    did: string,
    account: Account,
    proxy?: string,
): Promise<string | undefined> {
    try {
        const path = `/xrpc/app.bsky.actor.getProfile?actor=${encodeURIComponent(did)}`;
        const res = await fetchHandler(path, { method: 'GET', headers: { 'atproto-proxy': proxy || BSKY_APPVIEW_PROXY } });
        if (res.ok) {
            const data = await res.json();
            if (data.handle && data.handle !== account.handle) {
                accountsDb.accounts.update(account.id!, { handle: data.handle }).catch(() => {});
            }
            return data.handle as string;
        }
    } catch (e) {
        console.warn('Failed to fetch handle for OAuth account:', e);
    }
    return undefined;
}

async function attemptOAuthResume(account: Account, proxy: string | undefined, callbacks?: ResumeCallbacks): Promise<ResumeOutcome> {
    const oauthSession = await restoreSession(
        account.oauthDid || account.did,
        () => callbacks?.onStatus?.(account, 'auth-required'),
    );

    if (!oauthSession) {
        return { status: 'auth-required' };
    }

    const fetchHandler = oauthSession.fetchHandler.bind(oauthSession);

    const agent = new Agent({
        fetchHandler,
        did: oauthSession.did,
        isOAuth: true,
        appViewProxy: proxy,
    });

    fetchOAuthHandle(fetchHandler, oauthSession.did, account, proxy).then(handle => {
        if (handle) {
            agent.setHandle(handle);
        }
    });

    return { status: 'resumed', agent };
}

async function runResume(account: Account, proxy: string | undefined, callbacks?: ResumeCallbacks): Promise<ResumeOutcome> {
    callbacks?.onStatus?.(account, 'pending');

    let attempt = 0;
    while (true) {
        let outcome: ResumeOutcome;
        try {
            outcome = account.isOAuth
                ? await attemptOAuthResume(account, proxy, callbacks)
                : await attemptPasswordResume(account, proxy, callbacks);
        } catch (error) {
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                console.warn('Offline detected during session resume:', account.did);
                outcome = { status: 'unreachable', error, offline: true };
            } else if (attempt < MAX_RETRIES) {
                attempt++;
                callbacks?.onStatus?.(account, 'retrying', { attempt, error });
                await new Promise(resolve => setTimeout(resolve, RETRY_BASE_MS * attempt));
                continue;
            } else {
                console.error('Session resume failed after retries:', account.did, error);
                outcome = { status: 'unreachable', error };
            }
        }

        callbacks?.onStatus?.(
            account,
            outcome.status,
            outcome.status === 'unreachable' ? { error: outcome.error, offline: outcome.offline } : undefined,
        );
        return outcome;
    }
}

export function startAccountsResume(accounts: Account[], proxy?: string, callbacks?: ResumeCallbacks): {
    perAccount: Map<number, Promise<ResumeOutcome>>;
    all: Promise<Map<number, Agent>>;
} {
    const perAccount = new Map<number, Promise<ResumeOutcome>>();

    for (const account of accounts) {
        perAccount.set(account.id!, runResume(account, proxy, callbacks));
    }

    const all = (async () => {
        const agentsMap = new Map<number, Agent>();
        for (const [id, promise] of perAccount) {
            const outcome = await promise;
            if (outcome.status === 'resumed') {
                agentsMap.set(id, outcome.agent);
            }
        }
        return agentsMap;
    })();

    return { perAccount, all };
}

export async function resumeAccountsSession(accounts: Account[], proxy?: string, callbacks?: ResumeCallbacks): Promise<Map<number, Agent>> {
    return startAccountsResume(accounts, proxy, callbacks).all;
}
