export type ValueKind = 'did' | 'at-uri' | 'nsid' | 'cid' | 'url' | 'datetime' | 'text';

const DID_RE = /^did:[a-z]+:[A-Za-z0-9._:%-]+$/;
const DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
const CID_RE = /^(baf[a-z2-7]{40,}|Qm[1-9A-HJ-NP-Za-km-z]{44})$/;
const NSID_RE = /^[a-zA-Z]([a-zA-Z0-9-]{0,62})?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,62})?)+\.[a-zA-Z][a-zA-Z0-9]{0,62}(#[a-zA-Z][a-zA-Z0-9]*)?$/;
const NSID_KEYS = new Set(['$type', 'collection', 'nsid', 'lxm', 'lexicon']);

export interface AtUri {
    repo: string;
    collection?: string;
    rkey?: string;
}

export interface BlobRef {
    cid: string;
    mimeType: string;
    size?: number;
}

export function isDid(value: string): boolean {
    return DID_RE.test(value);
}

export function isNsid(value: string): boolean {
    return NSID_RE.test(value) && value.split('#')[0].split('.').length >= 3;
}

export function parseAtUri(value: string): AtUri | null {
    if (!value.startsWith('at://')) return null;
    const [path] = value.slice(5).split(/[?#]/);
    const [repo, collection, rkey] = path.split('/');
    if (!repo) return null;
    return { repo, collection: collection || undefined, rkey: rkey || undefined };
}

export function classifyString(value: string, key?: string): ValueKind {
    if (value.startsWith('at://')) return parseAtUri(value) ? 'at-uri' : 'text';
    if (value.startsWith('did:')) return DID_RE.test(value) ? 'did' : 'text';
    if (value.startsWith('https://') || value.startsWith('http://')) return 'url';
    if (key && NSID_KEYS.has(key) && isNsid(value)) return 'nsid';
    if (value.length >= 20 && value.length <= 35 && DATETIME_RE.test(value)) return 'datetime';
    if (value.length >= 46 && CID_RE.test(value)) return 'cid';
    return 'text';
}

export function asBlobRef(value: unknown): BlobRef | null {
    if (!value || typeof value !== 'object') return null;
    const blob = value as Record<string, any>;
    if (blob.$type === 'blob' && typeof blob.ref?.$link === 'string' && typeof blob.mimeType === 'string') {
        return { cid: blob.ref.$link, mimeType: blob.mimeType, size: typeof blob.size === 'number' ? blob.size : undefined };
    }
    if (typeof blob.cid === 'string' && typeof blob.mimeType === 'string' && Object.keys(blob).length === 2) {
        return { cid: blob.cid, mimeType: blob.mimeType };
    }
    return null;
}

export function explorerPath(target: AtUri): string {
    const parts = [target.repo, target.collection, target.rkey].filter(Boolean) as string[];
    return '/atproto-viewer/' + parts.join('/');
}

export function toAtUri(target: AtUri): string {
    return 'at://' + [target.repo, target.collection, target.rkey].filter(Boolean).join('/');
}

export function formatBytes(size: number): string {
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(size < 10240 ? 1 : 0)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / 1024 / 1024).toFixed(size < 10485760 ? 1 : 0)} MB`;
    return `${(size / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function xrpcUrlFor(service: string, nsid: string, did: string): string {
    return `${service}/xrpc/${nsid}?did=${encodeURIComponent(did)}`;
}
