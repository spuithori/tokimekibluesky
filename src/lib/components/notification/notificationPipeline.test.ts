import { describe, it, expect, vi } from 'vitest';
import {
    bundleNotifications,
    mergeNotifications,
    filterNotifications,
    applyLedgerToFeed,
    claimNotificationChime,
    clearNotificationBadgesForDid,
    ensureNotificationFilter,
    needsRefetchForFilter,
    projectNotification,
    sameNotification,
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
import { getNotificationLedger, getSeenEpoch, resetNotificationLedger } from './notificationLedger';

let seq = 0;
let ctxSeq = 0;

function makeNotification(over: Partial<NotificationView> = {}): NotificationView {
    seq++;
    return {
        uri: `at://did:plc:user${seq}/app.bsky.feed.like/${seq}`,
        author: { did: `did:plc:user${seq}`, handle: `user${seq}.test`, viewer: {} },
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
    const columnId = `col${++ctxSeq}`;
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
        },
    };
    const ledger = getNotificationLedger(columnId);
    ledger.notifications = opts.notifications ?? [];
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

    it('keys groups by subject, reason and newest member', () => {
        const older = makeNotification();
        const newer = makeNotification();
        const groups = bundleNotifications([older, newer]);
        expect(groups[0].key).toBe(`at://did:plc:me/app.bsky.feed.post/target:like:${newer.uri}`);
        expect(groups[0].latestIndexedAt).toBe(newer.indexedAt);
        expect(groups[0].notifications[0]).toBe(newer);
    });

    it('keeps the group key unchanged when an older notification joins from below', () => {
        const older = makeNotification();
        const newer = makeNotification();
        const keyBefore = bundleNotifications([newer])[0].key;
        expect(bundleNotifications([older, newer])[0].key).toBe(keyBefore);
    });

    it('uses a solo key for reply notifications', () => {
        const reply = makeNotification({ reason: 'reply', reasonSubject: 'at://did:plc:me/app.bsky.feed.post/root' });
        expect(bundleNotifications([reply])[0].key).toBe(`solo:${reply.uri}`);
    });

    it('groups same-subject reactions within one batch regardless of time distance', () => {
        const a = makeNotification({ indexedAt: '2026-01-01T00:00:00.000Z' });
        const b = makeNotification({ indexedAt: '2026-01-02T12:00:00.000Z' });
        const c = makeNotification({ indexedAt: '2026-01-04T03:00:00.000Z' });
        const groups = bundleNotifications([a, b, c]);
        expect(groups).toHaveLength(1);
        expect(groups[0].notifications).toHaveLength(3);
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
        const fresh = { ...existing, indexedAt: '2026-06-01T00:00:00.000Z' };
        const merged = mergeNotifications([fresh], [existing]);
        expect(merged).toHaveLength(1);
        expect(merged[0].indexedAt).toBe('2026-06-01T00:00:00.000Z');
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
        const item = makeNotification({ author: { did: 'did:plc:x', handle: 'x.test' } as any });
        expect(filterNotifications([item], ['like'])).toEqual([item]);
    });

    it('drops muted authors', () => {
        const item = makeNotification({ author: { did: 'did:plc:x', handle: 'x.test', viewer: { muted: true } } });
        expect(filterNotifications([item], ['like'])).toEqual([]);
    });

    it('drops read notifications when onlyUnread', () => {
        const read = makeNotification({ isRead: true });
        const unread = makeNotification();
        expect(filterNotifications([read, unread], ['like'], { onlyUnread: true })).toEqual([unread]);
    });

    it('keeps only followed authors when followingOnly', () => {
        const followed = makeNotification({ author: { did: 'did:plc:a', handle: 'a.test', viewer: { following: 'at://follow/1' } } });
        const stranger = makeNotification({ author: { did: 'did:plc:b', handle: 'b.test', viewer: {} } });
        const noViewer = makeNotification({ author: { did: 'did:plc:c', handle: 'c.test' } as any });
        expect(filterNotifications([followed, stranger, noViewer], ['like'], { followingOnly: true })).toEqual([followed]);
    });
});

describe('projectNotification', () => {
    function rawNotification() {
        return {
            uri: 'at://did:plc:sender/app.bsky.feed.like/1',
            cid: 'bafyraw',
            author: {
                did: 'did:plc:sender',
                handle: 'sender.test',
                displayName: 'Sender',
                avatar: 'https://cdn/avatar.jpg',
                description: 'bio text',
                viewer: { muted: false, following: 'at://follow/1', followedBy: 'at://follow/2', blockedBy: false },
                verification: { trustedVerifierStatus: 'valid', verifiedStatus: 'valid', verifications: [] },
                status: { isActive: true, record: { huge: 'blob' } },
                labels: [{ val: 'spam' }],
                associated: { lists: 3, feedgens: 1 },
                createdAt: '2020-01-01T00:00:00.000Z',
                indexedAt: '2020-01-01T00:00:00.000Z',
            },
            reason: 'like',
            reasonSubject: 'at://did:plc:me/app.bsky.feed.post/subj',
            record: {
                $type: 'app.bsky.feed.like',
                text: 'enormous post record text that should never reach the ledger',
                subject: { uri: 'at://did:plc:me/app.bsky.feed.post/subj', cid: 'bafysubj' },
                createdAt: '2026-01-01T00:00:00.000Z',
            },
            isRead: false,
            indexedAt: '2026-01-01T00:00:00.000Z',
            labels: [],
        };
    }

    it('keeps exactly the consumed fields and drops the rest', () => {
        const slim = projectNotification(rawNotification());

        expect(slim.uri).toBe('at://did:plc:sender/app.bsky.feed.like/1');
        expect(slim.reason).toBe('like');
        expect(slim.reasonSubject).toBe('at://did:plc:me/app.bsky.feed.post/subj');
        expect(slim.isRead).toBe(false);
        expect(slim.indexedAt).toBe('2026-01-01T00:00:00.000Z');
        expect(slim.record).toEqual({ subject: { uri: 'at://did:plc:me/app.bsky.feed.post/subj' } });
        expect(slim.author).toEqual({
            did: 'did:plc:sender',
            handle: 'sender.test',
            displayName: 'Sender',
            avatar: 'https://cdn/avatar.jpg',
            description: 'bio text',
            viewer: { muted: false, following: 'at://follow/1', followedBy: 'at://follow/2' },
            verification: { trustedVerifierStatus: 'valid', verifiedStatus: 'valid' },
            status: { isActive: true },
        });

        expect('cid' in slim).toBe(false);
        expect('labels' in slim).toBe(false);
        expect('labels' in slim.author).toBe(false);
        expect('associated' in slim.author).toBe(false);
        expect('$type' in (slim.record as object)).toBe(false);
        expect('text' in (slim.record as object)).toBe(false);
    });

    it('always provides viewer as an object even when the source lacks it', () => {
        const raw = rawNotification();
        delete (raw.author as any).viewer;
        const slim = projectNotification(raw);
        expect(slim.author.viewer).toEqual({ muted: undefined, following: undefined, followedBy: undefined });
        slim.author.viewer.following = 'at://follow/new';
        expect(slim.author.viewer.following).toBe('at://follow/new');
    });

    it('handles follow notifications without a subject record', () => {
        const slim = projectNotification({
            uri: 'at://did:plc:sender/app.bsky.graph.follow/1',
            author: { did: 'did:plc:sender', handle: 'sender.test' },
            reason: 'follow',
            record: { $type: 'app.bsky.graph.follow', subject: 'did:plc:me' },
            isRead: true,
            indexedAt: '2026-01-01T00:00:00.000Z',
        });
        expect(slim.record).toBeUndefined();
        expect(slim.reasonSubject).toBeUndefined();
        expect(slim.author.verification).toBeUndefined();
        expect(slim.author.status).toBeUndefined();
    });

    it('slims the ledger through refresh', async () => {
        const { ctx, column } = makeCtx({
            listResponses: [{ cursor: 'c1', notifications: [rawNotification()] }],
        });
        await refreshNotificationColumn(ctx);
        const stored = getNotificationLedger(column.id).notifications[0];
        expect('cid' in stored).toBe(false);
        expect('labels' in stored.author).toBe(false);
        expect('text' in (stored.record as object)).toBe(false);
        expect(stored.author.displayName).toBe('Sender');
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
        expect(getNotificationLedger(column.id).notifications).toHaveLength(2);
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
        expect(getNotificationLedger(column.id).notifications.find((item: NotificationView) => item.uri === known.uri)?.isRead).toBe(true);
        expect(getNotificationLedger(column.id).notifications.find((item: NotificationView) => item.uri === incoming.uri)?.isRead).toBe(false);
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
        expect(getNotificationLedger(column.id).notifications).toHaveLength(1);
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
        expect(getNotificationLedger(column.id).notifications.length).toBe(MAX_NOTIFICATIONS + 1);
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
        expect(getNotificationLedger(column.id).notifications).toEqual([unread]);
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
        expect(getNotificationLedger(column.id).notifications.map((item: NotificationView) => item.uri)).toEqual([incoming.uri]);
    });
});

describe('loadMoreNotificationColumn', () => {
    it('appends the next page and advances the cursor', async () => {
        const known = makeNotification();
        const older = makeNotification({
            reasonSubject: 'at://did:plc:me/app.bsky.feed.post/other',
            record: { subject: { uri: 'at://did:plc:me/app.bsky.feed.post/other' } },
        });
        const { ctx, column, feeds, columnId } = makeCtx({
            cursor: 'c1',
            notifications: [known],
            feed: bundleNotifications([known]),
            listResponses: [{ cursor: 'c2', notifications: [older] }],
        });
        const result = await loadMoreNotificationColumn(ctx);
        expect(result).toBe('loaded');
        expect(column.data.cursor).toBe('c2');
        expect(getNotificationLedger(column.id).notifications.map((item: NotificationView) => item.uri)).toEqual([known.uri, older.uri]);
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
        expect(getNotificationLedger(column.id).notifications).toHaveLength(1);
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

    it('bumps the seen epoch on success only', async () => {
        const { ctx, column } = makeCtx();
        const before = getSeenEpoch(column.did);
        await markNotificationsSeen(ctx);
        expect(getSeenEpoch(column.did)).toBe(before + 1);

        const failing = makeCtx({ updateSeenError: true });
        const beforeFail = getSeenEpoch(failing.column.did);
        await markNotificationsSeen(failing.ctx);
        expect(getSeenEpoch(failing.column.did)).toBe(beforeFail);
    });
});

describe('claimNotificationChime', () => {
    const future = (offsetMs: number) => new Date(Date.now() + offsetMs).toISOString();

    it('rejects undefined and invalid dates', () => {
        const { columnId } = makeCtx();
        expect(claimNotificationChime(columnId, undefined)).toBe(false);
        expect(claimNotificationChime(columnId, 'not-a-date')).toBe(false);
    });

    it('rejects notifications older than the ledger seed', () => {
        const { columnId } = makeCtx();
        expect(claimNotificationChime(columnId, new Date(Date.now() - 60_000).toISOString())).toBe(false);
    });

    it('claims a new arrival exactly once, even across racing callers', () => {
        const { columnId } = makeCtx();
        const arrival = future(60_000);
        expect(claimNotificationChime(columnId, arrival)).toBe(true);
        expect(claimNotificationChime(columnId, arrival)).toBe(false);
        expect(claimNotificationChime(columnId, arrival)).toBe(false);
    });

    it('advances monotonically with newer arrivals', () => {
        const { columnId } = makeCtx();
        expect(claimNotificationChime(columnId, future(60_000))).toBe(true);
        expect(claimNotificationChime(columnId, future(30_000))).toBe(false);
        expect(claimNotificationChime(columnId, future(120_000))).toBe(true);
    });

    it('keeps the gate across a ledger reset', () => {
        const { columnId } = makeCtx();
        const arrival = future(60_000);
        expect(claimNotificationChime(columnId, arrival)).toBe(true);
        resetNotificationLedger(columnId);
        expect(claimNotificationChime(columnId, arrival)).toBe(false);
    });

    it('gates per column so distinct columns chime independently', () => {
        const a = makeCtx();
        const b = makeCtx();
        const arrival = future(60_000);
        expect(claimNotificationChime(a.columnId, arrival)).toBe(true);
        expect(claimNotificationChime(b.columnId, arrival)).toBe(true);
    });
});

describe('clearNotificationBadgesForDid', () => {
    const makeColumn = (over: any = {}) => ({
        id: `badge-${++ctxSeq}`,
        did: 'did:plc:me',
        algorithm: { type: 'notification' },
        unreadCount: 5,
        ...over,
    });

    it('clears every notification column of the did, including splits', () => {
        const split = makeColumn();
        const columns: any[] = [
            makeColumn(),
            makeColumn({ splitColumn: split, algorithm: { type: 'default' } }),
        ];
        clearNotificationBadgesForDid(columns, 'did:plc:me');
        expect(columns[0].unreadCount).toBe(0);
        expect(split.unreadCount).toBe(0);
        expect(columns[1].unreadCount).toBe(5);
    });

    it('leaves other dids and other column types untouched', () => {
        const columns: any[] = [
            makeColumn({ did: 'did:plc:other' }),
            makeColumn({ algorithm: { type: 'default' } }),
        ];
        clearNotificationBadgesForDid(columns, 'did:plc:me');
        expect(columns[0].unreadCount).toBe(5);
        expect(columns[1].unreadCount).toBe(5);
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
        expect(getNotificationLedger(column.id).notifications.every((n: NotificationView) => n.isRead)).toBe(true);
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
        expect(getNotificationLedger(column.id).notifications[0].isRead).toBe(false);
    });
});

function makeFollowNotification(over: Partial<NotificationView> = {}): NotificationView {
    const base = makeNotification({ reason: 'follow', reasonSubject: undefined, record: undefined, ...over });
    return { ...base, uri: base.uri.replace('app.bsky.feed.like', 'app.bsky.graph.follow') };
}

describe('sameNotification', () => {
    it('detects a change in any single consumed field', () => {
        const base = makeNotification();
        expect(sameNotification(base, { ...base })).toBe(true);
        expect(sameNotification(base, { ...base, isRead: true })).toBe(false);
        expect(sameNotification(base, { ...base, indexedAt: '2027-01-01T00:00:00.000Z' })).toBe(false);
        expect(sameNotification(base, { ...base, reasonSubject: 'at://other' })).toBe(false);
        expect(sameNotification(base, { ...base, record: { subject: { uri: 'at://other' } } })).toBe(false);
        expect(sameNotification(base, { ...base, author: { ...base.author, displayName: 'changed' } })).toBe(false);
        expect(sameNotification(base, { ...base, author: { ...base.author, avatar: 'changed' } })).toBe(false);
        expect(sameNotification(base, { ...base, author: { ...base.author, viewer: { ...base.author.viewer, following: 'at://f' } } })).toBe(false);
        expect(sameNotification(base, { ...base, author: { ...base.author, viewer: { ...base.author.viewer, muted: true } } })).toBe(false);
        expect(sameNotification(base, { ...base, author: { ...base.author, viewer: { ...base.author.viewer, followedBy: 'at://fb' } } })).toBe(false);
        expect(sameNotification(base, { ...base, author: { ...base.author, verification: { verifiedStatus: 'valid' } } })).toBe(false);
        expect(sameNotification(base, { ...base, author: { ...base.author, status: { isActive: true } } })).toBe(false);
    });
});

describe('structural sharing', () => {
    it('keeps identical groups referentially equal across refreshes', async () => {
        const like = makeNotification();
        const follow = makeFollowNotification();
        const { ctx, feeds, columnId } = makeCtx({
            listResponses: [
                { cursor: 'c1', notifications: [like, follow] },
                { cursor: 'c1', notifications: [like, follow] },
            ],
        });
        await refreshNotificationColumn(ctx);
        const firstFeed = [...feeds.get(columnId)!];
        expect(firstFeed).toHaveLength(2);

        await refreshNotificationColumn(ctx);
        const secondFeed = feeds.get(columnId)!;
        expect(secondFeed).toHaveLength(2);
        secondFeed.forEach((group, i) => expect(group).toBe(firstFeed[i]));
    });

    it('merges a fresh like arriving within the window into a single group', async () => {
        const first = makeNotification();
        const second = makeNotification();
        const { ctx, feeds, columnId } = makeCtx({
            listResponses: [
                { cursor: 'c1', notifications: [first] },
                { cursor: 'c1', notifications: [second, first] },
            ],
        });
        await refreshNotificationColumn(ctx);
        expect(feeds.get(columnId)!).toHaveLength(1);
        const before = feeds.get(columnId)![0];

        await refreshNotificationColumn(ctx);
        const after = feeds.get(columnId)!;
        expect(after).toHaveLength(1);
        expect(after[0]).not.toBe(before);
        expect(after[0].notifications).toHaveLength(2);
        expect(after[0].notifications[0].uri).toBe(second.uri);
    });

    it('replaces only the group whose content changed', async () => {
        const readLike = makeNotification({ isRead: true });
        const unreadFollow = makeFollowNotification();
        const { ctx, feeds, columnId } = makeCtx({
            listResponses: [
                { cursor: 'c1', notifications: [readLike, unreadFollow] },
                { cursor: 'c1', notifications: [readLike, unreadFollow] },
            ],
        });
        await refreshNotificationColumn(ctx);
        const before = [...feeds.get(columnId)!];

        await refreshNotificationColumn(ctx, { markAsRead: true });
        const after = feeds.get(columnId)!;

        const likeBefore = before.find(group => group.reason === 'like')!;
        const likeAfter = after.find(group => group.reason === 'like')!;
        const followBefore = before.find(group => group.reason === 'follow')!;
        const followAfter = after.find(group => group.reason === 'follow')!;

        expect(likeAfter).toBe(likeBefore);
        expect(followAfter).not.toBe(followBefore);
        expect(followAfter.notifications[0].isRead).toBe(true);
    });

    it('never hoists loadMore items into existing groups even seconds apart', async () => {
        const olderLike = makeNotification();
        const follow = makeFollowNotification();
        const newerLike = makeNotification();
        const { ctx, feeds, columnId } = makeCtx({
            cursor: 'c1',
            listResponses: [
                { cursor: 'c2', notifications: [newerLike, follow] },
                { cursor: 'c3', notifications: [olderLike] },
            ],
        });

        await loadMoreNotificationColumn(ctx);
        const beforeFeed = [...feeds.get(columnId)!];
        expect(beforeFeed).toHaveLength(2);

        await loadMoreNotificationColumn(ctx);
        const afterFeed = feeds.get(columnId)!;

        expect(afterFeed).toHaveLength(3);
        expect(afterFeed[0]).toBe(beforeFeed[0]);
        expect(afterFeed[1]).toBe(beforeFeed[1]);
        expect(afterFeed[2].notifications[0].uri).toBe(olderLike.uri);
    });

    it('keeps far-apart reactions at their own timeline position on loadMore instead of hoisting', async () => {
        const oldLike = makeNotification({ indexedAt: '2026-01-01T00:00:00.000Z' });
        const follow = makeFollowNotification({ indexedAt: '2026-01-01T05:00:00.000Z' });
        const newLike = makeNotification({ indexedAt: '2026-01-01T06:00:00.000Z' });
        const { ctx, feeds, columnId } = makeCtx({
            cursor: 'c1',
            listResponses: [
                { cursor: 'c2', notifications: [newLike, follow] },
                { cursor: 'c3', notifications: [oldLike] },
            ],
        });

        await loadMoreNotificationColumn(ctx);
        const beforeFeed = [...feeds.get(columnId)!];
        expect(beforeFeed).toHaveLength(2);

        await loadMoreNotificationColumn(ctx);
        const afterFeed = feeds.get(columnId)!;

        expect(afterFeed).toHaveLength(3);
        expect(afterFeed[0]).toBe(beforeFeed[0]);
        expect(afterFeed[1]).toBe(beforeFeed[1]);
        expect(afterFeed[2].reason).toBe('like');
        expect(afterFeed[2].notifications[0].uri).toBe(oldLike.uri);
    });

    it('keeps already-read groups referentially equal through markAllNotificationsRead', async () => {
        const read = makeNotification({ isRead: true });
        const unread = makeFollowNotification();
        const { ctx, feeds, columnId } = makeCtx({
            listResponses: [{ cursor: 'c1', notifications: [read, unread] }],
        });
        await refreshNotificationColumn(ctx);
        const before = [...feeds.get(columnId)!];

        await markAllNotificationsRead(ctx);
        const after = feeds.get(columnId)!;

        const readBefore = before.find(group => group.reason === 'like')!;
        const unreadBefore = before.find(group => group.reason === 'follow')!;
        expect(after.find(group => group.reason === 'like')).toBe(readBefore);
        const followAfter = after.find(group => group.reason === 'follow')!;
        expect(followAfter).not.toBe(unreadBefore);
        expect(followAfter.notifications.every((item: NotificationView) => item.isRead)).toBe(true);
    });

});

describe('applyLedgerToFeed', () => {
    it('hoists a fresh arrival into the newest matching group without changing its key', () => {
        const oldLike = makeNotification({ indexedAt: '2026-01-01T00:00:00.000Z' });
        const follow = makeFollowNotification({ indexedAt: '2026-01-01T01:00:00.000Z' });
        const feed = applyLedgerToFeed([], [oldLike, follow]);
        expect(feed[0].reason).toBe('follow');
        expect(feed[1].reason).toBe('like');
        const likeKeyBefore = feed[1].key;

        const freshLike = makeNotification({ indexedAt: '2026-01-01T02:00:00.000Z' });
        const next = applyLedgerToFeed(feed, [freshLike, oldLike, follow]);

        expect(next[0].reason).toBe('like');
        expect(next[0].key).toBe(likeKeyBefore);
        expect(next[0].notifications.map(item => item.uri)).toEqual([freshLike.uri, oldLike.uri]);
        expect(next[1]).toBe(feed[0]);
    });

    it('creates a new group at the top for fresh arrivals without a match', () => {
        const follow = makeFollowNotification({ indexedAt: '2026-01-01T00:00:00.000Z' });
        const feed = applyLedgerToFeed([], [follow]);

        const freshLike = makeNotification({ indexedAt: '2026-01-01T01:00:00.000Z' });
        const next = applyLedgerToFeed(feed, [freshLike, follow]);

        expect(next).toHaveLength(2);
        expect(next[0].reason).toBe('like');
        expect(next[1]).toBe(feed[0]);
    });

    it('keeps older arrivals out of existing groups and places them below', () => {
        const newerLike = makeNotification({ indexedAt: '2026-01-01T05:00:00.000Z' });
        const feed = applyLedgerToFeed([], [newerLike]);
        const before = feed[0];

        const olderLike = makeNotification({ indexedAt: '2026-01-01T04:59:00.000Z' });
        const next = applyLedgerToFeed(feed, [newerLike, olderLike]);

        expect(next).toHaveLength(2);
        expect(next[0]).toBe(before);
        expect(next[1].notifications[0].uri).toBe(olderLike.uri);
        expect(next[1].key).not.toBe(before.key);
    });

    it('reflects removals and read-state changes through carry', () => {
        const a = makeNotification({ indexedAt: '2026-01-01T00:00:00.000Z' });
        const b = makeNotification({ indexedAt: '2026-01-01T00:01:00.000Z' });
        const follow = makeFollowNotification({ indexedAt: '2026-01-01T00:02:00.000Z' });
        const feed = applyLedgerToFeed([], [a, b, follow]);
        const followBefore = feed.find(group => group.reason === 'follow')!;

        const bRead = { ...b, isRead: true };
        const next = applyLedgerToFeed(feed, [bRead, follow]);

        const likeAfter = next.find(group => group.reason === 'like')!;
        expect(likeAfter.notifications).toHaveLength(1);
        expect(likeAfter.notifications[0]).toBe(bRead);
        expect(likeAfter.key).toBe(feed.find(group => group.reason === 'like')!.key);
        expect(next.find(group => group.reason === 'follow')).toBe(followBefore);
    });

    it('drops groups whose members all left the ledger', () => {
        const like = makeNotification();
        const follow = makeFollowNotification();
        const feed = applyLedgerToFeed([], [like, follow]);

        const next = applyLedgerToFeed(feed, [follow]);
        expect(next).toHaveLength(1);
        expect(next[0].reason).toBe('follow');
    });
});

describe('resetNotificationColumnData', () => {
    it('clears the ledger, cursor and fetched reasons, and bumps the epoch', () => {
        const { column } = makeCtx({ notifications: [makeNotification()], cursor: 'c9' });
        getNotificationLedger(column.id).fetchedReasons = ['like'];
        const before = getNotificationLedger(column.id).epoch ?? 0;
        resetNotificationColumnData(column);
        expect(getNotificationLedger(column.id).notifications).toEqual([]);
        expect(column.data.cursor).toBe('');
        expect(getNotificationLedger(column.id).fetchedReasons).toBeUndefined();
        expect(getNotificationLedger(column.id).epoch).toBe(before + 1);
    });
});

describe('needsRefetchForFilter', () => {
    it('requires a fetch when nothing has been fetched yet', () => {
        const { column } = makeCtx({ filter: ['like'] });
        expect(needsRefetchForFilter(column)).toBe(true);
    });

    it('skips the fetch when the filter is a subset of fetched reasons', () => {
        const { column } = makeCtx({ filter: ['like'] });
        getNotificationLedger(column.id).fetchedReasons = ['like', 'repost'];
        expect(needsRefetchForFilter(column)).toBe(false);
    });

    it('requires a fetch when the filter adds an unfetched reason', () => {
        const { column } = makeCtx({ filter: ['like', 'follow'] });
        getNotificationLedger(column.id).fetchedReasons = ['like', 'repost'];
        expect(needsRefetchForFilter(column)).toBe(true);
    });

    it('skips the fetch for an empty filter', () => {
        const { column } = makeCtx({ filter: [] });
        getNotificationLedger(column.id).fetchedReasons = ['like'];
        expect(needsRefetchForFilter(column)).toBe(false);
    });

    it('is satisfied by the reasons recorded on refresh and loadMore', async () => {
        const { ctx, column } = makeCtx({
            filter: ['like', 'repost'],
            cursor: 'c1',
            listResponses: [
                { cursor: 'c2', notifications: [] },
                { cursor: 'c3', notifications: [] },
            ],
        });
        await refreshNotificationColumn(ctx);
        expect(getNotificationLedger(column.id).fetchedReasons).toEqual(['like', 'repost']);

        column.filter = ['like'];
        expect(needsRefetchForFilter(column)).toBe(false);

        await loadMoreNotificationColumn(ctx);
        expect(getNotificationLedger(column.id).fetchedReasons).toEqual(['like']);

        column.filter = ['like', 'repost'];
        expect(needsRefetchForFilter(column)).toBe(true);
    });
});

describe('epoch guard against in-flight fetches', () => {
    function gateList(ctx: NotificationCtx, response: any) {
        let release!: () => void;
        const gate = new Promise<void>(resolve => { release = resolve; });
        const original = ctx._agent.xrpc.get;
        ctx._agent.xrpc.get = async (nsid: string, params: any) => {
            if (nsid === 'app.bsky.notification.listNotifications') {
                await gate;
                return response;
            }
            return original(nsid, params);
        };
        return () => release();
    }

    it('discards an in-flight loadMore when the column is reset mid-fetch', async () => {
        const { ctx, column, feeds, columnId } = makeCtx({ cursor: 'c1' });
        const release = gateList(ctx, { cursor: 'c2', notifications: [makeNotification()] });

        const promise = loadMoreNotificationColumn(ctx);
        resetNotificationColumnData(column);
        release();

        expect(await promise).toBe('complete');
        expect(column.data.cursor).toBe('');
        expect(getNotificationLedger(column.id).notifications).toEqual([]);
        expect(feeds.get(columnId)).toEqual([]);
    });

    it('discards an in-flight refresh when the column is reset mid-fetch', async () => {
        const { ctx, column, feeds, columnId } = makeCtx();
        const release = gateList(ctx, { cursor: 'c1', notifications: [makeNotification()] });

        const promise = refreshNotificationColumn(ctx, { markAsRead: true });
        resetNotificationColumnData(column);
        release();

        const result = await promise;
        expect(result.newestIndexedAt).toBeUndefined();
        expect(result.pruned).toBe(false);
        expect(getNotificationLedger(column.id).notifications).toEqual([]);
        expect(feeds.get(columnId)).toEqual([]);
    });

    it('skips the feed append when reset happens during subject resolution', async () => {
        const { ctx, column, feeds, columnId } = makeCtx({ cursor: 'c1' });
        let release!: () => void;
        const gate = new Promise<void>(resolve => { release = resolve; });
        ctx._agent.xrpc.get = vi.fn(async (nsid: string, params: any) => {
            if (nsid === 'app.bsky.notification.listNotifications') {
                return { cursor: 'c2', notifications: [makeNotification()] };
            }
            if (nsid === 'app.bsky.feed.getPosts') {
                await gate;
                return { posts: params.uris.map((uri: string) => ({ uri })) };
            }
            throw new Error(`unexpected: ${nsid}`);
        });

        const promise = loadMoreNotificationColumn(ctx);
        await new Promise(resolve => setTimeout(resolve, 0));
        resetNotificationColumnData(column);
        release();

        expect(await promise).toBe('complete');
        expect(feeds.get(columnId)).toEqual([]);
    });
});

describe('notificationPriority', () => {
    it('passes priority to listNotifications on refresh and loadMore', async () => {
        const { ctx, xrpcGet } = makeCtx({
            cursor: 'c1',
            settings: { notificationPriority: true },
            listResponses: [
                { cursor: 'c2', notifications: [] },
                { cursor: 'c3', notifications: [] },
            ],
        });
        await refreshNotificationColumn(ctx);
        await loadMoreNotificationColumn(ctx);
        const calls = xrpcGet.mock.calls.filter(([nsid]) => nsid === 'app.bsky.notification.listNotifications');
        expect(calls).toHaveLength(2);
        expect(calls.every(([, params]) => params.priority === true)).toBe(true);
    });

    it('omits priority when the setting is off', async () => {
        const { ctx, xrpcGet } = makeCtx();
        await refreshNotificationColumn(ctx);
        const [, params] = xrpcGet.mock.calls.find(([nsid]) => nsid === 'app.bsky.notification.listNotifications')!;
        expect('priority' in params).toBe(false);
    });

    it('filters out non-followed authors client-side on refresh', async () => {
        const followed = makeNotification({ author: { did: 'did:plc:a', handle: 'a.test', viewer: { following: 'at://follow/1' } } });
        const stranger = makeNotification({ author: { did: 'did:plc:b', handle: 'b.test', viewer: {} } });
        const { ctx, column } = makeCtx({
            settings: { notificationPriority: true },
            listResponses: [{ cursor: 'c1', notifications: [followed, stranger] }],
        });
        await refreshNotificationColumn(ctx);
        expect(getNotificationLedger(column.id).notifications.map((item: NotificationView) => item.uri)).toEqual([followed.uri]);
    });
});

