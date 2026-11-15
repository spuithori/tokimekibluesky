import { isDid } from './values';

export interface DidDocument {
    id: string;
    alsoKnownAs?: string[];
    verificationMethod?: Array<{ id: string; type: string; controller?: string; publicKeyMultibase?: string }>;
    service?: Array<{ id: string; type: string; serviceEndpoint: string }>;
}

export interface Identity {
    did: string;
    handle?: string;
    pds?: string;
    signingKey?: string;
    doc: DidDocument;
}

export type HandleCheck = 'verified' | 'mismatch' | 'unresolved';

export interface HandleVerification {
    status: HandleCheck;
    dns?: string;
    http?: string;
}

const HANDLE_RE = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/;

export class ExplorerError extends Error {
    constructor(public code: 'invalid-identifier' | 'handle-not-found' | 'did-not-found' | 'no-pds' | 'network' | 'not-found' | 'http', message?: string, public status?: number) {
        super(message ?? code);
    }
}

export function isHandle(value: string): boolean {
    return value.length <= 253 && HANDLE_RE.test(value);
}

async function dnsHandle(handle: string, signal?: AbortSignal): Promise<string | undefined> {
    const res = await fetch(`https://dns.google/resolve?name=${encodeURIComponent('_atproto.' + handle)}&type=TXT`, { signal });
    if (!res.ok) return undefined;
    const data = await res.json();
    for (const answer of data.Answer ?? []) {
        const txt = String(answer.data ?? '').replace(/^"|"$/g, '');
        if (txt.startsWith('did=')) return txt.slice(4);
    }
    return undefined;
}

async function httpHandle(handle: string, signal?: AbortSignal): Promise<string | undefined> {
    const res = await fetch(`https://${handle}/.well-known/atproto-did`, { signal });
    if (!res.ok) return undefined;
    const did = (await res.text()).trim();
    return isDid(did) ? did : undefined;
}

async function settle<T>(promise: Promise<T>): Promise<T | undefined> {
    try {
        return await promise;
    } catch {
        return undefined;
    }
}

export async function resolveHandleToDid(handle: string, signal?: AbortSignal): Promise<string> {
    const dns = settle(dnsHandle(handle, signal));
    const http = settle(httpHandle(handle, signal));
    const did = (await dns) ?? (await http);
    if (did) return did;

    const res = await settle(fetch(`https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(handle)}`, { signal }));
    if (res?.ok) {
        const data = await res.json();
        if (typeof data?.did === 'string') return data.did;
    }
    throw new ExplorerError('handle-not-found');
}

export async function fetchDidDocument(did: string, signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<DidDocument> {
    let url: string;
    if (did.startsWith('did:plc:')) {
        url = `https://plc.directory/${did}`;
    } else if (did.startsWith('did:web:')) {
        const [host, ...path] = did.slice('did:web:'.length).split(':').map(decodeURIComponent);
        url = path.length ? `https://${host}/${path.join('/')}/did.json` : `https://${host}/.well-known/did.json`;
    } else {
        throw new ExplorerError('invalid-identifier');
    }

    let res: Response;
    try {
        res = await fetcher(url, { signal });
    } catch (e) {
        if ((e as Error)?.name === 'AbortError') throw e;
        throw new ExplorerError('network');
    }
    if (!res.ok) throw new ExplorerError('did-not-found', undefined, res.status);
    return res.json();
}

export function identityFromDocument(doc: DidDocument): Identity {
    const handle = doc.alsoKnownAs?.find((aka) => aka.startsWith('at://'))?.slice(5);
    const pds = doc.service?.find((service) => service.id.endsWith('#atproto_pds'))?.serviceEndpoint;
    const signingKey = doc.verificationMethod?.find((method) => method.id.endsWith('#atproto'))?.publicKeyMultibase;
    return { did: doc.id, handle, pds: pds?.replace(/\/+$/, ''), signingKey, doc };
}

export async function resolveIdentity(identifier: string, signal?: AbortSignal, fetcher: typeof fetch = fetch): Promise<Identity> {
    const value = decodeURIComponent(identifier).replace(/^@/, '').trim();
    let did: string;
    if (isDid(value)) {
        did = value;
    } else if (isHandle(value)) {
        did = await resolveHandleToDid(value.toLowerCase(), signal);
    } else {
        throw new ExplorerError('invalid-identifier');
    }
    return identityFromDocument(await fetchDidDocument(did, signal, fetcher));
}

export async function verifyHandle(identity: Identity, signal?: AbortSignal): Promise<HandleVerification> {
    if (!identity.handle) return { status: 'unresolved' };
    const [dns, http] = await Promise.all([
        settle(dnsHandle(identity.handle, signal)),
        settle(httpHandle(identity.handle, signal)),
    ]);
    const claimed = [dns, http].filter(Boolean);
    if (!claimed.length) return { status: 'unresolved', dns, http };
    return { status: claimed.every((did) => did === identity.did) ? 'verified' : 'mismatch', dns, http };
}
