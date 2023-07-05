type defaultDeckSettings = {
    timeline?: {
        hideRepost: 'all' | 'many' | 'soso' | 'less' | 'none' | null,
        hideReply: 'all' | 'following' | 'me' | null,
    },
    langFilterEnabled?: boolean,
    langFilter?: string[],
    autoRefresh?: number,
}

export const defaultDeckSettings: defaultDeckSettings = {
    timeline: {
        hideRepost: null,
        hideReply: null,
    },
    langFilterEnabled: false,
    langFilter: [],
    autoRefresh: 0,
}