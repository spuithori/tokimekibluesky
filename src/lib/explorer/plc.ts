import * as dagCbor from '@ipld/dag-cbor';
import { parseMultikey, verifyEcdsa } from './ecdsa';

interface PlcOperation {
    type: 'plc_operation' | 'plc_tombstone' | 'create';
    prev: string | null;
    sig: string;
    rotationKeys?: string[];
    verificationMethods?: Record<string, string>;
    alsoKnownAs?: string[];
    services?: Record<string, { type: string; endpoint: string }>;
    signingKey?: string;
    recoveryKey?: string;
    handle?: string;
    service?: string;
}

export interface PlcAuditEntry {
    did: string;
    cid: string;
    nullified: boolean;
    createdAt: string;
    operation: PlcOperation;
}

interface PlcState {
    handles: string[];
    rotationKeys: string[];
    verificationMethods: Record<string, string>;
    services: Record<string, string>;
}

export type PlcChange =
    | { kind: 'created' }
    | { kind: 'tombstone' }
    | { kind: 'handle-added' | 'handle-removed'; value: string }
    | { kind: 'handle-changed' | 'service-changed' | 'key-changed'; name?: string; from: string; to: string }
    | { kind: 'service-added' | 'service-removed' | 'key-added' | 'key-removed'; name: string; value: string }
    | { kind: 'rotation-added' | 'rotation-removed'; value: string };

export interface PlcLogItem {
    cid: string;
    createdAt: string;
    nullified: boolean;
    signature: 'valid' | 'invalid' | 'unknown';
    changes: PlcChange[];
}

function stateOf(op: PlcOperation): PlcState {
    if (op.type === 'create') {
        return {
            handles: op.handle ? [op.handle] : [],
            rotationKeys: [op.recoveryKey, op.signingKey].filter(Boolean) as string[],
            verificationMethods: op.signingKey ? { atproto: op.signingKey } : {},
            services: op.service ? { atproto_pds: op.service } : {},
        };
    }
    return {
        handles: (op.alsoKnownAs ?? []).map((aka) => aka.replace(/^at:\/\//, '')),
        rotationKeys: op.rotationKeys ?? [],
        verificationMethods: op.verificationMethods ?? {},
        services: Object.fromEntries(Object.entries(op.services ?? {}).map(([name, service]) => [name, service.endpoint])),
    };
}

function diffList(before: string[], after: string[], added: 'handle-added' | 'rotation-added', removed: 'handle-removed' | 'rotation-removed'): PlcChange[] {
    return [
        ...before.filter((value) => !after.includes(value)).map((value) => ({ kind: removed, value }) as PlcChange),
        ...after.filter((value) => !before.includes(value)).map((value) => ({ kind: added, value }) as PlcChange),
    ];
}

function diffMap(before: Record<string, string>, after: Record<string, string>, prefix: 'service' | 'key'): PlcChange[] {
    const changes: PlcChange[] = [];
    for (const name of new Set([...Object.keys(before), ...Object.keys(after)])) {
        if (before[name] === after[name]) continue;
        if (before[name] === undefined) changes.push({ kind: `${prefix}-added`, name, value: after[name] });
        else if (after[name] === undefined) changes.push({ kind: `${prefix}-removed`, name, value: before[name] });
        else changes.push({ kind: `${prefix}-changed`, name, from: before[name], to: after[name] });
    }
    return changes;
}

function base64UrlToBytes(value: string): Uint8Array {
    const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

async function verifyOperation(op: PlcOperation, keys: string[]): Promise<'valid' | 'invalid' | 'unknown'> {
    if (!op.sig || !keys.length) return 'unknown';
    try {
        const { sig, ...unsigned } = op;
        const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', dagCbor.encode(unsigned) as BufferSource));
        const signature = base64UrlToBytes(sig);
        let supported = false;
        for (const didKey of keys) {
            const key = parseMultikey(didKey.replace(/^did:key:/, ''));
            if (!key) continue;
            supported = true;
            if (verifyEcdsa(key, hash, signature)) return 'valid';
        }
        return supported ? 'invalid' : 'unknown';
    } catch {
        return 'unknown';
    }
}

export async function describePlcLog(entries: PlcAuditEntry[]): Promise<PlcLogItem[]> {
    const byCid = new Map(entries.map((entry) => [entry.cid, entry]));
    const items: PlcLogItem[] = [];

    for (const entry of entries) {
        const op = entry.operation;
        const previous = op.prev ? byCid.get(op.prev) : undefined;
        const before = previous ? stateOf(previous.operation) : undefined;
        const signature = await verifyOperation(op, before ? before.rotationKeys : stateOf(op).rotationKeys);

        let changes: PlcChange[];
        if (op.type === 'plc_tombstone') {
            changes = [{ kind: 'tombstone' }];
        } else {
            const after = stateOf(op);
            if (!before) {
                changes = [{ kind: 'created' }, ...diffList([], after.handles, 'handle-added', 'handle-removed'), ...diffMap({}, after.services, 'service')];
            } else {
                const handles = before.handles.length === 1 && after.handles.length === 1 && before.handles[0] !== after.handles[0]
                    ? [{ kind: 'handle-changed', from: before.handles[0], to: after.handles[0] } as PlcChange]
                    : diffList(before.handles, after.handles, 'handle-added', 'handle-removed');
                changes = [
                    ...handles,
                    ...diffMap(before.services, after.services, 'service'),
                    ...diffMap(before.verificationMethods, after.verificationMethods, 'key'),
                    ...diffList(before.rotationKeys, after.rotationKeys, 'rotation-added', 'rotation-removed'),
                ];
            }
        }

        items.push({ cid: entry.cid, createdAt: entry.createdAt, nullified: entry.nullified, signature, changes });
    }

    return items;
}

export interface PlcHistory {
    items: PlcLogItem[];
    rotationKeys: string[];
}

export async function fetchPlcLog(did: string, signal?: AbortSignal): Promise<PlcHistory> {
    const res = await fetch(`https://plc.directory/${did}/log/audit`, { signal });
    if (!res.ok) throw new Error(`plc ${res.status}`);
    const entries: PlcAuditEntry[] = await res.json();
    const latest = entries.findLast((entry) => !entry.nullified && entry.operation.type !== 'plc_tombstone');
    return { items: await describePlcLog(entries), rotationKeys: latest ? stateOf(latest.operation).rotationKeys : [] };
}
