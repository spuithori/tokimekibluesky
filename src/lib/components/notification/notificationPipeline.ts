import type { Column } from '$lib/types/column';
import {
    bumpSeenEpoch,
    clearSourceUnreadCount,
    getNotificationLedger,
    getSourceUnreadCount,
    resetNotificationLedger,
    type NotificationSource,
} from './notificationLedger';
import {
    isMochottNotification,
    listMochottNotifications,
    mochottTypesFor,
    projectMochottNotification,
    updateMochottSeen,
} from './mochottNotifications';

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
    mochott?: MochottDetail;
}

export interface MochottDetail {
    type: string;
    documentTitle?: string;
    url?: string;
    commentText?: string;
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

export type NotificationSourceMode = 'bluesky' | 'mochott' | 'all';

export function notificationSourceMode(column: Pick<Column, 'algorithm'>): NotificationSourceMode {
    const algorithm = column.algorithm?.algorithm;
    return algorithm === 'mochott' || algorithm === 'all' ? algorithm : 'bluesky';
}

export function notificationSources(column: Pick<Column, 'algorithm'>): NotificationSource[] {
    const mode = notificationSourceMode(column);
    return mode === 'all' ? ['bluesky', 'mochott'] : [mode];
}

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

export function claimNotificationChime(columnId: string, newestIndexedAt: string | undefined): boolean {
    if (!newestIndexedAt) {
        return false;
    }
    const ledger = getNotificationLedger(columnId);
    const time = new Date(newestIndexedAt).getTime();
    if (!Number.isFinite(time) || time <= ledger.lastChimedAt) {
        return false;
    }
    ledger.lastChimedAt = time;
    return true;
}

function columnUnreadCount(column: Column): number {
    const priority = column.settings?.notificationPriority === true;
    let count = 0;
    for (const source of notificationSources(column)) {
        count += getSourceUnreadCount(column.did, source, priority);
    }
    return count;
}

export function syncNotificationBadges(columns: Column[], did: string): void {
    for (const column of columns) {
        if (column?.algorithm?.type === 'notification' && column.did === did) {
            column.unreadCount = columnUnreadCount(column);
        }
    }
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
        && (!opts.followingOnly || !!item?.author?.viewer?.following || isMochottNotification(item)));
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
        || a.record?.subject?.uri !== b.record?.subject?.uri
        || a.mochott?.type !== b.mochott?.type
        || a.mochott?.documentTitle !== b.mochott?.documentTitle
        || a.mochott?.url !== b.mochott?.url
        || a.mochott?.commentText !== b.mochott?.commentText) {
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
    const subject = first.mochott
        ? undefined
        : first.reasonSubject && first.reason !== 'reply' && first.reason !== 'quote'
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
    if (notificationSourceMode(ctx.column) !== 'bluesky') {
        return refreshSourcesColumn(ctx, opts);
    }

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
    if (notificationSourceMode(ctx.column) !== 'bluesky') {
        return loadMoreSourcesColumn(ctx);
    }

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

function newestMochottIndexedAt(items: NotificationView[]): string | undefined {
    let newest: string | undefined;
    let newestTime = -Infinity;
    for (const item of items) {
        if (!item.mochott) {
            continue;
        }
        const time = Date.parse(item.indexedAt);
        if (time > newestTime) {
            newestTime = time;
            newest = item.indexedAt;
        }
    }
    return newest;
}

async function markSourceSeen(ctx: NotificationCtx, source: NotificationSource, scope: 'shown' | 'all'): Promise<boolean> {
    const { column, _agent } = ctx;

    if (source === 'bluesky') {
        await _agent.xrpc.post('app.bsky.notification.updateSeen', { seenAt: new Date().toISOString() });
    } else if (scope === 'all') {
        await updateMochottSeen(_agent);
    } else {
        const seenAt = newestMochottIndexedAt(getNotificationLedger(column.id).notifications);
        if (!seenAt) {
            return false;
        }
        await updateMochottSeen(_agent, seenAt);
    }

    bumpSeenEpoch(column.did, source);
    clearSourceUnreadCount(column.did, source);
    return true;
}

export async function markNotificationsSeen(ctx: NotificationCtx): Promise<void> {
    const { column } = ctx;
    let marked = false;

    await Promise.all(notificationSources(column).map(async source => {
        try {
            if (await markSourceSeen(ctx, source, 'shown')) {
                marked = true;
            }
        } catch (e) {
            console.error(e);
        }
    }));

    if (marked) {
        column.unreadCount = columnUnreadCount(column);
    }
}

export async function markAllNotificationsRead(ctx: NotificationCtx): Promise<void> {
    const { column, columnState } = ctx;
    const sources = notificationSources(column);

    const results = await Promise.allSettled(sources.map(source => markSourceSeen(ctx, source, 'all')));
    const marked = new Set(sources.filter((_, i) => results[i].status === 'fulfilled'));

    for (const result of results) {
        if (result.status === 'rejected') {
            if (!marked.size) {
                throw result.reason;
            }
            console.error(result.reason);
        }
    }

    column.unreadCount = columnUnreadCount(column);

    const ledger = getNotificationLedger(column.id);
    const epoch = ledger.epoch;
    ledger.notifications = ledger.notifications.map(item =>
        item.isRead || !marked.has(sourceOf(item)) ? item : { ...item, isRead: true });

    const groups = applyLedgerToFeed(columnState.getFeed(column.id), visibleNotifications(column, ledger.notifications));
    await resolveSubjectPosts(ctx, groups);

    if (ledger.epoch !== epoch) {
        return;
    }

    columnState.setFeed(column.id, groups);
}

interface SourceCursor {
    cursor?: string;
    oldest?: string;
    done: boolean;
}

type SourceCursors = Partial<Record<NotificationSource, SourceCursor>>;

interface SourcePage {
    source: NotificationSource;
    items: NotificationView[];
    rawCount: number;
    cursor?: string;
    oldest?: string;
}

function sourceOf(item: NotificationView): NotificationSource {
    return item.mochott ? 'mochott' : 'bluesky';
}

function byNewest(a: NotificationView, b: NotificationView): number {
    return Date.parse(b.indexedAt) - Date.parse(a.indexedAt);
}

function readSourceCursors(column: Column): SourceCursors | null {
    const raw = column.data?.cursor;
    if (typeof raw !== 'string' || !raw.startsWith('{')) {
        return null;
    }
    try {
        return JSON.parse(raw) as SourceCursors;
    } catch {
        return null;
    }
}

function writeSourceCursors(column: Column, cursors: SourceCursors): void {
    column.data.cursor = JSON.stringify(cursors);
}

function cursorFromPage(page: SourcePage, pageCount: number, onlyUnread: boolean, prior?: SourceCursor): SourceCursor {
    return {
        cursor: page.cursor,
        oldest: page.oldest ?? prior?.oldest,
        done: !page.cursor || page.rawCount === 0 || (onlyUnread && pageCount === 0),
    };
}

function visibleCutoff(cursors: SourceCursors | null): number {
    let cutoff = -Infinity;
    if (!cursors) {
        return cutoff;
    }
    for (const state of Object.values(cursors)) {
        if (state && !state.done && state.oldest) {
            const time = Date.parse(state.oldest);
            if (time > cutoff) {
                cutoff = time;
            }
        }
    }
    return cutoff;
}

function visibleNotifications(column: Column, items: NotificationView[], cursors: SourceCursors | null = readSourceCursors(column)): NotificationView[] {
    if (notificationSourceMode(column) !== 'all') {
        return items;
    }
    const cutoff = visibleCutoff(cursors);
    return cutoff === -Infinity ? items : items.filter(item => Date.parse(item.indexedAt) >= cutoff);
}

async function fetchSourcePage(ctx: NotificationCtx, source: NotificationSource, filter: string[], cursor: string | undefined): Promise<SourcePage> {
    const { column, _agent } = ctx;

    if (source === 'bluesky') {
        const res = await _agent.xrpc.get('app.bsky.notification.listNotifications', {
            limit: NOTIFICATION_FETCH_LIMIT,
            cursor: cursor ?? '',
            reasons: filter,
            ...(column.settings?.notificationPriority ? { priority: true } : {}),
        });
        const raw = res.notifications ?? [];
        return {
            source,
            items: raw.map(projectNotification),
            rawCount: raw.length,
            cursor: res.cursor,
            oldest: raw[raw.length - 1]?.indexedAt,
        };
    }

    const types = mochottTypesFor(filter);
    if (!types.length) {
        return { source, items: [], rawCount: 0 };
    }

    const res = await listMochottNotifications(_agent, {
        limit: NOTIFICATION_FETCH_LIMIT,
        ...(cursor ? { cursor } : {}),
        types,
    });
    const raw = res.notifications ?? [];
    return {
        source,
        items: raw.map(projectMochottNotification).filter((item): item is NotificationView => item !== null),
        rawCount: raw.length,
        cursor: res.cursor,
        oldest: raw[raw.length - 1]?.createdAt,
    };
}

async function fetchSourcePages(
    ctx: NotificationCtx,
    targets: NotificationSource[],
    filter: string[],
    cursors: SourceCursors | null,
    requireAny: boolean,
): Promise<SourcePage[]> {
    const tolerant = notificationSources(ctx.column).length > 1;
    const settled = await Promise.allSettled(targets.map(source => fetchSourcePage(ctx, source, filter, cursors?.[source]?.cursor)));
    const pages: SourcePage[] = [];
    let failure: unknown;
    for (const result of settled) {
        if (result.status === 'fulfilled') {
            pages.push(result.value);
        } else if (!tolerant) {
            throw result.reason;
        } else {
            failure ??= result.reason;
            console.error(result.reason);
        }
    }
    if (requireAny && !pages.length && failure !== undefined) {
        throw failure;
    }
    return pages;
}

async function refreshSourcesColumn(
    ctx: NotificationCtx,
    opts: { markAsRead?: boolean; allowPrune?: boolean },
): Promise<NotificationRefreshResult> {
    const { column, columnState } = ctx;
    const markAsRead = opts.markAsRead ?? false;

    const filter = ensureNotificationFilter(column);
    const ledger = getNotificationLedger(column.id);
    const epoch = ledger.epoch;

    const pages = await fetchSourcePages(ctx, notificationSources(column), filter, null, true);

    if (ledger.epoch !== epoch) {
        return { newestIndexedAt: undefined, pruned: false };
    }

    const onlyUnread = column.settings?.onlyShowUnread === true;
    const filterOpts = { onlyUnread, followingOnly: column.settings?.notificationPriority === true };
    let fresh = filterNotifications(pages.flatMap(page => page.items), filter, filterOpts).sort(byNewest);

    let cursors = readSourceCursors(column);
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
            cursors = null;
            pruned = true;
        }
    }

    if (!cursors) {
        cursors = {};
        for (const page of pages) {
            cursors[page.source] = cursorFromPage(page, filterNotifications(page.items, filter, filterOpts).length, onlyUnread);
        }
    }

    const groups = applyLedgerToFeed(columnState.getFeed(column.id), visibleNotifications(column, merged, cursors));
    await resolveSubjectPosts(ctx, groups);

    if (ledger.epoch !== epoch) {
        return { newestIndexedAt: undefined, pruned: false };
    }

    writeSourceCursors(column, cursors);
    ledger.notifications = merged;
    ledger.fetchedReasons = [...filter];
    columnState.setFeed(column.id, groups);

    return { newestIndexedAt: merged[0]?.indexedAt, pruned };
}

async function loadMoreSourcesColumn(ctx: NotificationCtx): Promise<'loaded' | 'complete'> {
    const { column, columnState } = ctx;

    const filter = ensureNotificationFilter(column);
    const ledger = getNotificationLedger(column.id);
    const epoch = ledger.epoch;
    const sources = notificationSources(column);
    const cursors = readSourceCursors(column) ?? {};

    const pending = sources.filter(source => !cursors[source]?.done);
    if (!pending.length) {
        return 'complete';
    }
    const unfetched = pending.filter(source => !cursors[source]?.oldest);
    const targets = unfetched.length
        ? unfetched
        : [pending.reduce((a, b) => Date.parse(cursors[b]!.oldest!) > Date.parse(cursors[a]!.oldest!) ? b : a)];

    const pages = await fetchSourcePages(ctx, targets, filter, cursors, false);

    if (ledger.epoch !== epoch) {
        return 'complete';
    }

    const onlyUnread = column.settings?.onlyShowUnread === true;
    const filterOpts = { onlyUnread, followingOnly: column.settings?.notificationPriority === true };
    const knownUris = new Set(ledger.notifications.map(item => item.uri));
    const fetched = new Set(pages.map(page => page.source));
    const pageItems: NotificationView[] = [];

    for (const page of pages) {
        const items = filterNotifications(page.items, filter, filterOpts).filter(item => !knownUris.has(item.uri));
        pageItems.push(...items);
        cursors[page.source] = cursorFromPage(page, items.length, onlyUnread, cursors[page.source]);
    }
    for (const source of targets) {
        if (!fetched.has(source)) {
            cursors[source] = { ...cursors[source], done: true };
        }
    }

    const nextNotifications = [...ledger.notifications, ...pageItems].sort(byNewest);
    const groups = applyLedgerToFeed(columnState.getFeed(column.id), visibleNotifications(column, nextNotifications, cursors));
    await resolveSubjectPosts(ctx, groups);

    if (ledger.epoch !== epoch) {
        return 'complete';
    }

    writeSourceCursors(column, cursors);
    ledger.notifications = nextNotifications;
    ledger.fetchedReasons = [...filter];
    columnState.setFeed(column.id, groups);

    return sources.some(source => !cursors[source]?.done) ? 'loaded' : 'complete';
}
