import {derived, readable, writable} from 'svelte/store';
import type {Agent} from '$lib/agent';
import type { AppBskyActorDefs } from '@atproto/api';
import type {Theme} from "$lib/types/theme";
import {defaultReactionButtons} from "$lib/defaultSettings";
import timerWorkerUrl from '$lib/workers/timer.js?url'

export const currentTimeline = writable<number>(Number(localStorage.getItem('currentTimeline')) || 0);

export const agent = writable<Agent>(undefined);

export const agents = writable(new Map<number, Agent>());

export const junkAgentDid = writable<string | undefined>(undefined);

export const sharedText = writable<string>('');

export const userLists = writable(localStorage.getItem('lists')
    ? JSON.parse(localStorage.getItem('lists'))
    : []);

const defaultSettings = {
    general: {
        userLanguage: window.navigator.language,
        language: window.navigator.language,
        disableAlgorithm: false,
        repostConfirmSkip: false,
        deleteConfirmSkip: false,
        linkWarningConfirmSkip: false,
        hideWorkspaceButton: false,
        hideProfileCounts: false,
        enableBluefeed: false,
        disableHaptics: false,
        enableAppBrowser: false,
        disableChat: false,
        disableTenorAutoplay: false,
        disableAtmosphere: false,
        losslessImageUpload: false,
    },
    design: {
        skin: 'default',
        theme: 'jade',
        nonoto: false,
        fontTheme: 'default',
        darkmode: false,
        absoluteTime: false,
        layout: 'default',
        postsImageLayout: 'default',
        postsLayout: 'compact',
        publishPosition: 'left',
        externalLayout: 'normal',
        reactionButtons: defaultReactionButtons,
        advancedBreak: false,
        mobilePostLayoutTop: false,
        displayHandle: false,
        reactionMode: 'tokimeki',
        leftMode: false,
        disableProfilePopup: false,
        immersiveMode: false,
        singleWidth: 'medium',
        fixedFooter: false,
        mutualDisplay: false,
        mobileNewUi: false,
        bubbleTimeline: false,
        threaded: false,
    },
    timeline: {
        hideRepost: 'all',
        hideReply: 'all',
        hideMention: 'all',
        hideQuote: false,
        simpleReply: false,
    },
    moderation: {
        contentLabels: {
            gore: 'warn',
            nsfw: 'warn',
            nudity: 'warn',
            suggestive: 'warn',
            porn: 'warn',
            sexual: 'warn',
        },
        labelers: [],
    },
    embed: {
        x: true,
        youtube: true,
        spotify: false,
        mastodon: true,
        bluemotion: true,
        giphy: true,
        tenor: true,
    },
    langFilter: [],
    version: 2,
}
const storageSettings = localStorage.getItem('settings') || JSON.stringify(defaultSettings);
export const settings = writable(JSON.parse(storageSettings));

const storageRepostMutes = localStorage.getItem('repostMutes') || JSON.stringify([]);
export const repostMutes = writable<string[]>(JSON.parse(storageRepostMutes));

const storagePostMutes = localStorage.getItem('postMutes') || JSON.stringify([]);
export const postMutes = writable<string[]>(JSON.parse(storagePostMutes));

export const preferences = writable();

export const bookmarkModal = writable({
    open: false,
    data: undefined,
})

export const cloudBookmarkModal = writable({
    open: false,
    data: undefined,
})

export const listModal = writable({
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

export const realtimeStatuses = writable([]);

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

export const didHint = writable('');

export const theme = writable<Theme | undefined>(undefined);

export const missingAccounts = writable([]);

export const pulseDelete = writable<string | undefined>(undefined);

type pulseDetach = {
    uri: string,
    unDetach: boolean,
    embed: unknown,
}

export const pulseDetach = writable<pulseDetach | undefined>(undefined);

export const workerTimer = readable(new Worker(timerWorkerUrl));

export const isRealtimeListenersModalOpen = writable(false);

type LinkWarning = string | undefined;

export const linkWarning = writable<LinkWarning>(undefined);

export const intersectingIndex = writable(0);

type ThreadGate = 'everybody' | 'nobody' | string[];

export const threadGate = writable<ThreadGate>('everybody');

export const postgate = writable<boolean>(true)

export const pauseColumn = writable<boolean>(false);

export const bluefeedAddModal = writable({
    open: false,
    post: undefined,
    did: '',
})

export const labelDefs = writable(localStorage.getItem('labelDefs')
    ? JSON.parse(localStorage.getItem('labelDefs'))
    : []);

export const subscribedLabelers = writable(localStorage.getItem('subscribedLabelers')
    ? JSON.parse(localStorage.getItem('subscribedLabelers'))
    : ['did:plc:ar7c4by46qjdydhdevvrndac']);

export const labelerSettings = writable(localStorage.getItem('labelerSettings')
    ? JSON.parse(localStorage.getItem('labelerSettings'))
    : []);

export const timelineHashtags = writable([]);

export const hashtagHistory = writable(localStorage.getItem('hashtagHistory')
    ? JSON.parse(localStorage.getItem('hashtagHistory') as string)
    : []);

export const postPulse = writable([]);

export const isChatColumnFront = writable<boolean>(false);