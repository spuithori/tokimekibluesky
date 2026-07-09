import { describe, expect, it } from 'vitest';
import { buildPinnedColumn, diffPinnedTabs, feedKeyOfColumn, feedKeyOfPinnedItem, type PinnedFeedItem } from './feedTabs';
import type { Column } from '$lib/types/column';

function col(id: string, algorithm: any): Column {
    return {
        id,
        algorithm,
        style: 'default',
        did: 'did:plc:me',
        settings: {},
        data: { cursor: '' },
    } as Column;
}

describe('feedKey', () => {
    it('pinned item は timeline / feed:<uri> / list:<uri> に写像される', () => {
        expect(feedKeyOfPinnedItem({ type: 'timeline', value: 'following' })).toBe('timeline');
        expect(feedKeyOfPinnedItem({ type: 'feed', value: 'at://did/feed/x' })).toBe('feed:at://did/feed/x');
        expect(feedKeyOfPinnedItem({ type: 'list', value: 'at://did/list/y' })).toBe('list:at://did/list/y');
        expect(feedKeyOfPinnedItem({ type: 'feed', value: '' })).toBeNull();
        expect(feedKeyOfPinnedItem(undefined)).toBeNull();
    });

    it('column は default / custom / officialList のみキーを持ち他は null', () => {
        expect(feedKeyOfColumn(col('a', { type: 'default', name: 'HOME' }))).toBe('timeline');
        expect(feedKeyOfColumn(col('b', { type: 'custom', algorithm: 'at://did/feed/x' }))).toBe('feed:at://did/feed/x');
        expect(feedKeyOfColumn(col('c', { type: 'officialList', algorithm: 'at://did/list/y' }))).toBe('list:at://did/list/y');
        expect(feedKeyOfColumn(col('d', { type: 'notification' }))).toBeNull();
        expect(feedKeyOfColumn(undefined)).toBeNull();
    });
});

describe('buildPinnedColumn', () => {
    it('timeline は default/HOME、feed は custom、list は officialList のカラムになる', () => {
        const home = buildPinnedColumn({ type: 'timeline', value: 'following' }, 'did:plc:me', 'me.test');
        expect(home.algorithm).toEqual({ type: 'default', name: 'HOME' });
        expect(home.did).toBe('did:plc:me');
        expect(home.handle).toBe('me.test');
        expect(home.data).toEqual({ feed: [], cursor: '' });

        const feed = buildPinnedColumn({ type: 'feed', value: 'at://did/feed/x', name: 'Cats' }, 'did:plc:me');
        expect(feed.algorithm).toEqual({ type: 'custom', algorithm: 'at://did/feed/x', name: 'Cats' });

        const list = buildPinnedColumn({ type: 'list', value: 'at://did/list/y' }, 'did:plc:me');
        expect(list.algorithm).toEqual({ type: 'officialList', algorithm: 'at://did/list/y', name: 'at://did/list/y' });
    });

    it('settings は defaultDeckSettings のコピーで共有参照にならない', () => {
        const a = buildPinnedColumn({ type: 'timeline', value: 'following' }, 'did:plc:me');
        const b = buildPinnedColumn({ type: 'timeline', value: 'following' }, 'did:plc:me');
        expect(a.settings).not.toBe(b.settings);
        expect(a.id).not.toBe(b.id);
    });
});

describe('diffPinnedTabs', () => {
    const columns = [
        col('home', { type: 'default', name: 'HOME' }),
        col('cats', { type: 'custom', algorithm: 'at://did/feed/cats' }),
        col('news', { type: 'custom', algorithm: 'at://did/feed/news' }),
    ];

    it('追加・削除・公式順を算出する', () => {
        const pinned: PinnedFeedItem[] = [
            { type: 'timeline', value: 'following' },
            { type: 'feed', value: 'at://did/feed/dogs', name: 'Dogs' },
            { type: 'feed', value: 'at://did/feed/cats', name: 'Cats' },
        ];
        const diff = diffPinnedTabs(['home', 'cats', 'news'], columns, pinned);
        expect(diff.toAdd).toEqual([{ type: 'feed', value: 'at://did/feed/dogs', name: 'Dogs' }]);
        expect(diff.toRemoveIds).toEqual(['news']);
        expect(diff.orderedKeys).toEqual(['timeline', 'feed:at://did/feed/dogs', 'feed:at://did/feed/cats']);
    });

    it('差分が無ければ空、重複ピンは1件に畳む', () => {
        const pinned: PinnedFeedItem[] = [
            { type: 'timeline', value: 'following' },
            { type: 'timeline', value: 'following' },
            { type: 'feed', value: 'at://did/feed/cats' },
            { type: 'feed', value: 'at://did/feed/news' },
        ];
        const diff = diffPinnedTabs(['home', 'cats', 'news'], columns, pinned);
        expect(diff.toAdd).toEqual([]);
        expect(diff.toRemoveIds).toEqual([]);
        expect(diff.orderedKeys).toEqual(['timeline', 'feed:at://did/feed/cats', 'feed:at://did/feed/news']);
    });

    it('キーを持たないカラム(タブ外種別)は削除対象になる', () => {
        const mixed = [...columns, col('notif', { type: 'notification' })];
        const diff = diffPinnedTabs(['home', 'notif'], mixed, [{ type: 'timeline', value: 'following' }]);
        expect(diff.toRemoveIds).toEqual(['notif']);
    });
});
