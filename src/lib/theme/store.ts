import type { Agent } from '$lib/agent';
import { APPROVAL_COLLECTION, LIKE_COLLECTION, OFFICIAL_THEME_DID, validateThemeRecord } from './format';
import type { RemoteTheme } from './atproto';

export const THEME_SERVICE_URL = 'https://themes.tokimeki.tech';
const THEME_SERVICE = { proxyDid: `did:web:${new URL(THEME_SERVICE_URL).hostname}`, proxyServiceId: 'tokimeki_theme' };

export type StoreSort = 'new' | 'likes' | 'installs';

export interface StoreTheme {
    theme: RemoteTheme;
    access: 'public' | 'code';
    likeCount: number;
    installCount: number;
    viewerLike?: string;
}

export interface StoreThemeDetail extends StoreTheme {
    approved: boolean;
}

export interface ThemeSubmission {
    uri: string;
    cid: string;
    did: string;
    rkey: string;
    handle: string | null;
    pds: string;
    record: unknown;
    thumbnail?: string;
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
    viewer?: { like?: string };
    approved?: boolean;
    thumbnail?: string;
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
    const item: StoreTheme = {
        theme: { uri: row.uri, cid: row.cid, did: row.did, rkey: row.rkey, handle: row.handle, pds: row.pds.replace(/\/$/, ''), record: result.record },
        access: row.access === 'code' ? 'code' : 'public',
        likeCount: Number(row.likeCount) || 0,
        installCount: Number(row.installCount) || 0,
    };
    if (typeof row.viewer?.like === 'string') item.viewerLike = row.viewer.like;
    if (typeof row.thumbnail === 'string') item.theme.thumbnailUrl = row.thumbnail;
    return item;
}

async function query<T>(agent: Agent | undefined, nsid: string, params: Record<string, string>, signal?: AbortSignal): Promise<T> {
    if (agent) return agent.callWithProxy<T>(nsid, params, THEME_SERVICE);
    const res = await fetch(`${THEME_SERVICE_URL}/xrpc/${nsid}?${new URLSearchParams(params)}`, { signal });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(`${nsid} ${res.status}`), { error: (json as { error?: string }).error });
    return json as T;
}

export async function fetchStoreThemes(
    { agent, sort = 'new', cursor, codeHash, signal }: { agent?: Agent; sort?: StoreSort; cursor?: string; codeHash?: string; signal?: AbortSignal } = {},
): Promise<{ themes: StoreTheme[]; cursor?: string }> {
    const params: Record<string, string> = { sort, limit: '30' };
    if (cursor) params.cursor = cursor;
    if (codeHash) params.codeHash = codeHash;
    const json = await query<{ themes?: ListedRow[]; cursor?: string }>(agent, 'tech.tokimeki.theme.getThemes', params, signal);
    return { themes: (json.themes ?? []).flatMap((row) => toStoreTheme(row) ?? []), cursor: json.cursor };
}

export async function fetchStoreTheme(agent: Agent | undefined, uri: string, signal?: AbortSignal): Promise<StoreThemeDetail | null> {
    let json: { theme?: ListedRow };
    try {
        json = await query<{ theme?: ListedRow }>(agent, 'tech.tokimeki.theme.getTheme', { uri }, signal);
    } catch (e) {
        if ((e as { error?: string }).error === 'ThemeNotFound') return null;
        throw e;
    }
    const item = json.theme ? toStoreTheme(json.theme) : null;
    return item ? { ...item, approved: json.theme?.approved === true } : null;
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

export async function setThemeLike(agent: Agent, theme: Pick<RemoteTheme, 'uri' | 'cid'>, likeUri: string | undefined): Promise<string | undefined> {
    if (likeUri) {
        const [, repo, collection, rkey] = /^at:\/\/([^/]+)\/([^/]+)\/([^/]+)$/.exec(likeUri) ?? [];
        await agent.xrpc.post('com.atproto.repo.deleteRecord', { repo: repo ?? agent.did(), collection: collection ?? LIKE_COLLECTION, rkey: rkey ?? (await subjectRkey(theme.uri)) });
        return undefined;
    }
    const res = await agent.xrpc.post<{ uri: string }>('com.atproto.repo.putRecord', {
        repo: agent.did(),
        collection: LIKE_COLLECTION,
        rkey: await subjectRkey(theme.uri),
        record: { $type: LIKE_COLLECTION, subject: { uri: theme.uri, cid: theme.cid }, createdAt: new Date().toISOString() },
    });
    return res.uri;
}

export function recordThemeInstall(agent: Agent | undefined, uri: string): void {
    if (!agent) return;
    agent.callWithProxy('tech.tokimeki.theme.recordInstall', undefined, { method: 'POST', data: { uri }, ...THEME_SERVICE }).catch(() => {});
}
