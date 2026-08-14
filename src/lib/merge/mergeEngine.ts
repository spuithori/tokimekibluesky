import { isReasonPin } from '$lib/atproto-guards';

export type MergeSourceType = 'default' | 'custom' | 'officialList' | 'author';

export type MergeSource = {
    id: string,
    type: MergeSourceType,
    algorithm?: string,
    name?: string,
};

export type SourceCursorState = {
    c: string | null,
    n: number,
    g: 0 | 1,
};

export type MergeCursorState = {
    v: 1,
    f: string,
    q: number,
    w: { t: number, k: string } | null,
    s: SourceCursorState[],
};

export type PoolEntry = {
    item: any,
    key: number,
    srcIdx: number,
    dk: string,
    pagePos: number,
};

export type SourceRuntime = {
    fetchCursor: string | null,
    resumeCursor: string | null,
    exhausted: boolean,
    degraded: boolean,
    failures: number,
    floorKey: number,
    lastTailKey: number | null,
};

export type MergePool = {
    fingerprint: string,
    seq: number,
    issuedCursor: string | null,
    lastEmit: { t: number, k: string } | null,
    entries: PoolEntry[],
    keys: Set<string>,
    sources: SourceRuntime[],
};

export type SourcePage = {
    feed?: any[],
    cursor?: string,
};

export const NON_CHRONO_TOLERANCE_MS = 60_000;

export function sortKeyOf(item: any): number {
    const t = Date.parse(item?.reason?.indexedAt ?? item?.post?.indexedAt ?? '');
    return Number.isNaN(t) ? 0 : t;
}

export function dedupKeyOf(item: any): string {
    const uri = item?.post?.uri ?? '';
    if (!uri) {
        return '';
    }
    return item?.reason?.indexedAt ? `${uri}|${item.reason.indexedAt}` : uri;
}

export function fingerprintSources(sources: MergeSource[]): string {
    return sources.map(s => `${s.id}:${s.type}:${s.algorithm ?? ''}`).join('');
}

export function encodeMergeCursor(state: MergeCursorState): string {
    return JSON.stringify(state);
}

export function decodeMergeCursor(raw: unknown, sources: MergeSource[]): MergeCursorState | null {
    if (typeof raw !== 'string' || !raw) {
        return null;
    }

    let parsed: any;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return null;
    }

    if (!parsed || parsed.v !== 1 || parsed.f !== fingerprintSources(sources)) {
        return null;
    }
    if (!Array.isArray(parsed.s) || parsed.s.length !== sources.length) {
        return null;
    }

    return parsed as MergeCursorState;
}

export function createPool(sources: MergeSource[], resume: MergeCursorState | null): MergePool {
    return {
        fingerprint: fingerprintSources(sources),
        seq: resume?.q ?? 0,
        issuedCursor: null,
        lastEmit: resume?.w ?? null,
        entries: [],
        keys: new Set(),
        sources: sources.map((_, i) => {
            const sc = resume?.s?.[i];
            return {
                fetchCursor: sc ? sc.c : '',
                resumeCursor: null,
                exhausted: sc ? sc.c === null : false,
                degraded: !!sc?.g,
                failures: 0,
                floorKey: Infinity,
                lastTailKey: null,
            };
        }),
    };
}

export function stockOf(pool: MergePool, srcIdx: number): number {
    let n = 0;
    for (const e of pool.entries) {
        if (e.srcIdx === srcIdx) {
            n++;
        }
    }
    return n;
}

export function planRefill(pool: MergePool): Array<{ srcIdx: number, cursor: string }> {
    const fetches: Array<{ srcIdx: number, cursor: string }> = [];
    pool.sources.forEach((src, i) => {
        if (src.exhausted || src.fetchCursor === null) {
            return;
        }
        if (stockOf(pool, i) > 0 && (src.degraded || src.floorKey !== Infinity)) {
            return;
        }
        fetches.push({ srcIdx: i, cursor: src.fetchCursor });
    });
    return fetches;
}

export function markFetchFailed(pool: MergePool, srcIdx: number): void {
    pool.sources[srcIdx].failures++;
}

export function computeFrontier(pool: MergePool): number {
    let frontier = -Infinity;
    for (const src of pool.sources) {
        if (src.exhausted || src.degraded || src.failures >= 2) {
            continue;
        }
        frontier = Math.max(frontier, src.floorKey);
    }
    return frontier;
}

export function integratePage(pool: MergePool, srcIdx: number, requestCursor: string, page: SourcePage): void {
    const src = pool.sources[srcIdx];
    src.failures = 0;

    const rawItems = Array.isArray(page?.feed) ? page.feed : [];
    const rawKeys = rawItems.map(sortKeyOf);
    const responseCursor = typeof page?.cursor === 'string' && page.cursor !== '' ? page.cursor : null;

    src.resumeCursor = requestCursor;

    if (responseCursor !== null && responseCursor === requestCursor) {
        src.fetchCursor = null;
        src.exhausted = true;
    } else {
        src.fetchCursor = responseCursor;
        src.exhausted = responseCursor === null;
    }

    if (!src.degraded && rawItems.length > 0) {
        let prev: number | null = null;
        for (let i = 0; i < rawItems.length; i++) {
            if (isReasonPin(rawItems[i]?.reason)) {
                continue;
            }
            if (prev !== null && rawKeys[i] > prev + NON_CHRONO_TOLERANCE_MS) {
                src.degraded = true;
                break;
            }
            prev = rawKeys[i];
        }

        if (!src.degraded && src.lastTailKey !== null) {
            const firstRegular = rawItems.findIndex(it => !isReasonPin(it?.reason));
            if (firstRegular !== -1 && rawKeys[firstRegular] > src.lastTailKey + NON_CHRONO_TOLERANCE_MS) {
                src.degraded = true;
            }
        }
    }

    if (rawItems.length > 0) {
        let floor = Infinity;
        let lastRegularKey: number | null = null;
        for (let i = 0; i < rawItems.length; i++) {
            if (!isReasonPin(rawItems[i]?.reason)) {
                floor = Math.min(floor, rawKeys[i]);
                lastRegularKey = rawKeys[i];
            }
        }
        if (floor !== Infinity) {
            src.floorKey = floor;
            src.lastTailKey = lastRegularKey;
        }
    } else if (src.exhausted) {
        src.floorKey = -Infinity;
    }

    for (let i = 0; i < rawItems.length; i++) {
        const item = rawItems[i];
        const key = rawKeys[i];
        const dk = dedupKeyOf(item);

        if (pool.lastEmit) {
            if (key > pool.lastEmit.t) {
                continue;
            }
            if (key === pool.lastEmit.t && dk === pool.lastEmit.k) {
                continue;
            }
        }

        if (!dk || pool.keys.has(dk)) {
            continue;
        }
        pool.keys.add(dk);
        pool.entries.push({ item, key, srcIdx, dk, pagePos: i });
    }
}

export function emittableCount(pool: MergePool): number {
    const frontier = computeFrontier(pool);
    let n = 0;
    for (const e of pool.entries) {
        if (e.key >= frontier) {
            n++;
        }
    }
    return n;
}

export function isPoolComplete(pool: MergePool): boolean {
    if (pool.entries.length > 0) {
        return false;
    }
    return pool.sources.every(src => src.exhausted);
}

export function emitBatch(pool: MergePool, sources: MergeSource[], limit: number): { feed: any[], cursor: string | undefined } {
    pool.entries.sort((a, b) => (b.key - a.key) || (a.srcIdx - b.srcIdx) || (a.pagePos - b.pagePos));
    const frontier = computeFrontier(pool);

    const emitted: PoolEntry[] = [];
    while (emitted.length < limit && pool.entries.length > 0) {
        if (pool.entries[0].key < frontier) {
            break;
        }
        const entry = pool.entries.shift()!;
        emitted.push(entry);
        pool.lastEmit = { t: entry.key, k: entry.dk };
    }

    for (const entry of emitted) {
        pool.keys.delete(entry.dk);
        entry.item.__sourceId = sources[entry.srcIdx]?.id;
    }

    if (isPoolComplete(pool)) {
        pool.issuedCursor = null;
        return { feed: emitted.map(e => e.item), cursor: undefined };
    }

    pool.seq++;
    const state: MergeCursorState = {
        v: 1,
        f: pool.fingerprint,
        q: pool.seq,
        w: pool.lastEmit,
        s: pool.sources.map((src, i) => {
            const stocked = stockOf(pool, i) > 0;
            let c: string | null;
            if (stocked) {
                c = src.resumeCursor ?? src.fetchCursor ?? '';
            } else if (src.exhausted) {
                c = null;
            } else {
                c = src.fetchCursor;
            }
            return {
                c,
                n: 0,
                g: src.degraded ? 1 : 0 as 0 | 1,
            };
        }),
    };

    const cursor = encodeMergeCursor(state);
    pool.issuedCursor = cursor;
    return { feed: emitted.map(e => e.item), cursor };
}
