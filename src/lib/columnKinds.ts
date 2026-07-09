import type { BuiltinColumnType, ModuleColumnKindId, currentAlgorithm } from '$lib/types/column';

export const CONTENT_COLUMN_TYPES = ['publish', 'settings'] as const satisfies readonly currentAlgorithm['type'][];

export type ContentColumnType = (typeof CONTENT_COLUMN_TYPES)[number];

export type SettingsPanelId =
    | 'search'
    | 'style'
    | 'refreshToTop'
    | 'autoRefresh'
    | 'autoRefreshRealtime'
    | 'realtimeFollows'
    | 'playSound'
    | 'background'
    | 'autoScroll'
    | 'notificationFilters'
    | 'timelineFilters'
    | 'feedInfo'
    | 'listInfo'
    | 'clearPosts';

export interface ColumnKindCapability {
    feedStorage: 'feed' | 'notification' | 'none';
    hasAgent: boolean;
    refreshable: boolean;
    scrollToTopOnHeaderClick: boolean;
    splittable: boolean;
    singleton: boolean;
    remountOnUnique: boolean;
    settingsPanels: readonly SettingsPanelId[];
}

const TIMELINE_PANELS = ['style', 'refreshToTop', 'autoRefresh', 'playSound', 'autoScroll', 'timelineFilters', 'clearPosts'] as const satisfies readonly SettingsPanelId[];

const timelineKind: ColumnKindCapability = {
    feedStorage: 'feed',
    hasAgent: true,
    refreshable: true,
    scrollToTopOnHeaderClick: true,
    splittable: true,
    singleton: false,
    remountOnUnique: false,
    settingsPanels: TIMELINE_PANELS,
};

const contentKind: ColumnKindCapability = {
    feedStorage: 'none',
    hasAgent: false,
    refreshable: false,
    scrollToTopOnHeaderClick: true,
    splittable: false,
    singleton: false,
    remountOnUnique: false,
    settingsPanels: [],
};

export const columnKindCapabilities: Record<BuiltinColumnType, ColumnKindCapability> = {
    default: { ...timelineKind, settingsPanels: [...TIMELINE_PANELS, 'autoRefreshRealtime', 'realtimeFollows'] },
    custom: { ...timelineKind, settingsPanels: [...TIMELINE_PANELS, 'feedInfo'] },
    list: { ...timelineKind, remountOnUnique: true },
    officialList: { ...timelineKind, settingsPanels: [...TIMELINE_PANELS, 'autoRefreshRealtime', 'listInfo'] },
    bookmark: timelineKind,
    cloudBookmark: timelineKind,
    officialBookmark: timelineKind,
    like: timelineKind,
    author: timelineKind,
    authorLike: timelineKind,
    authorMedia: timelineKind,
    authorVideo: timelineKind,
    myPost: timelineKind,
    myMedia: timelineKind,
    realtime: timelineKind,
    search: { ...timelineKind, settingsPanels: ['search', 'style', 'autoRefresh', 'playSound', 'clearPosts'] },
    thread: { ...timelineKind, remountOnUnique: true, settingsPanels: ['autoRefresh', 'playSound', 'clearPosts'] },
    mochottTimeline: { ...timelineKind, settingsPanels: ['autoRefresh', 'playSound', 'autoScroll', 'clearPosts'] },
    networkFeed: { ...timelineKind, settingsPanels: ['autoRefresh', 'playSound', 'autoScroll', 'clearPosts'] },
    notification: {
        ...timelineKind,
        feedStorage: 'notification',
        settingsPanels: ['playSound', 'notificationFilters', 'clearPosts'],
    },
    chat: {
        ...timelineKind,
        scrollToTopOnHeaderClick: false,
        splittable: false,
        settingsPanels: ['playSound', 'background', 'clearPosts'],
    },
    chatList: {
        ...timelineKind,
        scrollToTopOnHeaderClick: false,
        splittable: false,
        settingsPanels: ['playSound', 'clearPosts'],
    },
    publish: { ...contentKind, singleton: true },
    settings: contentKind,
};

const moduleKindFallback: ColumnKindCapability = {
    ...contentKind,
    singleton: false,
};

const moduleCapabilities = new Map<string, ColumnKindCapability>();

export function registerModuleCapability(type: ModuleColumnKindId, capability: Partial<ColumnKindCapability>): () => void {
    moduleCapabilities.set(type, { ...moduleKindFallback, ...capability });
    return () => {
        moduleCapabilities.delete(type);
    };
}

export function capabilityOf(type: string | undefined): ColumnKindCapability {
    if (type === undefined) return moduleKindFallback;
    return columnKindCapabilities[type as BuiltinColumnType] ?? moduleCapabilities.get(type) ?? moduleKindFallback;
}

export function isContentColumn(type?: string): boolean {
    return type !== undefined && capabilityOf(type).feedStorage === 'none';
}

export function hasSettingsPanel(type: string | undefined, panel: SettingsPanelId): boolean {
    return capabilityOf(type).settingsPanels.includes(panel);
}
