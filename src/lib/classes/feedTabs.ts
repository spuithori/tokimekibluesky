import type { Column } from '$lib/types/column';
import { defaultDeckSettings } from '$lib/components/deck/defaultDeckSettings';

export type PinnedFeedItem = {
    type: 'feed' | 'list' | 'timeline';
    value: string;
    name?: string;
};

export function feedKeyOfPinnedItem(item: PinnedFeedItem | undefined): string | null {
    if (!item) return null;
    if (item.type === 'timeline') return 'timeline';
    if (item.type === 'feed') return item.value ? `feed:${item.value}` : null;
    if (item.type === 'list') return item.value ? `list:${item.value}` : null;
    return null;
}

export function feedKeyOfColumn(column: Column | undefined): string | null {
    const algorithm = column?.algorithm;
    if (!algorithm) return null;
    if (algorithm.type === 'default') return 'timeline';
    if (algorithm.type === 'custom') return algorithm.algorithm ? `feed:${algorithm.algorithm}` : null;
    if (algorithm.type === 'officialList') return algorithm.algorithm ? `list:${algorithm.algorithm}` : null;
    return null;
}

export function buildPinnedColumn(item: PinnedFeedItem, did: string, handle?: string): Column {
    const algorithm = item.type === 'feed'
        ? { type: 'custom' as const, algorithm: item.value, name: item.name ?? item.value }
        : item.type === 'list'
            ? { type: 'officialList' as const, algorithm: item.value, name: item.name ?? item.value }
            : { type: 'default' as const, name: 'HOME' };
    return {
        id: self.crypto.randomUUID(),
        algorithm,
        style: 'default',
        settings: { ...defaultDeckSettings },
        did,
        handle,
        data: {
            feed: [],
            cursor: '',
        },
    };
}

export function diffPinnedTabs(children: string[], columns: Column[], pinnedItems: PinnedFeedItem[]): {
    toAdd: PinnedFeedItem[];
    toRemoveIds: string[];
    orderedKeys: string[];
} {
    const byId = new Map(columns.map((c) => [c.id, c]));
    const keyOfChild = new Map(children.map((id) => [id, feedKeyOfColumn(byId.get(id))]));
    const orderedKeys: string[] = [];
    for (const item of pinnedItems) {
        const key = feedKeyOfPinnedItem(item);
        if (key !== null && !orderedKeys.includes(key)) orderedKeys.push(key);
    }
    const wanted = new Set(orderedKeys);
    const existing = new Set([...keyOfChild.values()].filter((k): k is string => k !== null));
    const queued = new Set<string>();
    const toAdd = pinnedItems.filter((item) => {
        const key = feedKeyOfPinnedItem(item);
        if (key === null || existing.has(key) || queued.has(key)) return false;
        queued.add(key);
        return true;
    });
    const toRemoveIds = children.filter((id) => {
        const key = keyOfChild.get(id);
        return !key || !wanted.has(key);
    });
    return { toAdd, toRemoveIds, orderedKeys };
}
