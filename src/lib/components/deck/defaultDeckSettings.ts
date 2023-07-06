type defaultDeckSettings = {
    timeline?: {
        hideRepost: 'all' | 'many' | 'soso' | 'less' | 'none' | null,
        hideReply: 'all' | 'following' | 'me' | null,
    },
    langFilterEnabled?: boolean,
    langFilter?: string[],
    autoRefresh?: number,
    width?: 'large' | 'medium' | 'small',
}

export const defaultDeckSettings: defaultDeckSettings = {
    timeline: {
        hideRepost: null,
        hideReply: null,
    },
    langFilterEnabled: false,
    langFilter: [],
    autoRefresh: 0,
    width: 'medium',
}