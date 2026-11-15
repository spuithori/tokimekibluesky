const CONSTELLATION = 'https://constellation.microcosm.blue';

export interface BacklinkSource {
    collection: string;
    path: string;
    records: number;
    distinctDids: number;
}

export interface BacklinkRecord {
    did: string;
    collection: string;
    rkey: string;
}

async function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
    const res = await fetch(url, { signal, headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`constellation ${res.status}`);
    return res.json();
}

export async function fetchBacklinkSources(target: string, signal?: AbortSignal): Promise<BacklinkSource[]> {
    const data = await getJson<{ links?: Record<string, Record<string, { records: number; distinct_dids: number }>> }>(
        `${CONSTELLATION}/links/all?target=${encodeURIComponent(target)}`, signal,
    );
    const sources: BacklinkSource[] = [];
    for (const [collection, paths] of Object.entries(data.links ?? {})) {
        for (const [path, counts] of Object.entries(paths)) {
            if (counts.records > 0) sources.push({ collection, path, records: counts.records, distinctDids: counts.distinct_dids });
        }
    }
    return sources.sort((a, b) => b.records - a.records || a.collection.localeCompare(b.collection));
}

export async function fetchBacklinks(
    params: { target: string; collection: string; path: string; cursor?: string; limit?: number },
    signal?: AbortSignal,
): Promise<{ total: number; records: BacklinkRecord[]; cursor?: string }> {
    const query = new URLSearchParams({ target: params.target, collection: params.collection, path: params.path, limit: String(params.limit ?? 50) });
    if (params.cursor) query.set('cursor', params.cursor);
    const data = await getJson<{ total: number; linking_records: BacklinkRecord[]; cursor?: string | null }>(`${CONSTELLATION}/links?${query}`, signal);
    return { total: data.total, records: data.linking_records ?? [], cursor: data.cursor ?? undefined };
}
