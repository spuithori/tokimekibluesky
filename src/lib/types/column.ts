import type { searchFilters } from '$lib/search/filterSpec';
import type { ScrollState } from '$lib/components/virtual/types';
import type { MergeSource } from '$lib/merge/mergeEngine';
export type { searchFilters };
export type { MergeSource };

export type currentAlgorithm = {
    type: 'default' | 'custom' | 'list' | 'cloudList' | 'officialList' | 'bookmark' | 'chat' | 'chatList' | 'cloudBookmark' | 'officialBookmark' | 'like' | 'search' | 'author' | 'authorLike' | 'authorReplies' | 'authorReposts' | 'authorMedia' | 'authorVideo' | 'myPost' | 'myMedia' | 'mochottTimeline' | 'networkFeed' | 'notification' | 'thread' | 'realtime' | 'merge',
    algorithm?: string,
    name?: string,
    list?: object,
    sort?: 'top' | 'latest',
    searchFilters?: searchFilters,
    sources?: MergeSource[],
}

export type deckSettings = {
    timeline?: {
        hideRepost: 'all' | 'many' | 'soso' | 'less' | 'none' | null,
        hideReply: 'all' | 'following' | 'me' | null,
        hideMention: 'all' | 'following' | 'me' | null,
        hideQuote: boolean | null,
        simpleReply: boolean | null,
    },
    langFilterEnabled?: boolean,
    langFilter?: string[],
    autoRefresh?: number,
    refreshToTop?: boolean,
    autoScroll?: boolean,
    autoScrollSpeed?: 'auto' | 'slow' | 'normal' | 'fast',
    width?: number | 'xxs' | 'xs' | 'small' | 'medium' | 'large' | 'xl' | 'xxl',
    icon?: string | null,
    onlyShowUnread?: boolean,
    notificationPriority?: boolean,
    playSound?: null | string,
    hideCounts?: boolean,
    background?: string,
    isPopup?: boolean,
    popupPosition?: {
        x: number,
        y: number,
        width?: number,
        height?: number,
    },
    opacity?: number,
    collapse?: boolean,
    showReactionViaRepost?: boolean,
    mediaColumns?: number,
}

export type Column = {
    id: string,
    algorithm: currentAlgorithm,
    style: 'default' | 'media' | 'video',
    did: string,
    handle?: string,
    unreadCount?: number,
    filter?: string[],
    lastRefresh?: string,
    settings: deckSettings,
    data: {
        feed?: any[],
        cursor?: string | number | any[],
        hitsTotal?: number,
        scrollState?: ScrollState,
        _heightCache?: [string, number][],
        _heightCacheWidth?: number,
        activeTab?: string,
        starterPackCache?: any,
        mergeSolo?: string,
        mergeSoloCursor?: string,
        mergeSoloComplete?: boolean,
    },
    scrollElement?: HTMLDivElement | null,
}
