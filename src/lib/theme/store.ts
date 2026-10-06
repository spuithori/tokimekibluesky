import type { Agent } from '$lib/agent';
import { APPROVAL_COLLECTION, LIKE_COLLECTION, OFFICIAL_THEME_DID, validateThemeRecord } from './format';
import { listApprovedThemes, type RemoteTheme } from './atproto';

export const THEME_SERVICE_URL = 'https://themes.tokimeki.tech';
const THEME_SERVICE = { proxyDid: `did:web:${new URL(THEME_SERVICE_URL).hostname}`, proxyServiceId: 'tokimeki_theme' };

export type StoreSort = 'new' | 'likes' | 'installs';

export interface StoreTheme {
    theme: RemoteTheme;
    access: 'public' | 'code';
    likeCount: number;
    installCount: number;
}

export interface ThemeSubmission {
    uri: string;
    cid: string;
    did: string;
    rkey: string;
    handle: string | null;
    pds: string;
    record: unknown;
    status: 'pending' | 'approved' | 'rejected';
    rejectReason: string | null;
    approvedCid: string | null;
    approvalUri: string | null;
    access: 'public' | 'code';
    submittedAt: string | null;
}

interface ListedRow {
    uri: string;
    cid: string;
    did: string;
    rkey: string;
    handle: string | null;
    pds: string;
    record: unknown;
    access: string;
    likeCount: number;
    installCount: number;
}

const BASE32 = 'abcdefghijklmnopqrstuvwxyz234567';

export async function subjectRkey(subjectUri: string): Promise<string> {
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(subjectUri)));
    let bits = 0;
    let value = 0;
    let out = '';
    for (const byte of digest) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            out += BASE32[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
    return out.slice(0, 32);
}

function toStoreTheme(row: ListedRow): StoreTheme | null {
    const result = validateThemeRecord(row.record);
    if (!result.ok || typeof row.cid !== 'string' || typeof row.pds !== 'string') return null;
    return {
        theme: { uri: row.uri, cid: row.cid, did: row.did, rkey: row.rkey, handle: row.handle, pds: row.pds.replace(/\/$/, ''), record: result.record },
        access: row.access === 'code' ? 'code' : 'public',
        likeCount: Number(row.likeCount) || 0,
        installCount: Number(row.installCount) || 0,
    };
}

export async function fetchStoreThemes(
    { sort = 'new', cursor, codeHash, signal }: { sort?: StoreSort; cursor?: string; codeHash?: string; signal?: AbortSignal } = {},
): Promise<{ themes: StoreTheme[]; cursor?: string }> {
    const params = new URLSearchParams({ sort, limit: '30' });
    if (cursor) params.set('cursor', cursor);
    if (codeHash) params.set('codeHash', codeHash);
    try {
        const res = await fetch(`${THEME_SERVICE_URL}/xrpc/tech.tokimeki.theme.getThemes?${params}`, { signal });
        if (!res.ok) throw new Error(`getThemes ${res.status}`);
        const json = (await res.json()) as { themes?: ListedRow[]; cursor?: string };
        return { themes: (json.themes ?? []).flatMap((row) => toStoreTheme(row) ?? []), cursor: json.cursor };
    } catch (e) {
        if (signal?.aborted || cursor) throw e;
        const approved = await listApprovedThemes(signal);
        return {
            themes: approved
                .filter((a) => (codeHash ? a.access === 'code' && a.codeHash === codeHash : a.access === 'public'))
                .map((a) => ({ theme: a.theme, access: a.access, likeCount: 0, installCount: 0 })),
        };
    }
}

export async function submitTheme(agent: Agent, uri: string): Promise<ThemeSubmission> {
    const res = await agent.callWithProxy<{ theme: ThemeSubmission }>('tech.tokimeki.theme.submitTheme', undefined, { method: 'POST', data: { uri }, ...THEME_SERVICE });
    return res.theme;
}

export async function getSubmissions(agent: Agent, status: ThemeSubmission['status'] = 'pending'): Promise<ThemeSubmission[]> {
    const res = await agent.callWithProxy<{ themes: ThemeSubmission[] }>('tech.tokimeki.theme.getSubmissions', { status, limit: 100 }, THEME_SERVICE);
    return res.themes ?? [];
}

async function syncApproval(agent: Agent, approvalUri: string): Promise<void> {
    await agent.callWithProxy('tech.tokimeki.theme.syncApproval', undefined, { method: 'POST', data: { uri: approvalUri }, ...THEME_SERVICE });
}

export async function rejectTheme(agent: Agent, uri: string, reason: string): Promise<void> {
    await agent.callWithProxy('tech.tokimeki.theme.setStatus', undefined, { method: 'POST', data: { uri, status: 'rejected', reason }, ...THEME_SERVICE });
}

export async function approveTheme(agent: Agent, submission: Pick<ThemeSubmission, 'uri' | 'cid' | 'approvalUri'>): Promise<void> {
    if (agent.did() !== OFFICIAL_THEME_DID) throw new Error('approvals must be written by the official account');
    const rkey = submission.approvalUri?.split('/').pop() ?? (await subjectRkey(submission.uri));
    const previous = submission.approvalUri
        ? await agent.xrpc
              .get<{ value?: { access?: unknown; codeHash?: unknown } }>('com.atproto.repo.getRecord', { repo: OFFICIAL_THEME_DID, collection: APPROVAL_COLLECTION, rkey })
              .then((res) => res.value)
              .catch(() => undefined)
        : undefined;
    const code = previous?.access === 'code' && typeof previous.codeHash === 'string';
    await agent.xrpc.post('com.atproto.repo.putRecord', {
        repo: OFFICIAL_THEME_DID,
        collection: APPROVAL_COLLECTION,
        rkey,
        record: {
            $type: APPROVAL_COLLECTION,
            subject: { uri: submission.uri, cid: submission.cid },
            access: code ? 'code' : 'public',
            ...(code ? { codeHash: previous.codeHash } : {}),
            createdAt: new Date().toISOString(),
        },
    });
    await syncApproval(agent, `at://${OFFICIAL_THEME_DID}/${APPROVAL_COLLECTION}/${rkey}`);
}

export async function unlistTheme(agent: Agent, approvalUri: string): Promise<void> {
    if (agent.did() !== OFFICIAL_THEME_DID) throw new Error('approvals must be removed by the official account');
    await agent.xrpc.post('com.atproto.repo.deleteRecord', { repo: OFFICIAL_THEME_DID, collection: APPROVAL_COLLECTION, rkey: approvalUri.split('/').pop() });
    await syncApproval(agent, approvalUri);
}

export async function listLikedThemeUris(agent: Agent): Promise<Set<string>> {
    const liked = new Set<string>();
    let cursor: string | undefined;
    do {
        const res = await agent.xrpc.get<{ cursor?: string; records?: Array<{ value?: { subject?: { uri?: string } } }> }>('com.atproto.repo.listRecords', {
            repo: agent.did(),
            collection: LIKE_COLLECTION,
            limit: 100,
            ...(cursor ? { cursor } : {}),
        });
        for (const record of res.records ?? []) {
            const uri = record.value?.subject?.uri;
            if (typeof uri === 'string') liked.add(uri);
        }
        cursor = res.records?.length ? res.cursor : undefined;
    } while (cursor);
    return liked;
}

export async function setThemeLike(agent: Agent, theme: Pick<RemoteTheme, 'uri' | 'cid'>, like: boolean): Promise<void> {
    const rkey = await subjectRkey(theme.uri);
    if (like) {
        await agent.xrpc.post('com.atproto.repo.putRecord', {
            repo: agent.did(),
            collection: LIKE_COLLECTION,
            rkey,
            record: { $type: LIKE_COLLECTION, subject: { uri: theme.uri, cid: theme.cid }, createdAt: new Date().toISOString() },
        });
    } else {
        await agent.xrpc.post('com.atproto.repo.deleteRecord', { repo: agent.did(), collection: LIKE_COLLECTION, rkey });
    }
}

export function recordThemeInstall(agent: Agent | undefined, uri: string): void {
    if (!agent) return;
    agent.callWithProxy('tech.tokimeki.theme.recordInstall', undefined, { method: 'POST', data: { uri }, ...THEME_SERVICE }).catch(() => {});
}
