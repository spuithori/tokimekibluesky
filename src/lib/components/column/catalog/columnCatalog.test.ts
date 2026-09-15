import { describe, it, expect } from 'vitest';
import { buildCatalog, columnKey, countAddedByKey, filterCatalog, type CatalogSources } from './columnCatalog';

function sources(overrides: Partial<CatalogSources> = {}): CatalogSources {
    return {
        did: 'did:plc:me',
        handle: 'me.test',
        feeds: [],
        lists: [],
        cloudLists: [],
        cloudBookmarks: [],
        localLists: [],
        localBookmarks: [],
        migratableLocalListIds: new Set(),
        atmosphereEnabled: true,
        labels: {
            notifications: 'Notifications',
            myPost: 'My posts',
            myMedia: 'My media',
            likes: 'Likes',
            officialBookmark: 'Bookmarks',
            chatList: 'Chats',
            mochott: 'mochott',
            networkFeed: 'standard.site',
        },
        ...overrides,
    };
}

describe('columnKey', () => {
    it('joins type and algorithm, treating a missing algorithm as empty', () => {
        expect(columnKey({ algorithm: { type: 'default' } })).toBe('default:');
        expect(columnKey({ algorithm: { type: 'custom', algorithm: 'at://feed' } })).toBe('custom:at://feed');
        expect(columnKey({ algorithm: { type: 'bookmark', algorithm: 3 } })).toBe('bookmark:3');
    });
});

describe('countAddedByKey', () => {
    it('counts only columns of the given account', () => {
        const counts = countAddedByKey([
            { did: 'did:plc:me', algorithm: { type: 'default' } },
            { did: 'did:plc:me', algorithm: { type: 'default' } },
            { did: 'did:plc:other', algorithm: { type: 'default' } },
            { did: 'did:plc:me', algorithm: { type: 'custom', algorithm: 'at://feed' } },
        ], 'did:plc:me');
        expect(counts.get('default:')).toBe(2);
        expect(counts.get('custom:at://feed')).toBe(1);
        expect(counts.size).toBe(2);
    });
});

describe('buildCatalog', () => {
    it('orders sections basic, feeds, lists, bookmarks, merge, atmosphere, local', () => {
        expect(buildCatalog(sources()).map(section => section.id)).toEqual([
            'basic', 'feeds', 'lists', 'bookmarks', 'merge', 'atmosphere', 'local',
        ]);
    });

    it('puts pinned feeds first while keeping the incoming order otherwise', () => {
        const catalog = buildCatalog(sources({
            feeds: [
                { uri: 'at://a', name: 'A' },
                { uri: 'at://b', name: 'B', pinned: true, creator: { did: 'did:plc:c', handle: 'c.test' } },
                { uri: 'at://c', name: 'C' },
                { uri: 'at://d', name: 'D', pinned: true },
            ],
        }));
        const feeds = catalog.find(section => section.id === 'feeds')!;
        expect(feeds.items.map(item => item.column.algorithm.name)).toEqual(['B', 'D', 'A', 'C']);
        expect(feeds.items[0].pinned).toBe(true);
        expect(feeds.items[0].subtitle).toBe('@c.test');
    });

    it('hides atmosphere items when disabled', () => {
        const catalog = buildCatalog(sources({ atmosphereEnabled: false }));
        expect(catalog.find(section => section.id === 'atmosphere')!.items).toEqual([]);
    });

    it('keeps only the local lists and bookmarks owned by the account and flags migratable lists', () => {
        const catalog = buildCatalog(sources({
            localLists: [
                { id: 1, name: 'Mine', owner: 'did:plc:me' },
                { id: 2, name: 'Theirs', owner: 'did:plc:other' },
            ],
            localBookmarks: [{ id: 9, name: 'Saved', owner: 'did:plc:me' }],
            migratableLocalListIds: new Set(['1']),
        }));
        const local = catalog.find(section => section.id === 'local')!;
        expect(local.items.map(item => item.column.algorithm.name)).toEqual(['Mine', 'Saved']);
        expect(local.items[0].migratable).toBe(true);
        expect(local.items[0].editable).toBe('list');
        expect(local.items[1].editable).toBe('bookmark');
    });

    it('stamps every template column with the account did and handle', () => {
        const catalog = buildCatalog(sources());
        for (const section of catalog) {
            for (const item of section.items) {
                expect(item.column.did).toBe('did:plc:me');
                expect(item.column.handle).toBe('me.test');
                expect(item.column.data).toEqual({ feed: [], cursor: '' });
            }
        }
    });
});

describe('filterCatalog', () => {
    const catalog = buildCatalog(sources({
        feeds: [{ uri: 'at://x', name: 'Cat pictures', creator: { did: 'did:plc:c', handle: 'kitty.test' } }],
    }));

    it('returns the input untouched for a blank query', () => {
        expect(filterCatalog(catalog, '  ')).toBe(catalog);
    });

    it('matches case-insensitively on names and subtitles and drops empty sections', () => {
        const byName = filterCatalog(catalog, 'pictures');
        expect(byName.map(section => section.id)).toEqual(['feeds']);

        const bySubtitle = filterCatalog(catalog, 'KITTY');
        expect(bySubtitle[0].items[0].column.algorithm.name).toBe('Cat pictures');

        const basic = filterCatalog(catalog, 'home');
        expect(basic.map(section => section.id)).toEqual(['basic']);
        expect(basic[0].items).toHaveLength(1);
    });

    it('matches ASCII queries against the start of words, not arbitrary substrings', () => {
        const cat = filterCatalog(catalog, 'cat');
        expect(cat.map(section => section.id)).toEqual(['feeds']);
        expect(filterCatalog(catalog, 'notif')[0].items[0].column.algorithm.name).toBe('Notifications');
        expect(filterCatalog(catalog, 'cat pic')).toHaveLength(1);
        expect(filterCatalog(catalog, 'ations')).toHaveLength(0);
    });

    it('matches non-ASCII queries anywhere in the name', () => {
        const jp = buildCatalog(sources({ feeds: [{ uri: 'at://n', name: '猫の写真' }] }));
        expect(filterCatalog(jp, '写真')[0].items[0].column.algorithm.name).toBe('猫の写真');
    });
});
