import type { Column } from "$lib/types/column";
import { defaultDeckSettings } from "$lib/components/deck/defaultDeckSettings";

export type CatalogSectionId = 'basic' | 'feeds' | 'lists' | 'bookmarks' | 'merge' | 'atmosphere' | 'local';

export type CatalogEditable = 'list' | 'cloudList' | 'officialList' | 'bookmark' | 'cloudBookmark';

export interface CatalogItem {
    key: string;
    column: Column;
    subtitle?: string;
    pinned?: boolean;
    editable?: CatalogEditable;
    migratable?: boolean;
    avatar?: string;
}

export interface CatalogSection {
    id: CatalogSectionId;
    items: CatalogItem[];
}

export interface CatalogFeed {
    uri: string;
    name: string;
    avatar?: string;
    creator?: { did: string; handle: string };
    pinned?: boolean;
}

export interface CatalogList {
    uri: string;
    name: string;
    avatar?: string;
    creator?: { did: string; handle: string };
    pinned?: boolean;
}

export interface CatalogCloudEntry {
    id: number | string;
    name: string;
}

export interface CatalogLocalEntry {
    id?: number | string;
    name: string;
    owner?: string;
}

export interface CatalogSources {
    did: string;
    handle: string;
    feeds: CatalogFeed[];
    lists: CatalogList[];
    cloudLists: CatalogCloudEntry[];
    cloudBookmarks: CatalogCloudEntry[];
    localLists: CatalogLocalEntry[];
    localBookmarks: CatalogLocalEntry[];
    migratableLocalListIds: Set<string>;
    atmosphereEnabled: boolean;
    labels: {
        notifications: string;
        myPost: string;
        myMedia: string;
        likes: string;
        officialBookmark: string;
        chatList: string;
        mochott: string;
        networkFeed: string;
    };
}

export function columnKey(column: { algorithm?: { type?: string; algorithm?: string | number } }): string {
    const type = column.algorithm?.type ?? '';
    const algorithm = column.algorithm?.algorithm;
    return `${type}:${algorithm === undefined || algorithm === null ? '' : String(algorithm)}`;
}

export function countAddedByKey(columns: Array<{ did?: string; algorithm?: { type?: string; algorithm?: string | number } }>, did: string): Map<string, number> {
    const counts = new Map<string, number>();
    for (const column of columns) {
        if (column.did !== did) {
            continue;
        }
        const key = columnKey(column);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
}

export function makeColumn(did: string, handle: string, algorithm: Column['algorithm']): Column {
    return {
        id: self.crypto.randomUUID(),
        algorithm,
        style: 'default',
        settings: defaultDeckSettings,
        did,
        handle,
        data: {
            feed: [],
            cursor: '',
        },
    } as Column;
}

function item(did: string, handle: string, algorithm: Column['algorithm'], extra: Partial<CatalogItem> = {}): CatalogItem {
    const column = makeColumn(did, handle, algorithm);
    return {
        key: columnKey(column),
        column,
        ...extra,
    };
}

export function buildCatalog(sources: CatalogSources): CatalogSection[] {
    const { did, handle, labels } = sources;

    const basic: CatalogItem[] = [
        item(did, handle, { type: 'default', name: 'HOME' }),
        item(did, handle, { type: 'notification', name: labels.notifications }),
        item(did, handle, { type: 'myPost', name: labels.myPost }),
        item(did, handle, { type: 'myMedia', name: labels.myMedia }),
        item(did, handle, { type: 'like', name: labels.likes }),
        item(did, handle, { type: 'officialBookmark', name: labels.officialBookmark }),
        item(did, handle, { type: 'chatList', name: labels.chatList }),
    ];

    const feeds = [...sources.feeds]
        .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
        .map(feed => item(did, handle, { type: 'custom', algorithm: feed.uri, name: feed.name, avatar: feed.avatar }, {
            subtitle: feed.creator?.handle ? `@${feed.creator.handle}` : undefined,
            pinned: Boolean(feed.pinned),
            avatar: feed.avatar,
        }));

    const lists = [
        ...[...sources.lists]
            .sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)))
            .map(list => item(did, handle, { type: 'officialList', algorithm: list.uri, name: list.name }, {
                subtitle: list.creator?.handle ? `@${list.creator.handle}` : undefined,
                pinned: Boolean(list.pinned),
                editable: 'officialList',
                avatar: list.avatar,
            })),
        ...sources.cloudLists.map(list => item(did, handle, { type: 'cloudList', algorithm: list.id as string, name: list.name }, {
            editable: 'cloudList',
        })),
    ];

    const bookmarks = sources.cloudBookmarks.map(bookmark => item(did, handle, { type: 'cloudBookmark', algorithm: bookmark.id as string, name: bookmark.name }, {
        editable: 'cloudBookmark',
    }));

    const atmosphere: CatalogItem[] = sources.atmosphereEnabled ? [
        item(did, handle, { type: 'mochottTimeline', name: labels.mochott }),
        item(did, handle, { type: 'networkFeed', name: labels.networkFeed }),
    ] : [];

    const local = [
        ...sources.localLists
            .filter(list => list.owner === did && list.id !== undefined)
            .map(list => item(did, handle, { type: 'list', algorithm: String(list.id), name: list.name, list: String(list.id) } as unknown as Column['algorithm'], {
                editable: 'list',
                migratable: sources.migratableLocalListIds.has(String(list.id)),
            })),
        ...sources.localBookmarks
            .filter(bookmark => bookmark.owner === did && bookmark.id !== undefined)
            .map(bookmark => item(did, handle, { type: 'bookmark', algorithm: String(bookmark.id), name: bookmark.name, list: String(bookmark.id) } as unknown as Column['algorithm'], {
                editable: 'bookmark',
            })),
    ];

    return [
        { id: 'basic', items: basic },
        { id: 'feeds', items: feeds },
        { id: 'lists', items: lists },
        { id: 'bookmarks', items: bookmarks },
        { id: 'merge', items: [] },
        { id: 'atmosphere', items: atmosphere },
        { id: 'local', items: local },
    ];
}

export function normalizeQuery(query: string): string {
    return query.trim().toLocaleLowerCase();
}

const ASCII_QUERY = /^[\x20-\x7e]+$/;

export function matchesQuery(item: CatalogItem, normalized: string): boolean {
    if (!normalized) {
        return true;
    }
    const haystack = `${item.column.algorithm?.name ?? ''} ${item.subtitle ?? ''}`.toLocaleLowerCase();
    if (!ASCII_QUERY.test(normalized)) {
        return haystack.includes(normalized);
    }
    const words = haystack.split(/[\s@._\-/:()]+/).filter(Boolean);
    return normalized.split(/\s+/).every(term => words.some(word => word.startsWith(term)));
}

export function filterCatalog(sections: CatalogSection[], query: string): CatalogSection[] {
    const normalized = normalizeQuery(query);
    if (!normalized) {
        return sections;
    }
    return sections
        .map(section => ({ ...section, items: section.items.filter(item => matchesQuery(item, normalized)) }))
        .filter(section => section.items.length > 0);
}
