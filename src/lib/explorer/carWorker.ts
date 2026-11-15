import { CID } from 'multiformats/cid';
import { decodeBlock, readCar, type Car } from './car';
import { walkMst } from './mst';
import type { RepoCommit } from './verify';
import type { CarRequest, CarResponse, CarSummary } from './carClient';

let car: Car | undefined;
let index = new Map<string, Array<[string, string]>>();

function toJson(value: unknown): unknown {
    if (value === null || typeof value !== 'object') return value;
    const cid = CID.asCID(value);
    if (cid) return { $link: cid.toString() };
    if (value instanceof Uint8Array) {
        let binary = '';
        for (let i = 0; i < value.length; i += 0x8000) binary += String.fromCharCode(...value.subarray(i, i + 0x8000));
        return { $bytes: btoa(binary).replace(/=+$/, '') };
    }
    if (Array.isArray(value)) return value.map(toJson);
    const out: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) out[key] = toJson(child);
    return out;
}

function recordOf(did: string, collection: string, rkey: string, cid: string) {
    return { uri: `at://${did}/${collection}/${rkey}`, cid, value: toJson(decodeBlock(car!, cid)) as Record<string, unknown> };
}

let did = '';

function load(bytes: Uint8Array): CarSummary {
    car = readCar(bytes);
    index = new Map();
    const root = car.roots[0];
    const commit = root ? decodeBlock<RepoCommit>(car, root) : undefined;
    if (!commit?.data) throw new Error('not a repository');
    did = commit.did;

    let total = 0;
    for (const leaf of walkMst(car, commit.data)) {
        const slash = leaf.key.indexOf('/');
        const collection = leaf.key.slice(0, slash);
        let list = index.get(collection);
        if (!list) index.set(collection, (list = []));
        list.push([leaf.key.slice(slash + 1), leaf.cid.toString()]);
        total++;
    }

    return {
        did,
        rev: commit.rev,
        total,
        blocks: car.blocks.size,
        bytes: bytes.length,
        collections: [...index].map(([nsid, list]) => ({ nsid, count: list.length })),
    };
}

function handle(request: CarRequest): CarResponse['result'] {
    switch (request.op) {
        case 'load':
            return load(new Uint8Array(request.bytes));
        case 'list': {
            const list = index.get(request.collection) ?? [];
            const end = Math.min(list.length, request.offset + request.limit);
            const page: Array<[string, string]> = [];
            for (let i = request.offset; i < end; i++) page.push(list[request.reverse ? i : list.length - 1 - i]);
            return {
                records: page.map(([rkey, cid]) => recordOf(did, request.collection, rkey, cid)),
                next: request.offset + page.length < list.length ? request.offset + page.length : undefined,
            };
        }
        case 'get': {
            const hit = index.get(request.collection)?.find(([rkey]) => rkey === request.rkey);
            return hit ? recordOf(did, request.collection, request.rkey, hit[1]) : null;
        }
        case 'search': {
            const needle = request.query.toLowerCase();
            const records = [];
            let scanned = 0;
            for (const [collection, list] of index) {
                if (request.collection && request.collection !== collection) continue;
                for (let i = list.length - 1; i >= 0; i--) {
                    const [rkey, cid] = list[i];
                    scanned++;
                    const record = recordOf(did, collection, rkey, cid);
                    if (rkey.includes(needle) || JSON.stringify(record.value).toLowerCase().includes(needle)) {
                        records.push(record);
                        if (records.length >= request.limit) return { records, scanned, truncated: true };
                    }
                }
            }
            return { records, scanned, truncated: false };
        }
    }
}

self.onmessage = (event: MessageEvent<CarRequest & { id: number }>) => {
    const { id } = event.data;
    try {
        self.postMessage({ id, result: handle(event.data) } satisfies CarResponse);
    } catch (e) {
        self.postMessage({ id, error: (e as Error)?.message ?? 'error' } satisfies CarResponse);
    }
};
