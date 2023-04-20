import { writable } from 'svelte/store';
import type { Agent } from '$lib/agent';
import type { AppBskyFeedDefs, AppBskyFeedPost, AppBskyNotificationListNotifications } from '@atproto/api';

type NotificationWithFeed = & AppBskyNotificationListNotifications.Notification & {
    feed?: AppBskyFeedPost
}

export const service = writable(localStorage.getItem('service') || 'https://bsky.social');
export const accounts = writable(JSON.parse(localStorage.getItem('accounts')) || []);

export const currentAccount = writable(localStorage.getItem('currentAccount') || '0');
export const agent = writable<Agent>();

function createTimeline () {
    const { subscribe, set, update } = writable<AppBskyFeedDefs.FeedViewPost[]>([]);

    return {
        subscribe,
        set,
        update,
        asyncUpdate: async () => {
            await update(n => n);
        },
    };
}

export const timeline = createTimeline();
export const cursor = writable<string | undefined>('');

export const notificationCount = writable(0);

export const notifications = writable<NotificationWithFeed[]>([]);

export const isLogin = writable(false);

export const isDarkMode = writable(localStorage.getItem('darkmode') || 'false');

export const theme = writable(localStorage.getItem('theme') || 'lightblue');

export const nonoto = writable(localStorage.getItem('nonoto') || 'false');

export const hideRepost = writable(localStorage.getItem('hideRepost') || 'false');

export const hideReply = writable(localStorage.getItem('hideReply') || 'false');

export const quotePost = writable<AppBskyFeedDefs.PostView | undefined>();

export const replyRef = writable<AppBskyFeedDefs.ReplyRef | string | undefined>();

export const sharedText = writable<string>('');