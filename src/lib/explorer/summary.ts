import { parseAtUri } from './values';

export interface RecordSummary {
    text: string;
    ref?: string;
    createdAt?: string;
}

const TEXT_KEYS = ['text', 'title', 'name', 'displayName', 'description', 'content', 'body', 'summary', 'message', 'status', 'emoji', 'value', 'url', 'uri'];
const REF_KEYS = ['subject', 'target', 'list', 'feed', 'post', 'parent', 'root', 'repo', 'did', 'actor', 'site', 'document'];
const TIME_KEYS = ['createdAt', 'updatedAt', 'publishedAt', 'indexedAt', 'time', 'date'];

function refOf(value: unknown): string | undefined {
    if (typeof value === 'string') {
        return value.startsWith('at://') || value.startsWith('did:') ? value : undefined;
    }
    if (value && typeof value === 'object') {
        const uri = (value as Record<string, unknown>).uri;
        if (typeof uri === 'string' && uri.startsWith('at://')) return uri;
        const did = (value as Record<string, unknown>).did;
        if (typeof did === 'string' && did.startsWith('did:')) return did;
    }
    return undefined;
}

export function shortRef(ref: string): string {
    const uri = parseAtUri(ref);
    if (!uri) return ref;
    const collection = uri.collection?.split('.').slice(-2).join('.');
    return [collection, uri.rkey].filter(Boolean).join('/') || uri.repo;
}

export function summarizeRecord(value: unknown): RecordSummary {
    if (!value || typeof value !== 'object') return { text: value === undefined ? '' : String(value) };
    const record = value as Record<string, unknown>;

    let text = '';
    for (const key of TEXT_KEYS) {
        const candidate = record[key];
        if (typeof candidate === 'string' && candidate.trim()) {
            text = candidate.trim().replace(/\s+/g, ' ').slice(0, 240);
            break;
        }
    }

    let ref: string | undefined;
    for (const key of REF_KEYS) {
        ref = refOf(record[key]);
        if (ref) break;
    }

    let createdAt: string | undefined;
    for (const key of TIME_KEYS) {
        const candidate = record[key];
        if (typeof candidate === 'string' && !Number.isNaN(Date.parse(candidate))) {
            createdAt = candidate;
            break;
        }
    }

    if (!text && !ref) {
        for (const [key, candidate] of Object.entries(record)) {
            if (key === '$type' || TIME_KEYS.includes(key)) continue;
            if (typeof candidate === 'string' || typeof candidate === 'number' || typeof candidate === 'boolean') {
                text = `${key}: ${String(candidate).replace(/\s+/g, ' ').slice(0, 200)}`;
                break;
            }
        }
    }

    return { text, ref, createdAt };
}
