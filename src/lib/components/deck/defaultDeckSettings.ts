export type defaultDeckSettings = {
    timeline?: {
        hideRepost: 'all' | 'many' | 'soso' | 'less' | 'none' | null,
        hideReply: 'all' | 'following' | 'me' | null,
    },
    langFilterEnabled?: boolean,
    langFilter?: string[],
    autoRefresh?: number,
    refreshToTop?: boolean,
    autoScroll?: boolean,
    autoScrollSpeed?: 'auto' | 'slow' | 'normal' | 'fast',
    width?: 'large' | 'medium' | 'small',
    icon?: string | null,
    hideCounts?: boolean,
    background?: string,
    isPopup?: boolean,
    popupPosition?: {
        x: number,
        y: number,
        width: number,
        height: number,
    },
    opacity?: number,
}

export const defaultDeckSettings: defaultDeckSettings = {
    timeline: {
        hideRepost: null,
        hideReply: null,
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
    isPopup: false,
    opacity: 100,
}
