import { RicePluginError } from './types';

export const PLUGIN_APPVIEW = 'https://plugins.tokimeki.tech';

export interface PluginView {
    uri: string;
    cid: string;
    id: string;
    did: string;
    handle: string;
    name: string;
    version: string;
    apiVersion: number;
    svelteVersion: string;
    entryCid: string;
    entrySize: number;
    iconUrl?: string;
    description?: string;
    author?: string;
    homepage?: string;
    license?: string;
    tags?: string[];
    contributes?: Record<string, unknown>;
    settings?: unknown[];
    verified: boolean;
    likeCount: number;
    createdAt?: string;
    indexedAt: string;
}

export interface PluginPage {
    plugins: PluginView[];
    cursor?: string;
}

export interface PluginUpdate {
    uri: string;
    latestVersion: string;
    latestCid: string;
}

async function query<T>(nsid: string, params: URLSearchParams, signal?: AbortSignal): Promise<T> {
    const url = `${PLUGIN_APPVIEW}/xrpc/${nsid}?${params}`;
    let res: Response;
    try {
        res = await fetch(url, { signal, headers: { accept: 'application/json' } });
    } catch (e) {
        throw new RicePluginError('fetch-failed', `カタログに接続できません: ${e instanceof Error ? e.message : String(e)}`);
    }
    if (!res.ok) {
        throw new RicePluginError('fetch-failed', `${nsid} が失敗しました (HTTP ${res.status})`);
    }
    return (await res.json()) as T;
}

export function getPlugins(
    options: { limit?: number; cursor?: string; sort?: 'popular' | 'recent'; tag?: string; verifiedOnly?: boolean } = {},
    signal?: AbortSignal,
): Promise<PluginPage> {
    const params = new URLSearchParams();
    if (options.limit) params.set('limit', String(options.limit));
    if (options.cursor) params.set('cursor', options.cursor);
    if (options.sort) params.set('sort', options.sort);
    if (options.tag) params.set('tag', options.tag);
    if (options.verifiedOnly) params.set('verifiedOnly', 'true');
    return query<PluginPage>('tech.tokimeki.plugin.getPlugins', params, signal);
}

export function searchPlugins(q: string, options: { limit?: number; cursor?: string } = {}, signal?: AbortSignal): Promise<PluginPage> {
    const params = new URLSearchParams({ q });
    if (options.limit) params.set('limit', String(options.limit));
    if (options.cursor) params.set('cursor', options.cursor);
    return query<PluginPage>('tech.tokimeki.plugin.searchPlugins', params, signal);
}

export function getPlugin(by: { uri?: string; id?: string }, signal?: AbortSignal): Promise<{ plugin: PluginView }> {
    const params = new URLSearchParams();
    if (by.uri) params.set('uri', by.uri);
    else if (by.id) params.set('id', by.id);
    return query<{ plugin: PluginView }>('tech.tokimeki.plugin.getPlugin', params, signal);
}

export function updatedPluginIds(
    installed: Record<string, { source: { kind: 'url'; manifestUrl: string } | { kind: 'at'; uri: string; entryCid: string } }>,
    updates: PluginUpdate[],
): string[] {
    const byUri = new Map(updates.map((update) => [update.uri, update]));
    return Object.entries(installed)
        .filter(([, plugin]) => plugin.source.kind === 'at')
        .filter(([, plugin]) => {
            const source = plugin.source as { kind: 'at'; uri: string; entryCid: string };
            const update = byUri.get(source.uri);
            return update !== undefined && update.latestCid !== source.entryCid;
        })
        .map(([id]) => id);
}

export async function getUpdates(uris: string[], signal?: AbortSignal): Promise<PluginUpdate[]> {
    if (uris.length === 0) return [];
    const results: PluginUpdate[] = [];
    for (let i = 0; i < uris.length; i += 100) {
        const params = new URLSearchParams();
        for (const uri of uris.slice(i, i + 100)) params.append('uris', uri);
        const page = await query<{ updates: PluginUpdate[] }>('tech.tokimeki.plugin.getUpdates', params, signal);
        results.push(...page.updates);
    }
    return results;
}
