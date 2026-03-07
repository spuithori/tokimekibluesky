import {derived, readable, writable} from 'svelte/store';
import {browser} from '$app/environment';
import type {ProxyAgent} from '$lib/proxyAgent';
import type {Theme} from "$lib/types/theme";
import {defaultReactionButtons} from "$lib/defaultSettings";
import type { ReportModalState } from '$lib/components/report/reportTypes';

function getStorage(key: string, fallback: string): string {
    if (!browser) return fallback;
    return localStorage.getItem(key) || fallback;
}

export const currentTimeline = writable<number>(Number(getStorage('currentTimeline', '0')));

export const agent = writable<ProxyAgent>(undefined);

export const agents = writable(new Map<number, ProxyAgent>());

export const junkAgentDid = writable<string | undefined>(undefined);

export const agentDidsSet = derived(agents, $agents => {
    const s = new Set<string>();
    if ($agents) {
        $agents.forEach(v => { const d = v.did(); if (d) s.add(d); });
    }
    return s;
});

export const userLists = writable(JSON.parse(getStorage('lists', '[]')));

const defaultLanguage = browser ? window.navigator.language : 'en';

const defaultSettings = {
    general: {
        userLanguage: defaultLanguage,
        language: defaultLanguage,
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
        requireInputAltText: false,
        useVirtual: false,
        continuousTag: false,
        disableMochiHoppe: false,
    },
    design: {
        skin: 'default',
        theme: 'defaut-10',
        nonoto: false,
        fontTheme: 'default',
        darkmode: false,
        absoluteTime: false,
        layout: 'decks',
        postsImageLayout: 'default',
        postsLayout: 'compact',
        publishPosition: 'left',
        externalLayout: 'normal',
        reactionButtons: defaultReactionButtons,
        advancedBreak: false,
        mobilePostLayoutTop: false,
        displayHandle: true,
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
        bluemotion: true,
        giphy: true,
        tenor: true,
    },
    langFilter: [],
    version: 2,
}
export const settings = writable(JSON.parse(getStorage('settings', JSON.stringify(defaultSettings))));

export const repostMutes = writable<string[]>(JSON.parse(getStorage('repostMutes', '[]')));
export const repostMutesSet = derived(repostMutes, $rm => new Set($rm));

export const postMutes = writable<string[]>(JSON.parse(getStorage('postMutes', '[]')));
export const postMutesSet = derived(postMutes, $pm => new Set($pm));

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

export const starterPackModal = writable({
    open: false,
    uri: '',
})

type listAddModal = {
    open: boolean,
    author: any | undefined,
    did: string,
}

export const listAddModal = writable<listAddModal>({
    open: false,
    author: undefined,
    did: '',
})

export const isMobileDataConnection = writable(
    browser && (navigator as any).connection ? (navigator as any).connection.type === 'cellular' : false
);

export const isDataSaving = derived([settings, isMobileDataConnection], ([$settings, $isMobileDataConnection], set) => {
    set($settings?.general.dataSaver && $isMobileDataConnection)
}, false);

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

export const reportModal = writable<ReportModalState>({
    open: false,
    data: undefined,
})

export const changedFollowData = writable(undefined);

export const isColumnModalOpen = writable(false);

export const theme = writable<Theme | undefined>(undefined);

type pulseDetach = {
    uri: string,
    unDetach: boolean,
    embed: unknown,
}

export const pulseDetach = writable<pulseDetach | undefined>(undefined);

// Timer: only runs on client
const timerTarget = browser ? new EventTarget() : ({} as EventTarget);
export const workerTimer = readable(timerTarget, (set) => {
    if (!browser) return;
    let counter = 0;
    const id = setInterval(() => {
        counter++;
        timerTarget.dispatchEvent(new MessageEvent('message', { data: counter }));
    }, 1000);
    return () => clearInterval(id);
});

export const isRealtimeListenersModalOpen = writable(false);

type LinkWarning = string | undefined;

export const linkWarning = writable<LinkWarning>(undefined);

export const intersectingIndex = writable(0);

export const pauseColumn = writable<boolean>(false);

export const bluefeedAddModal = writable({
    open: false,
    post: undefined,
    did: '',
});

const DEFAULT_LABELER_SETTINGS = [
    {
        did: 'did:plc:ar7c4by46qjdydhdevvrndac',
        labels: {
            spam: 'hide',
            impersonation: 'hide',
            scam: 'hide',
            intolerant: 'warn',
            'self-harm': 'warn',
            security: 'hide',
            misleading: 'warn',
            threat: 'hide',
            'unsafe-link': 'hide',
            illicit: 'hide',
            misinformation: 'warn',
            rumor: 'warn',
            rude: 'hide',
            extremist: 'hide',
            sensitive: 'warn',
            'engagement-farming': 'hide',
            inauthentic: 'hide',
            'sexual-figurative': 'warn'
        }
    }
];

export const labelerSettings = writable(
    JSON.parse(getStorage('labelerSettings', JSON.stringify(DEFAULT_LABELER_SETTINGS)))
);

export const timelineHashtags = writable([]);

export const hashtagHistory = writable(
    JSON.parse(getStorage('hashtagHistory', '[]')).filter(Boolean)
);
