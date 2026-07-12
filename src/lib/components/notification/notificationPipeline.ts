import type { Column } from '$lib/types/column';
import { getNotificationLedger, resetNotificationLedger } from './notificationLedger';

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
    viewer: {
        muted?: boolean;
        following?: string;
        followedBy?: string;
    };
    verification?: {
        trustedVerifierStatus?: string;
        verifiedStatus?: string;
    };
    status?: {
        isActive?: boolean;
    };
}

export interface NotificationView {
    uri: string;
    author: NotificationAuthor;
    reason: string;
    reasonSubject?: string;
    record?: { subject?: { uri?: string } };
    isRead: boolean;
    indexedAt: string;
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
    column.data.cursor = '';
    resetNotificationLedger(column.id);
}

export function needsRefetchForFilter(column: Column): boolean {
    const fetched = getNotificationLedger(column.id).fetchedReasons;
    if (!Array.isArray(fetched)) {
        return true;
    }
    const filter = Array.isArray(column.filter) ? column.filter : [];
    return filter.some(reason => !fetched.includes(reason));
}

export function projectNotification(raw: any): NotificationView {
    const author = raw?.author ?? {};
    const viewer = author.viewer ?? {};
    const subjectUri = raw?.record?.subject?.uri;

    return {
        uri: raw.uri,
        author: {
            did: author.did,
            handle: author.handle,
            displayName: author.displayName,
            avatar: author.avatar,
            description: author.description,
            viewer: {
                muted: viewer.muted,
                following: viewer.following,
                followedBy: viewer.followedBy,
            },
            ...(author.verification ? {
                verification: {
                    trustedVerifierStatus: author.verification.trustedVerifierStatus,
                    verifiedStatus: author.verification.verifiedStatus,
                },
            } : {}),
            ...(author.status ? { status: { isActive: author.status.isActive } } : {}),
        },
        reason: raw.reason,
        ...(raw.reasonSubject !== undefined ? { reasonSubject: raw.reasonSubject } : {}),
        ...(subjectUri !== undefined ? { record: { subject: { uri: subjectUri } } } : {}),
        isRead: raw.isRead === true,
        indexedAt: raw.indexedAt,
    };
}

export function filterNotifications(
    items: NotificationView[],
    filter: string[],
    opts: { onlyUnread?: boolean; followingOnly?: boolean } = {},
): NotificationView[] {
    return items.filter(item =>
        filter.includes(item.reason)
        && !item?.author?.viewer?.muted
        && (!opts.onlyUnread || !item.isRead)
        && (!opts.followingOnly || !!item?.author?.viewer?.following));
}

export function sameNotification(a: NotificationView, b: NotificationView): boolean {
    if (a === b) {
        return true;
    }
    if (a.uri !== b.uri
        || a.reason !== b.reason
        || a.reasonSubject !== b.reasonSubject
        || a.indexedAt !== b.indexedAt
        || a.isRead !== b.isRead
        || a.record?.subject?.uri !== b.record?.subject?.uri) {
        return false;
    }
    const aa = a.author;
    const ba = b.author;
    return aa.did === ba.did
        && aa.handle === ba.handle
        && aa.displayName === ba.displayName
        && aa.avatar === ba.avatar
        && aa.description === ba.description
        && aa.viewer?.muted === ba.viewer?.muted
        && aa.viewer?.following === ba.viewer?.following
        && aa.viewer?.followedBy === ba.viewer?.followedBy
        && aa.verification?.trustedVerifierStatus === ba.verification?.trustedVerifierStatus
        && aa.verification?.verifiedStatus === ba.verification?.verifiedStatus
        && aa.status?.isActive === ba.status?.isActive;
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
        const resolved = isRead === item.isRead ? item : { ...item, isRead };
        merged.push(prior && sameNotification(prior, resolved) ? prior : resolved);
    }

    for (const item of existing) {
        if (seen.has(item.uri)) continue;
        seen.add(item.uri);
        const isRead = item.isRead || markKnownAsRead;
        merged.push(isRead === item.isRead ? item : { ...item, isRead });
    }

    return merged;
}

function groupKeyOf(item: NotificationView): string | null {
    const reasonSubject = item.reasonSubject || null;
    if (reasonSubject === null || item.reason === 'reply' || item.reason === 'mention' || item.reason === 'quote') {
        return null;
    }
    return `${reasonSubject}:${item.reason}`;
}

function makeGroup(members: NotificationView[]): NotificationGroup {
    const first = members[0];
    const groupKey = groupKeyOf(first);
    const key = groupKey === null ? `solo:${first.uri}` : `${groupKey}:${first.uri}`;
    const subject = first.reasonSubject && first.reason !== 'reply' && first.reason !== 'quote'
        ? first.record?.subject?.uri
        : (first.uri && !first.uri.includes('app.bsky.graph.follow')
            ? first.uri
            : undefined);

    return {
        reason: first.reason,
        notifications: members,
        latestIndexedAt: first.indexedAt,
        key,
        subject,
    };
}

export function bundleNotifications(items: NotificationView[]): NotificationGroup[] {
    const buckets = new Map<string, NotificationView[]>();

    for (const item of items) {
        const bucketKey = groupKeyOf(item) ?? `solo:${item.uri}`;
        const bucket = buckets.get(bucketKey);
        if (bucket) {
            bucket.push(item);
        } else {
            buckets.set(bucketKey, [item]);
        }
    }

    const bundled: NotificationGroup[] = [];
    for (const bucket of buckets.values()) {
        const sorted = [...bucket].sort((a, b) => new Date(b.indexedAt).getTime() - new Date(a.indexedAt).getTime());
        bundled.push(makeGroup(sorted));
    }

    return bundled.sort((a, b) => new Date(b.latestIndexedAt).getTime() - new Date(a.latestIndexedAt).getTime());
}

export function applyLedgerToFeed(prevFeed: NotificationGroup[], notifications: NotificationView[]): NotificationGroup[] {
    const byUri = new Map(notifications.map(item => [item.uri, item]));
    const consumed = new Set<string>();
    const result: NotificationGroup[] = [];

    for (const group of prevFeed) {
        const members: NotificationView[] = [];
        let unchanged = true;
        for (const old of group.notifications) {
            const current = byUri.get(old.uri);
            if (!current) {
                unchanged = false;
                continue;
            }
            if (current !== old) {
                unchanged = false;
            }
            members.push(current);
            consumed.add(current.uri);
        }
        if (!members.length) {
            continue;
        }
        result.push(unchanged
            ? group
            : { ...group, notifications: members, latestIndexedAt: members[0].indexedAt });
    }

    let boundaryTime = -Infinity;
    for (const group of result) {
        const time = new Date(group.latestIndexedAt).getTime();
        if (time > boundaryTime) {
            boundaryTime = time;
        }
    }

    const newArrivals: NotificationView[] = [];
    const olderArrivals: NotificationView[] = [];
    for (const item of notifications) {
        if (consumed.has(item.uri)) {
            continue;
        }
        if (new Date(item.indexedAt).getTime() > boundaryTime) {
            newArrivals.push(item);
        } else {
            olderArrivals.push(item);
        }
    }

    if (newArrivals.length) {
        newArrivals.sort((a, b) => new Date(b.indexedAt).getTime() - new Date(a.indexedAt).getTime());

        const arrivalsByKey = new Map<string, NotificationView[]>();
        for (const item of newArrivals) {
            const groupKey = groupKeyOf(item);
            if (groupKey === null) {
                result.push(makeGroup([item]));
                continue;
            }
            const bucket = arrivalsByKey.get(groupKey);
            if (bucket) {
                bucket.push(item);
            } else {
                arrivalsByKey.set(groupKey, [item]);
            }
        }

        for (const [groupKey, items] of arrivalsByKey) {
            let targetIndex = -1;
            let targetTime = -Infinity;
            for (let i = 0; i < result.length; i++) {
                if (groupKeyOf(result[i].notifications[0]) !== groupKey) {
                    continue;
                }
                const time = new Date(result[i].latestIndexedAt).getTime();
                if (time > targetTime) {
                    targetTime = time;
                    targetIndex = i;
                }
            }
            if (targetIndex >= 0) {
                const target = result[targetIndex];
                const members = [...items, ...target.notifications];
                result[targetIndex] = {
                    ...target,
                    notifications: members,
                    latestIndexedAt: members[0].indexedAt,
                };
            } else {
                result.push(makeGroup(items));
            }
        }
    }

    if (olderArrivals.length) {
        result.push(...bundleNotifications(olderArrivals));
    }

    return result.sort((a, b) => new Date(b.latestIndexedAt).getTime() - new Date(a.latestIndexedAt).getTime());
}

export async function resolveSubjectPosts(ctx: NotificationCtx, groups: NotificationGroup[]): Promise<void> {
    const { column, columnState, _agent } = ctx;

    const knownPosts = new Map<string, NotificationPostView>();
    for (const group of columnState.getFeed(column.id)) {
        if (group?.post?.uri) {
            knownPosts.set(group.post.uri, group.post);
        }
    }
    for (const group of groups) {
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
    const ledger = getNotificationLedger(column.id);
    const epoch = ledger.epoch;

    const res = await _agent.xrpc.get('app.bsky.notification.listNotifications', {
        limit: NOTIFICATION_FETCH_LIMIT,
        cursor: '',
        reasons: filter,
        ...(column.settings?.notificationPriority ? { priority: true } : {}),
    });

    if (ledger.epoch !== epoch) {
        return { newestIndexedAt: undefined, pruned: false };
    }

    const onlyUnread = column.settings?.onlyShowUnread === true;
    let fresh = filterNotifications((res.notifications ?? []).map(projectNotification), filter, {
        onlyUnread,
        followingOnly: column.settings?.notificationPriority === true,
    });

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
        merged = mergeNotifications(fresh, ledger.notifications, { markKnownAsRead: markAsRead });
        if (opts.allowPrune && merged.length > MAX_NOTIFICATIONS) {
            merged = mergeNotifications(fresh, []);
            column.data.cursor = res.cursor;
            pruned = true;
        }
    }

    const groups = applyLedgerToFeed(columnState.getFeed(column.id), merged);
    await resolveSubjectPosts(ctx, groups);

    if (ledger.epoch !== epoch) {
        return { newestIndexedAt: undefined, pruned: false };
    }

    ledger.notifications = merged;
    ledger.fetchedReasons = [...filter];
    columnState.setFeed(column.id, groups);

    return { newestIndexedAt: merged[0]?.indexedAt, pruned };
}

export async function loadMoreNotificationColumn(ctx: NotificationCtx): Promise<'loaded' | 'complete'> {
    const { column, columnState, _agent } = ctx;

    const filter = ensureNotificationFilter(column);
    const ledger = getNotificationLedger(column.id);
    const epoch = ledger.epoch;

    const res = await _agent.xrpc.get('app.bsky.notification.listNotifications', {
        limit: NOTIFICATION_FETCH_LIMIT,
        cursor: column.data.cursor,
        reasons: filter,
        ...(column.settings?.notificationPriority ? { priority: true } : {}),
    });

    if (ledger.epoch !== epoch) {
        return 'complete';
    }

    column.data.cursor = res.cursor;

    const onlyUnread = column.settings?.onlyShowUnread === true;
    const knownUris = new Set(ledger.notifications.map(item => item.uri));
    const pageItems = filterNotifications((res.notifications ?? []).map(projectNotification), filter, {
        onlyUnread,
        followingOnly: column.settings?.notificationPriority === true,
    }).filter(item => !knownUris.has(item.uri));

    const nextNotifications = [...ledger.notifications, ...pageItems];
    const groups = applyLedgerToFeed(columnState.getFeed(column.id), nextNotifications);
    await resolveSubjectPosts(ctx, groups);

    if (ledger.epoch !== epoch) {
        return 'complete';
    }

    ledger.notifications = nextNotifications;
    ledger.fetchedReasons = [...filter];
    columnState.setFeed(column.id, groups);

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

    const ledger = getNotificationLedger(column.id);
    const epoch = ledger.epoch;
    ledger.notifications = ledger.notifications.map(item => item.isRead ? item : { ...item, isRead: true });

    const groups = applyLedgerToFeed(columnState.getFeed(column.id), ledger.notifications);
    await resolveSubjectPosts(ctx, groups);

    if (ledger.epoch !== epoch) {
        return;
    }

    columnState.setFeed(column.id, groups);
}
