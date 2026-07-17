import { describe, it, expect, vi } from 'vitest';
import {
    refreshNotificationColumn,
    bundleNotifications,
    type NotificationView,
    type NotificationCtx,
} from './notificationPipeline';
import { getNotificationLedger } from './notificationLedger';

let seq = 0;
let ctxSeq = 0;

function like(subject: string, isoTime: string): NotificationView {
    seq++;
    return {
        uri: `at://did:plc:actor${seq}/app.bsky.feed.like/${seq}`,
        author: { did: `did:plc:actor${seq}`, handle: `a${seq}.test`, viewer: {} },
        reason: 'like',
        reasonSubject: subject,
        record: { subject: { uri: subject } },
        isRead: false,
        indexedAt: isoTime,
    };
}
function repost(subject: string, isoTime: string): NotificationView {
    seq++;
    return {
        uri: `at://did:plc:actor${seq}/app.bsky.feed.repost/${seq}`,
        author: { did: `did:plc:actor${seq}`, handle: `a${seq}.test`, viewer: {} },
        reason: 'repost',
        reasonSubject: subject,
        record: { subject: { uri: subject } },
        isRead: false,
        indexedAt: isoTime,
    };
}
function reply(isoTime: string): NotificationView {
    seq++;
    return {
        uri: `at://did:plc:actor${seq}/app.bsky.feed.post/${seq}`,
        author: { did: `did:plc:actor${seq}`, handle: `a${seq}.test`, viewer: {} },
        reason: 'reply',
        reasonSubject: undefined,
        isRead: false,
        indexedAt: isoTime,
    };
}

function makeCtx(listResponses: any[], initialLedger: NotificationView[] = []) {
    const columnId = `repro${++ctxSeq}`;
    const feeds = new Map<string, any[]>([[columnId, []]]);
    const column: any = {
        id: columnId,
        algorithm: { type: 'notification', name: 'Notifications' },
        did: 'did:plc:me',
        unreadCount: 3,
        filter: undefined,
        settings: {},
        data: { feed: [], cursor: '' },
    };
    const ledger = getNotificationLedger(columnId);
    ledger.notifications = initialLedger;
    const responses = [...listResponses];
    const xrpcGet = vi.fn(async (nsid: string, params: any) => {
        if (nsid === 'app.bsky.notification.listNotifications') {
            return responses.shift() ?? { cursor: 'c', notifications: [] };
        }
        if (nsid === 'app.bsky.feed.getPosts') {
            return { posts: params.uris.map((uri: string) => ({ uri, likeCount: 1 })) };
        }
        throw new Error('unexpected ' + nsid);
    });
    const columnState = {
        getFeed: (id: string) => feeds.get(id) ?? [],
        setFeed: (id: string, feed: any[]) => { feeds.set(id, feed); },
        replaceFeed: (id: string, fn: any) => { feeds.set(id, fn(feeds.get(id) ?? [])); },
    };
    const ctx: NotificationCtx = { column, columnState, _agent: { xrpc: { get: xrpcGet, post: vi.fn(async () => ({})) } } };
    return { ctx, feeds, columnId };
}

function dump(feed: any[]) {
    return feed.map(g => `${g.reason}[${g.notifications.length}]@${g.latestIndexedAt.slice(11, 19)} key=${g.key.slice(-24)}`);
}

describe('REPRO: 30s auto-refresh like/repost merge', () => {
    it('S1: new like on the SAME post (newest overall) merges + hoists', async () => {
        const X = 'at://did:plc:me/app.bsky.feed.post/X';
        const a = like(X, '2026-01-01T00:00:10.000Z');
        const { ctx, feeds, columnId } = makeCtx([
            { cursor: 'c', notifications: [a] },
            { cursor: 'c', notifications: [like(X, '2026-01-01T00:00:20.000Z'), a] },
        ]);
        await refreshNotificationColumn(ctx, { markAsRead: false });
        console.log('S1 after1:', dump(feeds.get(columnId)!));
        await refreshNotificationColumn(ctx, { markAsRead: false });
        console.log('S1 after2:', dump(feeds.get(columnId)!));
        const feed = feeds.get(columnId)!;
        expect(feed).toHaveLength(1);
        expect(feed[0].notifications).toHaveLength(2);
    });

    it('S2: new like on an EXISTING post that is NOT the top group', async () => {
        const X = 'at://did:plc:me/app.bsky.feed.post/X';
        const aX = like(X, '2026-01-01T00:00:10.000Z');
        const r = reply('2026-01-01T00:00:50.000Z');
        const { ctx, feeds, columnId } = makeCtx([
            { cursor: 'c', notifications: [r, aX] },
            { cursor: 'c', notifications: [like(X, '2026-01-01T00:01:00.000Z'), r, aX] },
        ]);
        await refreshNotificationColumn(ctx, { markAsRead: false });
        console.log('S2 after1:', dump(feeds.get(columnId)!));
        await refreshNotificationColumn(ctx, { markAsRead: false });
        console.log('S2 after2:', dump(feeds.get(columnId)!));
        const feed = feeds.get(columnId)!;
        const xGroups = feed.filter(g => g.reason === 'like');
        console.log('S2 like-groups:', xGroups.length, 'total likes:', xGroups.reduce((n, g) => n + g.notifications.length, 0));
    });

    it('S3: new like on X whose time is OLDER than the current top (reply) but is genuinely new', async () => {
        const X = 'at://did:plc:me/app.bsky.feed.post/X';
        const aX = like(X, '2026-01-01T00:00:10.000Z');
        const r = reply('2026-01-01T00:00:50.000Z');
        const bX = like(X, '2026-01-01T00:00:30.000Z');
        const { ctx, feeds, columnId } = makeCtx([
            { cursor: 'c', notifications: [r, aX] },
            { cursor: 'c', notifications: [r, bX, aX] },
        ]);
        await refreshNotificationColumn(ctx, { markAsRead: false });
        console.log('S3 after1:', dump(feeds.get(columnId)!));
        await refreshNotificationColumn(ctx, { markAsRead: false });
        console.log('S3 after2:', dump(feeds.get(columnId)!));
        const feed = feeds.get(columnId)!;
        const xGroups = feed.filter(g => g.reason === 'like');
        console.log('S3 like-groups:', xGroups.length, '(2 = SPLIT bug, 1 = merged)');
    });

    it('S4: accumulate likes across many refreshes on the same post', async () => {
        const X = 'at://did:plc:me/app.bsky.feed.post/X';
        const responses = [];
        const acc: NotificationView[] = [];
        for (let i = 1; i <= 5; i++) {
            acc.unshift(like(X, `2026-01-01T00:0${i}:00.000Z`));
            responses.push({ cursor: 'c', notifications: [...acc].slice(0, 25) });
        }
        const { ctx, feeds, columnId } = makeCtx(responses);
        for (let i = 0; i < 5; i++) {
            await refreshNotificationColumn(ctx, { markAsRead: false });
        }
        console.log('S4 final:', dump(feeds.get(columnId)!));
        const feed = feeds.get(columnId)!;
        console.log('S4 like-groups:', feed.filter(g => g.reason === 'like').length, 'total:', feed[0]?.notifications.length);
    });
});
