import { ExplorerError } from './identity';

export interface RepoRecord<T = Record<string, unknown>> {
    uri: string;
    cid: string;
    value: T;
}

export interface RepoDescription {
    handle: string;
    did: string;
    collections: string[];
    handleIsCorrect: boolean;
}

export interface RepoStatus {
    did: string;
    active: boolean;
    status?: string;
    rev?: string;
}

export interface ServerDescription {
    did?: string;
    availableUserDomains?: string[];
    inviteCodeRequired?: boolean;
    phoneVerificationRequired?: boolean;
    links?: { privacyPolicy?: string; termsOfService?: string };
    contact?: { email?: string };
}

type Params = Record<string, string | number | boolean | undefined>;

export function xrpcUrl(service: string, nsid: string, params: Params = {}): string {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== '') query.set(key, String(value));
    }
    const qs = query.toString();
    return `${service}/xrpc/${nsid}${qs ? '?' + qs : ''}`;
}

async function request(url: string, signal?: AbortSignal): Promise<Response> {
    let res: Response;
    try {
        res = await fetch(url, { signal });
    } catch (e) {
        if ((e as Error)?.name === 'AbortError') throw e;
        throw new ExplorerError('network');
    }
    if (!res.ok) {
        let message: string | undefined;
        try {
            const body = await res.json();
            message = body?.message || body?.error;
        } catch {
            message = undefined;
        }
        throw new ExplorerError(res.status === 404 || res.status === 400 ? 'not-found' : 'http', message, res.status);
    }
    return res;
}

export async function xrpcGet<T>(service: string, nsid: string, params?: Params, signal?: AbortSignal): Promise<T> {
    return (await request(xrpcUrl(service, nsid, params), signal)).json();
}

export async function xrpcBytes(service: string, nsid: string, params?: Params, signal?: AbortSignal): Promise<Uint8Array> {
    return new Uint8Array(await (await request(xrpcUrl(service, nsid, params), signal)).arrayBuffer());
}

export function describeRepo(pds: string, did: string, signal?: AbortSignal) {
    return xrpcGet<RepoDescription>(pds, 'com.atproto.repo.describeRepo', { repo: did }, signal);
}

export function getRepoStatus(pds: string, did: string, signal?: AbortSignal) {
    return xrpcGet<RepoStatus>(pds, 'com.atproto.sync.getRepoStatus', { did }, signal);
}

export function listRecords(pds: string, params: { repo: string; collection: string; limit?: number; cursor?: string; reverse?: boolean }, signal?: AbortSignal) {
    return xrpcGet<{ cursor?: string; records: RepoRecord[] }>(pds, 'com.atproto.repo.listRecords', { limit: 100, ...params, reverse: params.reverse || undefined }, signal);
}

export function getRecord(pds: string, params: { repo: string; collection: string; rkey: string; cid?: string }, signal?: AbortSignal) {
    return xrpcGet<RepoRecord>(pds, 'com.atproto.repo.getRecord', params, signal);
}

export function getRecordProof(pds: string, params: { did: string; collection: string; rkey: string }, signal?: AbortSignal) {
    return xrpcBytes(pds, 'com.atproto.sync.getRecord', params, signal);
}

export function listBlobs(pds: string, params: { did: string; limit?: number; cursor?: string }, signal?: AbortSignal) {
    return xrpcGet<{ cursor?: string; cids: string[] }>(pds, 'com.atproto.sync.listBlobs', { limit: 200, ...params }, signal);
}

export function blobUrl(pds: string, did: string, cid: string): string {
    return xrpcUrl(pds, 'com.atproto.sync.getBlob', { did, cid });
}

export function describeServer(pds: string, signal?: AbortSignal) {
    return xrpcGet<ServerDescription>(pds, 'com.atproto.server.describeServer', undefined, signal);
}

export function listRepos(pds: string, params: { limit?: number; cursor?: string } = {}, signal?: AbortSignal) {
    return xrpcGet<{ cursor?: string; repos: Array<{ did: string; head: string; rev: string; active?: boolean; status?: string }> }>(pds, 'com.atproto.sync.listRepos', { limit: 100, ...params }, signal);
}

export async function pdsHealth(pds: string, signal?: AbortSignal): Promise<string | undefined> {
    try {
        const res = await fetch(`${pds}/xrpc/_health`, { signal });
        if (!res.ok) return undefined;
        const body = await res.json();
        return typeof body?.version === 'string' ? body.version : undefined;
    } catch {
        return undefined;
    }
}

export interface CollectionStats {
    creates: number;
    updates: number;
    deletes: number;
    dids_estimate: number;
}

export async function fetchCollectionStats(collection: string, signal?: AbortSignal): Promise<CollectionStats | undefined> {
    try {
        const res = await fetch(`https://ufos-api.microcosm.blue/collections/stats?collection=${encodeURIComponent(collection)}`, { signal });
        if (!res.ok) return undefined;
        return (await res.json())?.[collection];
    } catch {
        return undefined;
    }
}

export function listReposByCollection(collection: string, cursor?: string, signal?: AbortSignal) {
    return xrpcGet<{ cursor?: string; repos: Array<{ did: string }> }>('https://bsky.network', 'com.atproto.sync.listReposByCollection', { collection, limit: 100, cursor }, signal);
}
