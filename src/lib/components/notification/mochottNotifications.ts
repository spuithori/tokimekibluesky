import { MOCHOTT_ORIGIN, MOCHOTT_PROXY } from '$lib/components/mochott/mochottConst';
import type { NotificationFilter, NotificationView } from './notificationPipeline';

export interface MochottNotificationRaw {
    id: number;
    type: string;
    actor: {
        did: string;
        handle: string;
        displayName: string | null;
        avatar: string | null;
    };
    documentUri: string | null;
    documentTitle: string | null;
    isRead: boolean;
    createdAt: string;
    url?: string;
    commentUri?: string;
    commentText?: string;
}

export interface MochottListResponse {
    notifications: MochottNotificationRaw[];
    unreadCount: number;
    cursor?: string;
}

export const MOCHOTT_TYPE_REASONS: Readonly<Record<string, NotificationFilter>> = {
    like: 'like',
    comic_like: 'like',
    comment: 'reply',
    reply: 'reply',
    comic_comment: 'reply',
    comic_reply: 'reply',
    subscription: 'follow',
    comic_subscription: 'follow',
    new_article: 'subscribed-post',
    new_comic: 'subscribed-post',
};

export const MOCHOTT_FILTER_OPTIONS: NotificationFilter[] = ['like', 'reply', 'follow', 'subscribed-post'];

const MOCHOTT_URI_PREFIX = 'mochott:';
const PROXY_HEADERS = { 'atproto-proxy': MOCHOTT_PROXY };

export function mochottTypesFor(filter: readonly string[]): string[] {
    return Object.keys(MOCHOTT_TYPE_REASONS).filter(type => filter.includes(MOCHOTT_TYPE_REASONS[type]));
}

export function isMochottNotification(item: { uri: string }): boolean {
    return item.uri.startsWith(MOCHOTT_URI_PREFIX);
}

export function resolveMochottAsset(path: string | null | undefined): string | undefined {
    if (!path) {
        return undefined;
    }
    return path.startsWith('/') ? MOCHOTT_ORIGIN + path : path;
}

export function projectMochottNotification(raw: MochottNotificationRaw): NotificationView | null {
    const reason = MOCHOTT_TYPE_REASONS[raw?.type];
    if (!reason || !raw.actor?.did) {
        return null;
    }

    return {
        uri: MOCHOTT_URI_PREFIX + raw.id,
        author: {
            did: raw.actor.did,
            handle: raw.actor.handle,
            displayName: raw.actor.displayName ?? undefined,
            avatar: resolveMochottAsset(raw.actor.avatar),
            viewer: {},
        },
        reason,
        ...(reason === 'like' && raw.documentUri ? { reasonSubject: raw.documentUri } : {}),
        isRead: raw.isRead === true,
        indexedAt: raw.createdAt,
        mochott: {
            type: raw.type,
            ...(raw.documentTitle ? { documentTitle: raw.documentTitle } : {}),
            ...(raw.url ? { url: raw.url } : {}),
            ...(raw.commentText !== undefined ? { commentText: raw.commentText } : {}),
        },
    };
}

export async function listMochottNotifications(
    _agent: any,
    params: { limit: number; cursor?: string; types: string[] },
): Promise<MochottListResponse> {
    return await _agent.xrpc.get('site.mochott.notification.listNotifications', params, { headers: PROXY_HEADERS });
}

export async function getMochottUnreadCount(_agent: any, types: string[]): Promise<number> {
    const res = await _agent.xrpc.get('site.mochott.notification.getUnreadCount', { types }, { headers: PROXY_HEADERS });
    return res.count;
}

export async function updateMochottSeen(_agent: any, seenAt?: string): Promise<void> {
    await _agent.xrpc.post('site.mochott.notification.updateSeen', seenAt ? { seenAt } : {}, { headers: PROXY_HEADERS });
}
