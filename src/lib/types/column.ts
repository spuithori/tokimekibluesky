export type currentAlgorithm = {
    type: 'default' | 'custom' | 'list' | 'officialList' | 'bookmark' | 'chat',
    algorithm?: string,
    name?: string,
    list?: object,
}

type deckSettings = {
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

export type Column = {
    id: string,
    algorithm: currentAlgorithm,
    style: 'default' | 'media',
    did: string,
    handle?: string,
    unreadCount?: number,
    filter?: string[],
    lastRefresh?: string,
    settings: deckSettings,
    data: {
        feed: [],
        cursor: string | number,
    },
    scrollElement?: HTMLDivElement,
}