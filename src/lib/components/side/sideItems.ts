import type { Component } from 'svelte';
import Bell from '@lucide/svelte/icons/bell';
import CircleArrowUp from '@lucide/svelte/icons/circle-arrow-up';
import CircleX from '@lucide/svelte/icons/circle-x';
import Clapperboard from '@lucide/svelte/icons/clapperboard';
import Database from '@lucide/svelte/icons/database';
import GanttChartSquare from '@lucide/svelte/icons/gantt-chart-square';
import Home from '@lucide/svelte/icons/home';
import Layers from '@lucide/svelte/icons/layers';
import MessageCircleMore from '@lucide/svelte/icons/message-circle-more';
import Mic from '@lucide/svelte/icons/mic';
import Orbit from '@lucide/svelte/icons/orbit';
import RefreshCcw from '@lucide/svelte/icons/refresh-ccw';
import Search from '@lucide/svelte/icons/search';
import Settings from '@lucide/svelte/icons/settings';
import Square from '@lucide/svelte/icons/square';
import SquarePen from '@lucide/svelte/icons/square-pen';
import TrendingUp from '@lucide/svelte/icons/trending-up';
import UserRound from '@lucide/svelte/icons/user-round';
import Puzzle from '@lucide/svelte/icons/puzzle';
import { chatState } from '$lib/classes/chatState.svelte';
import type { SideItem } from '$lib/classes/sideState.svelte';
import type { ColumnState } from '$lib/classes/columnState.svelte';
import { sidebarItemRegistry } from '$lib/rice/modules/registries.svelte';

export interface SideItemBadgeDeps {
    columnState?: ColumnState;
}

export interface SideItemDef {
    icon: Component;
    labelKey: string;
    command: string;
    commandArg?: string;
    pill?: boolean;
    badge?: (deps?: SideItemBadgeDeps) => number;
}

export const coreSideItems: Record<SideItem, SideItemDef> = {
    workspace: { icon: Layers, labelKey: 'workspace', command: 'side.toggle', commandArg: 'workspace' },
    feeds: { icon: GanttChartSquare, labelKey: 'feeds', command: 'side.toggle', commandArg: 'feeds' },
    chat: {
        icon: MessageCircleMore,
        labelKey: 'chat',
        command: 'nav.chat',
        badge: () => chatState.totalChatCount + chatState.totalChatRequestCount,
    },
    notifications: {
        icon: Bell,
        labelKey: 'notifications',
        command: 'side.toggle',
        commandArg: 'notifications',
        badge: (deps) => deps?.columnState
            ? deps.columnState.columns
                .filter((column) => column?.algorithm?.type === 'notification')
                .reduce((sum, column) => sum + (column.unreadCount ?? 0), 0)
            : 0,
    },
    search: { icon: Search, labelKey: 'search', command: 'nav.search' },
    topic: { icon: TrendingUp, labelKey: 'topic', command: 'side.toggle', commandArg: 'topic' },
    profile: { icon: UserRound, labelKey: 'profile', command: 'nav.profile' },
    refresher: { icon: RefreshCcw, labelKey: 'refresher', command: 'columns.refresh' },
    'scroll-top': { icon: CircleArrowUp, labelKey: 'scroll-top', command: 'columns.scroll-top' },
    releaseJunk: { icon: CircleX, labelKey: 'releaseJunk', command: 'side.toggle', commandArg: 'releaseJunk' },
    bluecast: { icon: Mic, labelKey: 'bluecast', command: 'side.toggle', commandArg: 'bluecast' },
    columns: { icon: Square, labelKey: 'columns', command: 'side.toggle', commandArg: 'columns' },
    tokmek: { icon: Clapperboard, labelKey: 'tokmek', command: 'nav.tokmek' },
    orbit: { icon: Orbit, labelKey: 'orbit', command: 'orbit.toggle' },
    viewer: { icon: Database, labelKey: 'viewer', command: 'nav.viewer' },
    home: { icon: Home, labelKey: 'home', command: 'nav.home' },
    publish: { icon: SquarePen, labelKey: 'new_post', command: 'publish.toggle', pill: true },
    settings: { icon: Settings, labelKey: 'settings', command: 'settings.open', commandArg: 'general' },
};

export function resolveSideItemDef(id: string): SideItemDef | undefined {
    const core = coreSideItems[id as SideItem];
    if (core) return core;
    const moduleItem = sidebarItemRegistry.get(id);
    if (moduleItem) {
        return {
            icon: moduleItem.icon ?? Puzzle,
            labelKey: moduleItem.title,
            command: moduleItem.command,
            commandArg: moduleItem.commandArg,
        };
    }
    return undefined;
}
