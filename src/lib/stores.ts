import {derived, readable, toStore, writable} from 'svelte/store';
import type {Agent} from '$lib/agent';
import type {Theme} from "$lib/types/theme";
import timerWorkerUrl from '$lib/workers/timer.js?url'
import type { ReportModalState } from '$lib/components/report/reportTypes';
import {settingsStore} from '$lib/settings/settings.svelte';
import type {Settings} from '$lib/settings/types';

export const currentTimeline = writable<number>(Number(localStorage.getItem('currentTimeline')) || 0);

export const agent = writable<Agent>(undefined);

export const agents = writable(new Map<number, Agent>());

export const junkAgentDid = writable<string | undefined>(undefined);

export const agentDidsSet = derived(agents, $agents => {
    const s = new Set<string>();
    if ($agents) {
        $agents.forEach(v => { const d = v.did(); if (d) s.add(d); });
    }
    return s;
});

export const userLists = writable(localStorage.getItem('lists')
    ? JSON.parse(localStorage.getItem('lists'))
    : []);

export const settings = toStore<Settings>(
    () => settingsStore.snapshot,
    (value) => { settingsStore.raw = value; },
);

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

export const isMobileDataConnection = writable(navigator.connection ? navigator.connection.type === 'cellular' : false);

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

export const workerTimer = readable(new Worker(timerWorkerUrl));

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

export const timelineHashtags = writable<string[]>([]);

export const hashtagHistory = writable(localStorage.getItem('hashtagHistory')
    ? JSON.parse(localStorage.getItem('hashtagHistory') as string).filter(Boolean)
    : []);
