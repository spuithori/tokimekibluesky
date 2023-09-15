import {derived, writable} from 'svelte/store';
import type { Agent } from '$lib/agent';
import type { AppBskyFeedDefs, AppBskyFeedPost, AppBskyNotificationListNotifications, AppBskyActorDefs } from '@atproto/api';
import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
import type {Theme} from "$lib/types/theme";

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
    did?: string,
    handle?: string,
    unreadCount?: number,
    settings: defaultDeckSettings,
    data: {
        feed: [],
        cursor: '',
    }
}

type cursor = string | number | undefined;

const defaultColumns = [{
    id: 1,
    algorithm: {
        type: 'default',
        name: 'HOME'
    },
    style: 'default',
    settings: defaultDeckSettings,
    unreadCount: 0,
    data: {
        feed: [],
        cursor: '',
    }
}];
const storageColumns = localStorage.getItem('columns') || JSON.stringify([]);
export const columns = writable<columns[]>(JSON.parse(storageColumns));

const storageSingleColumn = localStorage.getItem('singleColumn') || JSON.stringify(defaultColumns[0]);

export const singleColumn = writable<columns>(JSON.parse(storageSingleColumn));

export const currentTimeline = writable<number>(Number(localStorage.getItem('currentTimeline')) || 0);

// export const service = writable(localStorage.getItem('service') || 'https://bsky.social');
// export const accounts = writable(JSON.parse(localStorage.getItem('accounts')) || []);

// export const currentAccount = writable(localStorage.getItem('currentAccount') || '0');
export const agent = writable<Agent>(undefined);

export const agents = writable(new Map<number, Agent>());

export const notificationCount = writable(0);

export const notifications = writable<NotificationWithFeed[]>([]);

// export const hideRepost = writable(localStorage.getItem('hideRepost') || 'false');

// export const hideReply = writable(localStorage.getItem('hideReply') || 'false');

export const quotePost = writable<AppBskyFeedDefs.PostView | undefined>();

type replyRef = {
    did: string,
    data: AppBskyFeedDefs.ReplyRef | string | undefined
} | undefined;

export const replyRef = writable<replyRef>();

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
        skin: 'default',
        theme: 'jade',
        nonoto: false,
        darkmode: false,
        absoluteTime: false,
        layout: 'default',
        publishPosition: 'left'
    },
    timeline: {
        hideRepost: 'all',
        hideReply: 'all',
    },
    moderation: {
        contentLabels: {
            gore: 'warn',
            hate: 'warn',
            impersonation: 'warn',
            nsfw: 'warn',
            nudity: 'warn',
            spam: 'warn',
            suggestive: 'warn',
        },
    },
    langFilter: [],
    version: 2,
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

export const officialListModal = writable({
    open: false,
    uri: '',
})

type listAddModal = {
    open: boolean,
    author: AppBskyActorDefs.ProfileViewBasic | undefined,
    did: string,
}

export const listAddModal = writable<listAddModal>({
    open: false,
    author: undefined,
    did: '',
})

export const isMobileDataConnection = writable(navigator.connection ? navigator.connection.type === 'cellular' : false);

export const isDataSaving = derived([settings, isMobileDataConnection], ([$settings, $isMobileDataConnection], set) => {
    set($settings?.general.dataSaver && $isMobileDataConnection)
}, false)

export const isPreventEvent = writable<boolean>(false);

type Realtime = {
    isConnected: boolean,
    data: any,
}
export const realtime = writable<Realtime>({
    isConnected: false,
    data: {
        record: undefined,
        op: undefined,
        body: undefined,
    }
});

export const isRealtimeConnected = writable(false);

type ReportModal = {
    open: boolean,
    data: {
        uri: string,
        cid: string
    } | undefined,
}

export const reportModal = writable<ReportModal>({
    open: false,
    data: {uri: '', cid: ''} || undefined,
})

export const isAfterReload = writable(true);

export const changedFollowData = writable(undefined);

export const profileStatus = writable<number>(0);

export const isImageOpen = writable(false);

export const isColumnModalOpen = writable(false);

export const globalUnique = writable(null);

export const sideState = writable<'publish' | 'search' | 'notification' | 'profile' | 'settings' | 'none'>('publish');

export const isPublishInstantFloat = writable(false);

export const didHint = writable('');

export const theme = writable<Theme | undefined>(undefined);

export const missingAccounts = writable([]);

type pulseReaction = {
    uri: string,
    count: number | undefined,
    viewer: string | undefined,
} | undefined;
export const pulseLike = writable<pulseReaction>(undefined);

export const pulseRepost = writable<pulseReaction>(undefined);

export const pulseBookmark = writable<pulseReaction>(undefined);

export const pulseDelete = writable<string | undefined>(undefined);