import {derived, readable, writable} from 'svelte/store';
import type {Agent} from '$lib/agent';
import type {
    AppBskyActorDefs,
    AppBskyFeedDefs,
    AppBskyFeedPost,
    AppBskyNotificationListNotifications
} from '@atproto/api';
import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
import type {Theme} from "$lib/types/theme";
import {defaultReactionButtons} from "$lib/defaultSettings";
import timerWorkerUrl from '$lib/workers/timer.js?url'
import {keywordStringToArray} from "$lib/timelineFilter";
import type {keyword} from "$lib/timelineFilter";

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
    filter?: string[],
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

export const syncColumns = derived(columns, ($columns, set) => {
    let _columns = [];
    $columns.forEach(column => {
        let c = {};
        for (const [key, value] of Object.entries(column)) {
            if (key !== 'scrollElement') {
                c[key] = value;
            }

            if (key === 'data') {
                c['data'] = {
                    feed: [],
                    cursor: '',
                }
            }
        }

        _columns.push(c);
    })
    set(_columns);
});

export const currentTimeline = writable<number>(Number(localStorage.getItem('currentTimeline')) || 0);

export const agent = writable<Agent>(undefined);

export const agents = writable(new Map<number, Agent>());

export const notificationCount = writable(0);

export const notifications = writable<NotificationWithFeed[]>([]);

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
        userLanguage: window.navigator.language,
        language: window.navigator.language,
        disableAlgorithm: false,
        repostConfirmSkip: false,
        deleteConfirmSkip: false,
        linkWarningConfirmSkip: false,
    },
    design: {
        skin: 'default',
        theme: 'jade',
        nonoto: false,
        darkmode: false,
        absoluteTime: false,
        layout: 'default',
        postsImageLayout: 'default',
        postsLayout: 'compact',
        publishPosition: 'left',
        reactionButtons: defaultReactionButtons,
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

const storageKeywordMutes = localStorage.getItem('keywordMutes') || JSON.stringify([]);
export const keywordMutes = writable<keyword[]>(JSON.parse(storageKeywordMutes));

export const formattedKeywordMutes = derived(keywordMutes, ($keywordMutes) => {
    const initialMutes = structuredClone($keywordMutes);
    if (!initialMutes || !initialMutes.length) {
        return [];
    }

    return initialMutes.map(mute => {
        mute.word = keywordStringToArray(mute.word);
        return mute;
    });
});

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
    did: string,
} | undefined;
export const pulseLike = writable<pulseReaction>(undefined);

export const pulseRepost = writable<pulseReaction>(undefined);

export const pulseBookmark = writable<pulseReaction>(undefined);

export const pulseDelete = writable<string | undefined>(undefined);

export const isReactionButtonSettingsModalOpen = writable(false);

export const workerTimer = readable(new Worker(timerWorkerUrl));

export const isRealtimeListenersModalOpen = writable(false);

type LinkWarning = string | undefined;

export const linkWarning = writable<LinkWarning>(undefined);

export const direction = writable('up');