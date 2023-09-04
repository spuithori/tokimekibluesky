type defaultDeckSettings = {
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
}