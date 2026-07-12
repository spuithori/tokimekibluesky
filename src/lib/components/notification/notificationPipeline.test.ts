import { describe, it, expect, vi } from 'vitest';
import {
    bundleNotifications,
    mergeNotifications,
    filterNotifications,
    ensureNotificationFilter,
    resetNotificationColumnData,
    resolveSubjectPosts,
    refreshNotificationColumn,
    loadMoreNotificationColumn,
    markNotificationsSeen,
    markAllNotificationsRead,
    NOTIFICATION_DEFAULT_FILTERS,
    NOTIFICATION_FETCH_LIMIT,
    MAX_NOTIFICATIONS,
    type NotificationView,
    type NotificationCtx,
} from './notificationPipeline';

let seq = 0;

function makeNotification(over: Partial<NotificationView> = {}): NotificationView {
    seq++;
    return {
        uri: `at://did:plc:user${seq}/app.bsky.feed.like/${seq}`,
        cid: `cid${seq}`,
        author: { did: `did:plc:user${seq}`, handle: `user${seq}.test` },
        reason: 'like',
        reasonSubject: 'at://did:plc:me/app.bsky.feed.post/target',
        record: { subject: { uri: 'at://did:plc:me/app.bsky.feed.post/target' } },
        isRead: false,
        indexedAt: new Date(Date.UTC(2026, 0, 1, 0, 0, seq)).toISOString(),
        ...over,
    };
}

function makeCtx(opts: {
    feed?: any[],
    notifications?: NotificationView[],
    cursor?: string,
    settings?: Record<string, unknown>,
    filter?: string[],
    listResponses?: any[],
    getPostsError?: boolean,
    updateSeenError?: boolean,
} = {}) {
    const columnId = 'col1';
    const feeds = new Map<string, any[]>([[columnId, opts.feed ?? []]]);
    const column: any = {
        id: columnId,
        algorithm: { type: 'notification', name: 'Notifications' },
        style: 'default',
        did: 'did:plc:me',
        unreadCount: 3,
        filter: opts.filter,
        settings: opts.settings ?? {},
        data: {
            feed: [],
            cursor: opts.cursor ?? '',
            notifications: opts.notifications ?? [],
        },
    };
    const listResponses = [...(opts.listResponses ?? [])];
    const xrpcGet = vi.fn(async (nsid: string, params: any) => {
        if (nsid === 'app.bsky.notification.listNotifications') {
            return listResponses.shift() ?? { cursor: undefined, notifications: [] };
        }
        if (nsid === 'app.bsky.feed.getPosts') {
            if (opts.getPostsError) {
                throw new Error('getPosts failed');
            }
            return { posts: params.uris.map((uri: string) => ({ uri, likeCount: 1 })) };
        }
        throw new Error(`unexpected xrpc get: ${nsid}`);
    });
    const xrpcPost = vi.fn(async (nsid: string) => {
        if (nsid === 'app.bsky.notification.updateSeen' && opts.updateSeenError) {
            throw new Error('updateSeen failed');
        }
        return {};
    });
    const columnState = {
        getFeed: (id: string) => feeds.get(id) ?? [],
        setFeed: (id: string, feed: any[]) => { feeds.set(id, feed); },
        replaceFeed: (id: string, fn: (feed: any[]) => any[]) => { feeds.set(id, fn(feeds.get(id) ?? [])); },
    };
    const ctx: NotificationCtx = { column, columnState, _agent: { xrpc: { get: xrpcGet, post: xrpcPost } } };
    return { ctx, column, feeds, columnId, xrpcGet, xrpcPost };
}

describe('bundleNotifications', () => {
    it('groups same reasonSubject + reason together', () => {
        const a = makeNotification();
        const b = makeNotification();
        const groups = bundleNotifications([a, b]);
        expect(groups).toHaveLength(1);
        expect(groups[0].notifications).toHaveLength(2);
        expect(groups[0].reason).toBe('like');
    });

    it('keeps reply, mention and quote as solo groups even with reasonSubject', () => {
        const items = ['reply', 'mention', 'quote'].map(reason =>
            makeNotification({ reason, reasonSubject: 'at://did:plc:me/app.bsky.feed.post/root' }));
        const groups = bundleNotifications(items);
        expect(groups).toHaveLength(3);
    });

    it('keeps notifications without reasonSubject solo', () => {
        const a = makeNotification({ reasonSubject: undefined });
        const b = makeNotification({ reasonSubject: undefined });
        expect(bundleNotifications([a, b])).toHaveLength(2);
    });

    it('separates same subject by reason', () => {
        const like = makeNotification({ reason: 'like' });
        const repost = makeNotification({ reason: 'repost' });
        expect(bundleNotifications([like, repost])).toHaveLength(2);
    });

    it('uses the newest notification uri as key and latestIndexedAt', () => {
        const older = makeNotification();
        const newer = makeNotification();
        const groups = bundleNotifications([older, newer]);
        expect(groups[0].key).toBe(newer.uri);
        expect(groups[0].latestIndexedAt).toBe(newer.indexedAt);
        expect(groups[0].notifications[0]).toBe(newer);
    });

    it('derives subject from record.subject.uri for reactions', () => {
        const like = makeNotification();
        expect(bundleNotifications([like])[0].subject).toBe('at://did:plc:me/app.bsky.feed.post/target');
    });

    it('derives subject from own uri for replies', () => {
        const reply = makeNotification({ reason: 'reply', reasonSubject: 'at://did:plc:me/app.bsky.feed.post/root' });
        expect(bundleNotifications([reply])[0].subject).toBe(reply.uri);
    });

    it('leaves follow subject undefined', () => {
        const follow = makeNotification({
            reason: 'follow',
            reasonSubject: undefined,
            record: undefined,
            uri: 'at://did:plc:someone/app.bsky.graph.follow/1',
        });
        expect(bundleNotifications([follow])[0].subject).toBeUndefined();
    });

    it('sorts groups by latestIndexedAt descending', () => {
        const oldest = makeNotification({ reasonSubject: 'at://a', record: { subject: { uri: 'at://a' } } });
        const middle = makeNotification({ reason: 'reply', reasonSubject: 'at://b' });
        const newest = makeNotification({ reasonSubject: 'at://c', record: { subject: { uri: 'at://c' } } });
        const groups = bundleNotifications([oldest, newest, middle]);
        expect(groups.map(g => g.latestIndexedAt)).toEqual([newest.indexedAt, middle.indexedAt, oldest.indexedAt]);
    });
});

describe('mergeNotifications', () => {
    it('dedupes by uri preferring fresh data', () => {
        const existing = makeNotification();
        const fresh = { ...existing, cid: 'updated' };
        const merged = mergeNotifications([fresh], [existing]);
        expect(merged).toHaveLength(1);
        expect(merged[0].cid).toBe('updated');
    });

    it('keeps local isRead sticky against a fresh unread copy', () => {
        const existing = makeNotification({ isRead: true });
        const fresh = { ...existing, isRead: false };
        expect(mergeNotifications([fresh], [existing])[0].isRead).toBe(true);
    });

    it('marks only known notifications as read with markKnownAsRead', () => {
        const known = makeNotification();
        const incoming = makeNotification();
        const merged = mergeNotifications([{ ...known }, incoming], [known], { markKnownAsRead: true });
        expect(merged.find(item => item.uri === known.uri)?.isRead).toBe(true);
        expect(merged.find(item => item.uri === incoming.uri)?.isRead).toBe(false);
    });

    it('marks existing-only notifications as read with markKnownAsRead', () => {
        const existing = makeNotification();
        const merged = mergeNotifications([], [existing], { markKnownAsRead: true });
        expect(merged[0].isRead).toBe(true);
    });

    it('does not mutate inputs', () => {
        const existing = makeNotification();
        const fresh = makeNotification();
        mergeNotifications([fresh], [existing], { markKnownAsRead: true });
        expect(existing.isRead).toBe(false);
        expect(fresh.isRead).toBe(false);
    });
});

describe('filterNotifications', () => {
    it('filters by reason', () => {
        const like = makeNotification({ reason: 'like' });
        const follow = makeNotification({ reason: 'follow' });
        expect(filterNotifications([like, follow], ['like'])).toEqual([like]);
    });

    it('survives a missing author.viewer', () => {
        const item = makeNotification({ author: { did: 'did:plc:x', handle: 'x.test' } });
        expect(filterNotifications([item], ['like'])).toEqual([item]);
    });

    it('drops muted authors', () => {
        const item = makeNotification({ author: { did: 'did:plc:x', handle: 'x.test', viewer: { muted: true } } });
        expect(filterNotifications([item], ['like'])).toEqual([]);
    });

    it('drops read notifications when onlyUnread', () => {
        const read = makeNotification({ isRead: true });
        const unread = makeNotification();
        expect(filterNotifications([read, unread], ['like'], true)).toEqual([unread]);
    });
});

describe('ensureNotificationFilter', () => {
    it('fills in defaults when missing or empty', () => {
        const column: any = { filter: undefined };
        expect(ensureNotificationFilter(column)).toEqual(NOTIFICATION_DEFAULT_FILTERS);
        column.filter = [];
        expect(ensureNotificationFilter(column)).toEqual(NOTIFICATION_DEFAULT_FILTERS);
    });

    it('keeps an existing filter untouched', () => {
        const column: any = { filter: ['like'] };
        expect(ensureNotificationFilter(column)).toEqual(['like']);
    });
});

describe('resolveSubjectPosts', () => {
    it('chunks getPosts requests at 25 uris', async () => {
        const { ctx, xrpcGet } = makeCtx();
        const groups = bundleNotifications(Array.from({ length: 26 }, (_, i) =>
            makeNotification({ reasonSubject: `at://post/${i}`, record: { subject: { uri: `at://post/${i}` } } })));
        await resolveSubjectPosts(ctx, groups);
        const calls = xrpcGet.mock.calls.filter(([nsid]) => nsid === 'app.bsky.feed.getPosts');
        expect(calls).toHaveLength(2);
        expect(groups.every(group => group.post?.uri === group.subject)).toBe(true);
    });

    it('reuses posts already present in the feed', async () => {
        const known = { uri: 'at://did:plc:me/app.bsky.feed.post/target', likeCount: 9 };
        const { ctx, xrpcGet } = makeCtx({ feed: [{ key: 'k', post: known }] });
        const groups = bundleNotifications([makeNotification()]);
        await resolveSubjectPosts(ctx, groups);
        expect(xrpcGet.mock.calls.filter(([nsid]) => nsid === 'app.bsky.feed.getPosts')).toHaveLength(0);
        expect(groups[0].post).toBe(known);
    });

    it('keeps other groups alive when getPosts fails', async () => {
        const { ctx } = makeCtx({ getPostsError: true });
        const groups = bundleNotifications([makeNotification()]);
        await expect(resolveSubjectPosts(ctx, groups)).resolves.toBeUndefined();
        expect(groups[0].post).toBeUndefined();
    });
});

describe('refreshNotificationColumn', () => {
    it('fetches, bundles and stores notifications', async () => {
        const incoming = [makeNotification(), makeNotification()];
        const { ctx, column, feeds, columnId } = makeCtx({
            listResponses: [{ cursor: 'c1', notifications: incoming }],
        });
        const result = await refreshNotificationColumn(ctx);
        expect(column.data.notifications).toHaveLength(2);
        expect(feeds.get(columnId)).toHaveLength(1);
        expect(feeds.get(columnId)![0].post?.uri).toBe('at://did:plc:me/app.bsky.feed.post/target');
        expect(result.newestIndexedAt).toBe(incoming[0].indexedAt);
        expect(result.pruned).toBe(false);
    });

    it('requests with the unified limit and reasons', async () => {
        const { ctx, xrpcGet } = makeCtx();
        await refreshNotificationColumn(ctx);
        const [, params] = xrpcGet.mock.calls.find(([nsid]) => nsid === 'app.bsky.notification.listNotifications')!;
        expect(params.limit).toBe(NOTIFICATION_FETCH_LIMIT);
        expect(params.reasons).toEqual(NOTIFICATION_DEFAULT_FILTERS);
    });

    it('marks known notifications read but keeps new arrivals unread on manual refresh', async () => {
        const known = makeNotification();
        const incoming = makeNotification();
        const { ctx, column } = makeCtx({
            notifications: [known],
            listResponses: [{ cursor: 'c1', notifications: [{ ...known }, incoming] }],
        });
        await refreshNotificationColumn(ctx, { markAsRead: true });
        expect(column.data.notifications.find((item: NotificationView) => item.uri === known.uri)?.isRead).toBe(true);
        expect(column.data.notifications.find((item: NotificationView) => item.uri === incoming.uri)?.isRead).toBe(false);
    });

    it('prunes the ledger to the fresh page when over the cap', async () => {
        const ledger = Array.from({ length: MAX_NOTIFICATIONS }, () => makeNotification());
        const incoming = [makeNotification()];
        const { ctx, column } = makeCtx({
            notifications: ledger,
            listResponses: [{ cursor: 'next', notifications: incoming }],
        });
        const result = await refreshNotificationColumn(ctx, { markAsRead: true, allowPrune: true });
        expect(result.pruned).toBe(true);
        expect(column.data.notifications).toHaveLength(1);
        expect(column.data.cursor).toBe('next');
    });

    it('does not prune without allowPrune', async () => {
        const ledger = Array.from({ length: MAX_NOTIFICATIONS }, () => makeNotification());
        const { ctx, column } = makeCtx({
            notifications: ledger,
            listResponses: [{ cursor: 'next', notifications: [makeNotification()] }],
        });
        const result = await refreshNotificationColumn(ctx, { markAsRead: true });
        expect(result.pruned).toBe(false);
        expect(column.data.notifications.length).toBe(MAX_NOTIFICATIONS + 1);
    });

    it('replaces the ledger with unread only in onlyShowUnread mode', async () => {
        const read = makeNotification({ isRead: true });
        const unread = makeNotification();
        const { ctx, column } = makeCtx({
            settings: { onlyShowUnread: true },
            notifications: [makeNotification()],
            listResponses: [{ cursor: 'c1', notifications: [read, unread] }],
        });
        await refreshNotificationColumn(ctx);
        expect(column.data.notifications).toEqual([unread]);
    });

    it('drops already shown notifications on manual onlyShowUnread refresh', async () => {
        const shown = makeNotification();
        const incoming = makeNotification();
        const { ctx, column } = makeCtx({
            settings: { onlyShowUnread: true },
            feed: bundleNotifications([shown]),
            notifications: [shown],
            listResponses: [{ cursor: 'c1', notifications: [{ ...shown }, incoming] }],
        });
        await refreshNotificationColumn(ctx, { markAsRead: true });
        expect(column.data.notifications.map((item: NotificationView) => item.uri)).toEqual([incoming.uri]);
    });
});

describe('loadMoreNotificationColumn', () => {
    it('appends the next page and advances the cursor', async () => {
        const known = makeNotification();
        const older = makeNotification();
        const { ctx, column, feeds, columnId } = makeCtx({
            cursor: 'c1',
            notifications: [known],
            feed: bundleNotifications([known]),
            listResponses: [{ cursor: 'c2', notifications: [older] }],
        });
        const result = await loadMoreNotificationColumn(ctx);
        expect(result).toBe('loaded');
        expect(column.data.cursor).toBe('c2');
        expect(column.data.notifications.map((item: NotificationView) => item.uri)).toEqual([known.uri, older.uri]);
        expect(feeds.get(columnId)).toHaveLength(2);
    });

    it('dedupes against the ledger and existing feed keys', async () => {
        const known = makeNotification();
        const { ctx, column, feeds, columnId } = makeCtx({
            cursor: 'c1',
            notifications: [known],
            feed: bundleNotifications([known]),
            listResponses: [{ cursor: 'c2', notifications: [{ ...known }] }],
        });
        await loadMoreNotificationColumn(ctx);
        expect(column.data.notifications).toHaveLength(1);
        expect(feeds.get(columnId)).toHaveLength(1);
    });

    it('completes when the cursor runs out', async () => {
        const { ctx } = makeCtx({
            cursor: 'c1',
            listResponses: [{ cursor: undefined, notifications: [makeNotification()] }],
        });
        expect(await loadMoreNotificationColumn(ctx)).toBe('complete');
    });

    it('completes on an empty page', async () => {
        const { ctx } = makeCtx({
            cursor: 'c1',
            listResponses: [{ cursor: 'c2', notifications: [] }],
        });
        expect(await loadMoreNotificationColumn(ctx)).toBe('complete');
    });

    it('keeps loading on a page of read notifications when not onlyShowUnread', async () => {
        const read = makeNotification({ isRead: true });
        const { ctx } = makeCtx({
            cursor: 'c1',
            listResponses: [{ cursor: 'c2', notifications: [read] }],
        });
        expect(await loadMoreNotificationColumn(ctx)).toBe('loaded');
    });

    it('completes on an all-read page in onlyShowUnread mode', async () => {
        const read = makeNotification({ isRead: true });
        const { ctx } = makeCtx({
            cursor: 'c1',
            settings: { onlyShowUnread: true },
            listResponses: [{ cursor: 'c2', notifications: [read] }],
        });
        expect(await loadMoreNotificationColumn(ctx)).toBe('complete');
    });
});

describe('markNotificationsSeen', () => {
    it('clears unreadCount after updateSeen succeeds', async () => {
        const { ctx, column, xrpcPost } = makeCtx();
        await markNotificationsSeen(ctx);
        expect(xrpcPost).toHaveBeenCalledWith('app.bsky.notification.updateSeen', expect.anything());
        expect(column.unreadCount).toBe(0);
    });

    it('keeps unreadCount when updateSeen fails', async () => {
        const { ctx, column } = makeCtx({ updateSeenError: true });
        await markNotificationsSeen(ctx);
        expect(column.unreadCount).toBe(3);
    });
});

describe('markAllNotificationsRead', () => {
    it('marks ledger and feed as read after updateSeen succeeds', async () => {
        const item = makeNotification();
        const { ctx, column, feeds, columnId } = makeCtx({
            notifications: [item],
            feed: bundleNotifications([item]),
        });
        await markAllNotificationsRead(ctx);
        expect(column.unreadCount).toBe(0);
        expect(column.data.notifications.every((n: NotificationView) => n.isRead)).toBe(true);
        expect(feeds.get(columnId)!.every(group => group.notifications.every((n: NotificationView) => n.isRead))).toBe(true);
        expect(item.isRead).toBe(false);
    });

    it('throws and leaves state untouched when updateSeen fails', async () => {
        const item = makeNotification();
        const { ctx, column } = makeCtx({
            notifications: [item],
            feed: bundleNotifications([item]),
            updateSeenError: true,
        });
        await expect(markAllNotificationsRead(ctx)).rejects.toThrow();
        expect(column.unreadCount).toBe(3);
        expect(column.data.notifications[0].isRead).toBe(false);
    });
});

describe('resetNotificationColumnData', () => {
    it('clears the ledger and cursor', () => {
        const { column } = makeCtx({ notifications: [makeNotification()], cursor: 'c9' });
        resetNotificationColumnData(column);
        expect(column.data.notifications).toEqual([]);
        expect(column.data.cursor).toBe('');
    });
});
