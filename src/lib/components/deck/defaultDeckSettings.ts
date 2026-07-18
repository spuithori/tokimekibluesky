import type {deckSettings} from "$lib/types/column";

export type defaultDeckSettings = deckSettings;

export const defaultDeckSettings: defaultDeckSettings = {
    timeline: {
        hideRepost: null,
        hideReply: null,
        hideMention: null,
        hideQuote: null,
        simpleReply: null,
    },
    langFilterEnabled: false,
    langFilter: [],
    autoRefresh: 0,
    refreshToTop: false,
    autoScroll: false,
    autoScrollSpeed: 'normal',
    width: 'medium',
    icon: null,
    hideCounts: false,
    notificationPriority: false,
    isPopup: false,
    opacity: 100,
}
