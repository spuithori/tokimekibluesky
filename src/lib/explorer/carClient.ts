import type { RepoRecord } from './pds';

export interface CarSummary {
    did: string;
    rev: string;
    total: number;
    blocks: number;
    bytes: number;
    collections: Array<{ nsid: string; count: number }>;
}

export interface CarSearchResult {
    records: RepoRecord[];
    scanned: number;
    truncated: boolean;
}

export type CarRequest =
    | { op: 'load'; bytes: ArrayBuffer }
    | { op: 'list'; collection: string; offset: number; limit: number; reverse: boolean }
    | { op: 'get'; collection: string; rkey: string }
    | { op: 'search'; query: string; collection?: string; limit: number };

export interface CarResponse {
    id: number;
    result?: CarSummary | CarSearchResult | { records: RepoRecord[]; next?: number } | RepoRecord | null;
    error?: string;
}

export class CarRepo {
    #worker: Worker;
    #pending = new Map<number, { resolve: (value: any) => void; reject: (reason: Error) => void }>();
    #nextId = 0;
    summary!: CarSummary;

    private constructor() {
        this.#worker = new Worker(new URL('./carWorker.ts', import.meta.url), { type: 'module' });
        this.#worker.onmessage = (event: MessageEvent<CarResponse>) => {
            const task = this.#pending.get(event.data.id);
            if (!task) return;
            this.#pending.delete(event.data.id);
            if (event.data.error !== undefined) task.reject(new Error(event.data.error));
            else task.resolve(event.data.result);
        };
    }

    static async open(bytes: ArrayBuffer): Promise<CarRepo> {
        const repo = new CarRepo();
        try {
            repo.summary = await repo.#call<CarSummary>({ op: 'load', bytes }, [bytes]);
        } catch (e) {
            repo.close();
            throw e;
        }
        return repo;
    }

    #call<T>(request: CarRequest, transfer: Transferable[] = []): Promise<T> {
        const id = this.#nextId++;
        return new Promise<T>((resolve, reject) => {
            this.#pending.set(id, { resolve, reject });
            this.#worker.postMessage({ id, ...request }, transfer);
        });
    }

    list(collection: string, offset: number, reverse: boolean, limit = 100) {
        return this.#call<{ records: RepoRecord[]; next?: number }>({ op: 'list', collection, offset, limit, reverse });
    }

    get(collection: string, rkey: string) {
        return this.#call<RepoRecord | null>({ op: 'get', collection, rkey });
    }

    search(query: string, collection?: string, limit = 200) {
        return this.#call<CarSearchResult>({ op: 'search', query, collection, limit });
    }

    close(): void {
        this.#worker.terminate();
        for (const task of this.#pending.values()) task.reject(new Error('closed'));
        this.#pending.clear();
    }
}

export async function downloadRepo(
    pds: string, did: string, onProgress: (received: number) => void, signal?: AbortSignal,
): Promise<ArrayBuffer> {
    const res = await fetch(`${pds}/xrpc/com.atproto.sync.getRepo?did=${encodeURIComponent(did)}`, { signal });
    if (!res.ok || !res.body) throw new Error(`getRepo ${res.status}`);
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        onProgress(received);
    }
    const out = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
        out.set(chunk, offset);
        offset += chunk.length;
    }
    return out.buffer;
}
