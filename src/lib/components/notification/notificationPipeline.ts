import type { Column } from '$lib/types/column';

export type NotificationFilter =
    | 'reply'
    | 'mention'
    | 'quote'
    | 'like'
    | 'repost'
    | 'follow'
    | 'like-via-repost'
    | 'repost-via-repost'
    | 'subscribed-post';

export interface NotificationAuthor {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
    description?: string;
    viewer?: { muted?: boolean; [k: string]: unknown };
    [k: string]: unknown;
}

export interface NotificationView {
    uri: string;
    cid: string;
    author: NotificationAuthor;
    reason: string;
    reasonSubject?: string;
    record?: { subject?: { uri?: string }; [k: string]: unknown };
    isRead: boolean;
    indexedAt: string;
    [k: string]: unknown;
}

export interface NotificationPostView {
    uri: string;
    [k: string]: unknown;
}

export interface NotificationGroup {
    reason: string;
    notifications: NotificationView[];
    latestIndexedAt: string;
    key: string;
    subject?: string;
    post?: NotificationPostView;
}

export interface NotificationFeedStore {
    getFeed(columnId: string): any[];
    setFeed(columnId: string, feed: any[]): void;
    replaceFeed(columnId: string, fn: (feed: any[]) => any[]): void;
}

export interface NotificationCtx {
    column: Column;
    columnState: NotificationFeedStore;
    _agent: any;
}

export interface NotificationRefreshResult {
    newestIndexedAt?: string;
    pruned: boolean;
}

export const NOTIFICATION_DEFAULT_FILTERS: NotificationFilter[] = ['like', 'repost', 'reply', 'mention', 'quote', 'follow', 'subscribed-post'];
export const NOTIFICATION_FILTER_OPTIONS: NotificationFilter[] = ['like', 'repost', 'reply', 'mention', 'quote', 'follow', 'subscribed-post'];
export const NOTIFICATION_FETCH_LIMIT = 25;
export const MAX_NOTIFICATIONS = 300;
export const GET_POSTS_CHUNK_SIZE = 25;

export function ensureNotificationFilter(column: Column): string[] {
    if (!Array.isArray(column.filter) || !column.filter.length) {
        column.filter = [...NOTIFICATION_DEFAULT_FILTERS];
    }
    return column.filter;
}

export function resetNotificationColumnData(column: Column): void {
    column.data.notifications = [];
    column.data.cursor = '';
}

export function filterNotifications(items: NotificationView[], filter: string[], onlyUnread: boolean = false): NotificationView[] {
    return items.filter(item =>
        filter.includes(item.reason)
        && !item?.author?.viewer?.muted
        && (!onlyUnread || !item.isRead));
}

export function mergeNotifications(
    fresh: NotificationView[],
    existing: NotificationView[],
    opts: { markKnownAsRead?: boolean } = {},
): NotificationView[] {
    const markKnownAsRead = opts.markKnownAsRead ?? false;
    const existingByUri = new Map(existing.map(item => [item.uri, item]));
    const seen = new Set<string>();
    const merged: NotificationView[] = [];

    for (const item of fresh) {
        if (seen.has(item.uri)) continue;
        seen.add(item.uri);
        const prior = existingByUri.get(item.uri);
        const isRead = item.isRead || prior?.isRead === true || (markKnownAsRead && prior !== undefined);
        merged.push(isRead === item.isRead ? item : { ...item, isRead });
    }

    for (const item of existing) {
        if (seen.has(item.uri)) continue;
        seen.add(item.uri);
        const isRead = item.isRead || markKnownAsRead;
        merged.push(isRead === item.isRead ? item : { ...item, isRead });
    }

    return merged;
}

export function bundleNotifications(items: NotificationView[]): NotificationGroup[] {
    const groups = new Map<string, NotificationView[]>();

    for (const item of items) {
        const reasonSubject = item.reasonSubject || null;
        const isSolo = reasonSubject === null || item.reason === 'reply' || item.reason === 'mention' || item.reason === 'quote';
        const key = isSolo ? `solo:${item.uri}` : `${reasonSubject}:${item.reason}`;
        const group = groups.get(key);
        if (group) {
            group.push(item);
        } else {
            groups.set(key, [item]);
        }
    }

    const bundled: NotificationGroup[] = [];
    for (const group of groups.values()) {
        const sorted = [...group].sort((a, b) => new Date(b.indexedAt).getTime() - new Date(a.indexedAt).getTime());
        const first = sorted[0];
        const subject = first.reasonSubject && first.reason !== 'reply' && first.reason !== 'quote'
            ? first.record?.subject?.uri
            : (first.uri && !first.uri.includes('app.bsky.graph.follow')
                ? first.uri
                : undefined);

        bundled.push({
            reason: first.reason,
            notifications: sorted,
            latestIndexedAt: first.indexedAt,
            key: first.uri,
            subject,
        });
    }

    return bundled.sort((a, b) => new Date(b.latestIndexedAt).getTime() - new Date(a.latestIndexedAt).getTime());
}

export async function resolveSubjectPosts(ctx: NotificationCtx, groups: NotificationGroup[]): Promise<void> {
    const { column, columnState, _agent } = ctx;

    const knownPosts = new Map<string, NotificationPostView>();
    for (const group of columnState.getFeed(column.id)) {
        if (group?.post?.uri) {
            knownPosts.set(group.post.uri, group.post);
        }
    }

    const unresolved = [...new Set(
        groups
            .filter(group => group.subject && !knownPosts.has(group.subject))
            .map(group => group.subject as string)
    )];

    for (let i = 0; i < unresolved.length; i += GET_POSTS_CHUNK_SIZE) {
        const chunk = unresolved.slice(i, i + GET_POSTS_CHUNK_SIZE);
        try {
            const res = await _agent.xrpc.get('app.bsky.feed.getPosts', { uris: chunk });
            for (const post of res.posts) {
                knownPosts.set(post.uri, post);
            }
        } catch (e) {
            console.error(e);
        }
    }

    for (const group of groups) {
        if (group.subject) {
            group.post = knownPosts.get(group.subject);
        }
    }
}

export async function refreshNotificationColumn(
    ctx: NotificationCtx,
    opts: { markAsRead?: boolean; allowPrune?: boolean } = {},
): Promise<NotificationRefreshResult> {
    const { column, columnState, _agent } = ctx;
    const markAsRead = opts.markAsRead ?? false;

    const filter = ensureNotificationFilter(column);
    if (!Array.isArray(column.data.notifications)) {
        column.data.notifications = [];
    }

    const res = await _agent.xrpc.get('app.bsky.notification.listNotifications', {
        limit: NOTIFICATION_FETCH_LIMIT,
        cursor: '',
        reasons: filter,
    });

    const onlyUnread = column.settings?.onlyShowUnread === true;
    let fresh = filterNotifications(res.notifications, filter, onlyUnread);

    let merged: NotificationView[];
    let pruned = false;

    if (onlyUnread) {
        if (markAsRead) {
            const shownUris = new Set(
                columnState.getFeed(column.id).flatMap(group => group?.notifications?.map((item: NotificationView) => item.uri) ?? [])
            );
            fresh = fresh.filter(item => !shownUris.has(item.uri));
        }
        merged = mergeNotifications(fresh, []);
    } else {
        merged = mergeNotifications(fresh, column.data.notifications, { markKnownAsRead: markAsRead });
        if (opts.allowPrune && merged.length > MAX_NOTIFICATIONS) {
            merged = mergeNotifications(fresh, []);
            column.data.cursor = res.cursor;
            pruned = true;
        }
    }

    const groups = bundleNotifications(merged);
    await resolveSubjectPosts(ctx, groups);

    column.data.notifications = merged;
    columnState.setFeed(column.id, groups);

    return { newestIndexedAt: merged[0]?.indexedAt, pruned };
}

export async function loadMoreNotificationColumn(ctx: NotificationCtx): Promise<'loaded' | 'complete'> {
    const { column, columnState, _agent } = ctx;

    const filter = ensureNotificationFilter(column);
    if (!Array.isArray(column.data.notifications)) {
        column.data.notifications = [];
    }

    const res = await _agent.xrpc.get('app.bsky.notification.listNotifications', {
        limit: NOTIFICATION_FETCH_LIMIT,
        cursor: column.data.cursor,
        reasons: filter,
    });
    column.data.cursor = res.cursor;

    const onlyUnread = column.settings?.onlyShowUnread === true;
    const knownUris = new Set(column.data.notifications.map(item => item.uri));
    const pageItems = filterNotifications(res.notifications, filter, onlyUnread)
        .filter(item => !knownUris.has(item.uri));

    column.data.notifications = [...column.data.notifications, ...pageItems];

    const groups = bundleNotifications(pageItems);
    await resolveSubjectPosts(ctx, groups);

    columnState.replaceFeed(column.id, feed => {
        const existingKeys = new Set(feed.map(group => group.key));
        return [...feed, ...groups.filter(group => !existingKeys.has(group.key))];
    });

    const hasMore = res.cursor && (onlyUnread ? pageItems.length : res.notifications.length);
    return hasMore ? 'loaded' : 'complete';
}

export async function markNotificationsSeen(ctx: NotificationCtx): Promise<void> {
    const { column, _agent } = ctx;

    try {
        await _agent.xrpc.post('app.bsky.notification.updateSeen', { seenAt: new Date().toISOString() });
        column.unreadCount = 0;
    } catch (e) {
        console.error(e);
    }
}

export async function markAllNotificationsRead(ctx: NotificationCtx): Promise<void> {
    const { column, columnState, _agent } = ctx;

    await _agent.xrpc.post('app.bsky.notification.updateSeen', { seenAt: new Date().toISOString() });

    column.unreadCount = 0;

    if (Array.isArray(column.data.notifications)) {
        column.data.notifications = column.data.notifications.map(item => item.isRead ? item : { ...item, isRead: true });
    }

    columnState.replaceFeed(column.id, feed => feed.map(group => group?.notifications
        ? { ...group, notifications: group.notifications.map((item: NotificationView) => item.isRead ? item : { ...item, isRead: true }) }
        : group));
}
