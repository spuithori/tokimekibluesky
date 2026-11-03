import { describe, it, expect, vi } from 'vitest';
import {
    loadMoreNotificationColumn,
    markAllNotificationsRead,
    markNotificationsSeen,
    refreshNotificationColumn,
    syncNotificationBadges,
    type NotificationGroup,
} from './notificationPipeline';
import { getNotificationLedger, getSourceUnreadCount, setSourceUnreadCount } from './notificationLedger';
import { mochottTypesFor, projectMochottNotification, type MochottNotificationRaw } from './mochottNotifications';

const MOCHOTT_PROXY = 'did:web:mochott.site#mochott_appview';
let seq = 0;

function at(minute: number): string {
    return new Date(Date.UTC(2026, 10, 1, 0, minute)).toISOString();
}

function mochottRaw(over: Partial<MochottNotificationRaw> = {}): MochottNotificationRaw {
    seq++;
    return {
        id: seq,
        type: 'like',
        actor: { did: `did:plc:m${seq}`, handle: `m${seq}.test`, displayName: null, avatar: `/api/image/did:plc:m${seq}/cid${seq}` },
        documentUri: 'at://did:plc:me/site.standard.document/a1',
        documentTitle: 'Article',
        isRead: false,
        createdAt: at(seq),
        url: 'https://mochott.site/did:plc:me/a1',
        ...over,
    };
}

function blueskyRaw(minute: number) {
    seq++;
    return {
        uri: `at://did:plc:b${seq}/app.bsky.graph.follow/${seq}`,
        author: { did: `did:plc:b${seq}`, handle: `b${seq}.test`, viewer: {} },
        reason: 'follow',
        isRead: false,
        indexedAt: at(minute),
    };
}

function makeCtx(algorithm: 'mochott' | 'all', opts: {
    bluesky?: any[];
    mochott?: any[];
    filter?: string[];
} = {}) {
    const columnId = `mochott-col-${++seq}`;
    const feeds = new Map<string, any[]>([[columnId, []]]);
    const column: any = {
        id: columnId,
        algorithm: { type: 'notification', algorithm },
        did: `did:plc:me${seq}`,
        unreadCount: 0,
        filter: opts.filter,
        settings: {},
        data: { feed: [], cursor: '' },
    };
    const bluesky = [...(opts.bluesky ?? [])];
    const mochott = [...(opts.mochott ?? [])];
    const xrpcGet = vi.fn(async (nsid: string, params: any, callOpts?: any) => {
        if (nsid === 'app.bsky.notification.listNotifications') {
            const next = bluesky.shift();
            if (next instanceof Error) throw next;
            return next ?? { notifications: [] };
        }
        if (nsid === 'site.mochott.notification.listNotifications') {
            expect(callOpts?.headers?.['atproto-proxy']).toBe(MOCHOTT_PROXY);
            const next = mochott.shift();
            if (next instanceof Error) throw next;
            return next ?? { notifications: [], unreadCount: 0 };
        }
        if (nsid === 'app.bsky.feed.getPosts') {
            return { posts: [] };
        }
        throw new Error(`unexpected ${nsid}`);
    });
    const xrpcPost = vi.fn(async () => ({ success: true }));
    const columnState = {
        getFeed: (id: string) => feeds.get(id) ?? [],
        setFeed: (id: string, feed: any[]) => { feeds.set(id, feed); },
        replaceFeed: (id: string, fn: (feed: any[]) => any[]) => { feeds.set(id, fn(feeds.get(id) ?? [])); },
    };
    const ctx = { column, columnState, _agent: { xrpc: { get: xrpcGet, post: xrpcPost } } };
    const shown = () => (feeds.get(columnId) as NotificationGroup[]).flatMap(group => group.notifications.map(item => item.uri));
    return { ctx, column, xrpcGet, xrpcPost, shown };
}

describe('projectMochottNotification', () => {
    it('maps every listed mochott type onto a Bluesky filter reason and drops imports', () => {
        expect(projectMochottNotification(mochottRaw({ type: 'comic_like' }))?.reason).toBe('like');
        expect(projectMochottNotification(mochottRaw({ type: 'comic_reply' }))?.reason).toBe('reply');
        expect(projectMochottNotification(mochottRaw({ type: 'subscription', documentUri: null }))?.reason).toBe('follow');
        expect(projectMochottNotification(mochottRaw({ type: 'new_comic' }))?.reason).toBe('subscribed-post');
        expect(projectMochottNotification(mochottRaw({ type: 'import_completed' }))).toBeNull();
        expect(projectMochottNotification(mochottRaw({ type: 'something_new' }))).toBeNull();
    });

    it('resolves relative avatars against mochott and keeps absolute ones', () => {
        const relative = projectMochottNotification(mochottRaw({ actor: { did: 'did:plc:x', handle: 'x', displayName: null, avatar: '/api/image/did:plc:x/c' } }));
        expect(relative?.author.avatar).toBe('https://mochott.site/api/image/did:plc:x/c');
        const absolute = projectMochottNotification(mochottRaw({ actor: { did: 'did:plc:y', handle: 'y', displayName: null, avatar: 'https://cdn.example/a.jpg' } }));
        expect(absolute?.author.avatar).toBe('https://cdn.example/a.jpg');
    });

    it('groups likes by document and keeps comment text on comments', () => {
        const like = projectMochottNotification(mochottRaw());
        expect(like?.reasonSubject).toBe('at://did:plc:me/site.standard.document/a1');
        const comment = projectMochottNotification(mochottRaw({ type: 'comment', commentUri: 'at://c', commentText: 'nice' }));
        expect(comment?.reasonSubject).toBeUndefined();
        expect(comment?.mochott?.commentText).toBe('nice');
    });
});

describe('mochottTypesFor', () => {
    it('sends only the types behind the selected chips, never imports', () => {
        expect(mochottTypesFor(['like']).sort()).toEqual(['comic_like', 'like']);
        expect(mochottTypesFor(['repost', 'mention', 'quote'])).toEqual([]);
        expect(mochottTypesFor(['like', 'reply', 'follow', 'subscribed-post']).some(type => type.startsWith('import_'))).toBe(false);
    });
});

describe('mochott notification column', () => {
    it('requests the chip types through the PDS proxy and skips the call when no chip maps to mochott', async () => {
        const { ctx, xrpcGet } = makeCtx('mochott', { filter: ['like'], mochott: [{ notifications: [mochottRaw()], unreadCount: 1 }] });
        await loadMoreNotificationColumn(ctx);
        const call = xrpcGet.mock.calls.find(([nsid]) => nsid === 'site.mochott.notification.listNotifications');
        expect(call?.[1].types.sort()).toEqual(['comic_like', 'like']);

        const none = makeCtx('mochott', { filter: ['repost'] });
        expect(await loadMoreNotificationColumn(none.ctx)).toBe('complete');
        expect(none.xrpcGet).not.toHaveBeenCalled();
    });

    it('never asks getPosts about mochott notifications', async () => {
        const { ctx, xrpcGet } = makeCtx('mochott', { mochott: [{ notifications: [mochottRaw(), mochottRaw({ type: 'comment', commentText: 'hi' })], unreadCount: 2 }] });
        await loadMoreNotificationColumn(ctx);
        expect(xrpcGet.mock.calls.some(([nsid]) => nsid === 'app.bsky.feed.getPosts')).toBe(false);
    });

    it('marks mochott seen up to the newest notification it fetched', async () => {
        const newest = mochottRaw({ createdAt: at(50) });
        const { ctx, xrpcPost } = makeCtx('mochott', { mochott: [{ notifications: [newest, mochottRaw({ createdAt: at(10) })], unreadCount: 2 }] });
        await refreshNotificationColumn(ctx);
        await markNotificationsSeen(ctx);
        expect(xrpcPost).toHaveBeenCalledWith('site.mochott.notification.updateSeen', { seenAt: at(50) }, { headers: { 'atproto-proxy': MOCHOTT_PROXY } });
    });
});

describe('combined notification column', () => {
    it('holds back notifications older than the shallower source until that source catches up', async () => {
        const blueskyPage = [blueskyRaw(59), blueskyRaw(58)];
        const mochottOld = mochottRaw({ createdAt: at(5) });
        const mochottNew = mochottRaw({ createdAt: at(60) });
        const blueskyNext = [blueskyRaw(30), blueskyRaw(3)];
        const { ctx, shown, xrpcGet } = makeCtx('all', {
            bluesky: [{ cursor: 'b1', notifications: blueskyPage }, { cursor: 'b2', notifications: blueskyNext }],
            mochott: [{ cursor: 'm1', notifications: [mochottNew, mochottOld], unreadCount: 0 }],
        });

        expect(await loadMoreNotificationColumn(ctx)).toBe('loaded');
        expect(shown()).toContain(`mochott:${mochottNew.id}`);
        expect(shown()).not.toContain(`mochott:${mochottOld.id}`);

        xrpcGet.mockClear();
        await loadMoreNotificationColumn(ctx);
        expect(xrpcGet.mock.calls.map(([nsid]) => nsid)).toEqual(['app.bsky.notification.listNotifications']);
        expect(shown()).toContain(blueskyNext[0].uri);
        expect(shown()).toContain(`mochott:${mochottOld.id}`);
        expect(shown()).not.toContain(blueskyNext[1].uri);
    });

    it('keeps loading Bluesky when mochott fails', async () => {
        const blueskyPage = [blueskyRaw(59)];
        const { ctx, shown } = makeCtx('all', {
            bluesky: [{ cursor: 'b1', notifications: blueskyPage }],
            mochott: [new Error('proxy failed')],
        });
        expect(await loadMoreNotificationColumn(ctx)).toBe('loaded');
        expect(shown()).toEqual([blueskyPage[0].uri]);
    });

    it('fails a refresh only when every source fails', async () => {
        const failing = makeCtx('all', { bluesky: [new Error('a')], mochott: [new Error('b')] });
        await expect(refreshNotificationColumn(failing.ctx)).rejects.toThrow();

        const partial = makeCtx('all', { bluesky: [new Error('a')], mochott: [{ notifications: [mochottRaw()], unreadCount: 1 }] });
        await expect(refreshNotificationColumn(partial.ctx)).resolves.toBeDefined();
    });

    it('marks both sources read and only flips the sources that succeeded', async () => {
        const { ctx, column, xrpcPost } = makeCtx('all', {
            bluesky: [{ notifications: [blueskyRaw(59)] }],
            mochott: [{ notifications: [mochottRaw()], unreadCount: 1 }],
        });
        await refreshNotificationColumn(ctx);
        xrpcPost.mockImplementation(async (nsid: string) => {
            if (nsid === 'site.mochott.notification.updateSeen') throw new Error('down');
            return { success: true };
        });
        await markAllNotificationsRead(ctx);
        const ledger = getNotificationLedger(column.id).notifications;
        expect(ledger.find(item => item.mochott)?.isRead).toBe(false);
        expect(ledger.find(item => !item.mochott)?.isRead).toBe(true);
    });
});

describe('per-source badges', () => {
    it('sums the sources of each column and clears only the source that was seen', async () => {
        const did = 'did:plc:badges';
        const blueskyColumn: any = { id: 'b', did, algorithm: { type: 'notification' }, settings: {} };
        const mochottColumn: any = { id: 'm', did, algorithm: { type: 'notification', algorithm: 'mochott' }, settings: {} };
        const allColumn: any = { id: 'a', did, algorithm: { type: 'notification', algorithm: 'all' }, settings: {} };
        const columns = [blueskyColumn, mochottColumn, allColumn];

        setSourceUnreadCount(did, 'bluesky', false, 3);
        setSourceUnreadCount(did, 'mochott', false, 2);
        syncNotificationBadges(columns, did);
        expect(columns.map(column => column.unreadCount)).toEqual([3, 2, 5]);

        const ctx = { column: blueskyColumn, columnState: { getFeed: () => [], setFeed: () => {}, replaceFeed: () => {} }, _agent: { xrpc: { post: vi.fn(async () => ({})) } } };
        await markNotificationsSeen(ctx);
        syncNotificationBadges(columns, did);
        expect(columns.map(column => column.unreadCount)).toEqual([0, 2, 2]);
        expect(getSourceUnreadCount(did, 'mochott', false)).toBe(2);
    });
});
