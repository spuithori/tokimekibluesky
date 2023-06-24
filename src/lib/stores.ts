import {derived, writable} from 'svelte/store';
import type { Agent } from '$lib/agent';
import type { AppBskyFeedDefs, AppBskyFeedPost, AppBskyNotificationListNotifications } from '@atproto/api';

type NotificationWithFeed = & AppBskyNotificationListNotifications.Notification & {
    feed?: AppBskyFeedPost
}

type currentAlgorithm = {
    type: 'default' | 'custom' | 'list',
    algorithm?: string,
    name?: string,
    list?: object,
}

type columns = {
    id?: string | number,
    algorithm: currentAlgorithm,
    style: 'default' | 'media',
}

type cursor = string | number | undefined;

const defaultColumns = [{
    id: 1,
    algorithm: {
        type: 'default',
        name: 'HOME'
    },
    style: 'default'
}];
const storageColumns = localStorage.getItem('columns') || JSON.stringify(defaultColumns);
export const columns = writable<columns[]>(JSON.parse(storageColumns));

export const timelines = writable([]);
export const cursors = writable<cursor[]>([]);

const storageSingleColumn = localStorage.getItem('singleColumn') || JSON.stringify(defaultColumns[0]);

export const singleColumn = writable<columns>(JSON.parse(storageSingleColumn));

export const currentTimeline = writable<number>(0);

export const service = writable(localStorage.getItem('service') || 'https://bsky.social');
export const accounts = writable(JSON.parse(localStorage.getItem('accounts')) || []);

export const currentAccount = writable(localStorage.getItem('currentAccount') || '0');
export const agent = writable<Agent>();

export const currentAlgorithm = writable<currentAlgorithm>({
    type: 'default',
});

export const notificationCount = writable(0);

export const notifications = writable<NotificationWithFeed[]>([]);

export const hideRepost = writable(localStorage.getItem('hideRepost') || 'false');

export const hideReply = writable(localStorage.getItem('hideReply') || 'false');

export const quotePost = writable<AppBskyFeedDefs.PostView | undefined>();

export const replyRef = writable<AppBskyFeedDefs.ReplyRef | string | undefined>();

export const sharedText = writable<string>('');

export const userLists = writable(localStorage.getItem('lists')
    ? JSON.parse(localStorage.getItem('lists'))
    : []);

export const bookmarksStore = writable(undefined);

const defaultSettings = {
    general: {
        language: window.navigator.language,
        disableAlgorithm: false,
    },
    design: {
        theme: 'royalblue',
        nonoto: false,
        darkmode: false,
        absoluteTime: false,
        layout: 'default',
    },
    timeline: {
        hideRepost: false,
        hideReply: false,
    },
    moderation: {
        contentLabels: {
            gore: 'show',
            hate: 'show',
            impersonation: 'show',
            nsfw: 'show',
            nudity: 'show',
            spam: 'show',
            suggestive: 'show',
        },
    }
}
const storageSettings = localStorage.getItem('settings') || JSON.stringify(defaultSettings);
export const settings = writable(JSON.parse(storageSettings));

export const preferences = writable();

export const bookmarkModal = writable({
    open: false,
    data: undefined,
})

export const listModal = writable({
    open: false,
    data: undefined,
})

export const feedsModal = writable({
    open: false,
    data: undefined,
})

export const isMobileDataConnection = writable(navigator.connection ? navigator.connection.type === 'cellular' : false);

export const isDataSaving = derived([settings, isMobileDataConnection], ([$settings, $isMobileDataConnection], set) => {
    set($settings?.general.dataSaver && $isMobileDataConnection)
}, false)