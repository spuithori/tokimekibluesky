import { get } from 'svelte/store';
import { goto } from '$app/navigation';
import Orbit from '@lucide/svelte/icons/orbit';
import Command from '@lucide/svelte/icons/command';
import SlidersHorizontal from '@lucide/svelte/icons/sliders-horizontal';
import SquarePen from '@lucide/svelte/icons/square-pen';
import Plus from '@lucide/svelte/icons/plus';
import Group from '@lucide/svelte/icons/group';
import Ungroup from '@lucide/svelte/icons/ungroup';
import RefreshCcw from '@lucide/svelte/icons/refresh-ccw';
import CircleArrowUp from '@lucide/svelte/icons/circle-arrow-up';
import Home from '@lucide/svelte/icons/home';
import MessageCircleMore from '@lucide/svelte/icons/message-circle-more';
import Search from '@lucide/svelte/icons/search';
import UserRound from '@lucide/svelte/icons/user-round';
import Database from '@lucide/svelte/icons/database';
import Clapperboard from '@lucide/svelte/icons/clapperboard';
import Moon from '@lucide/svelte/icons/moon';
import Sparkles from '@lucide/svelte/icons/sparkles';
import Layers from '@lucide/svelte/icons/layers';
import { agent, currentTimeline, intersectingIndex, isColumnModalOpen, settings } from '$lib/stores';
import { settingsStore } from '$lib/settings/settings.svelte';
import { publishState } from '$lib/classes/publishState.svelte';
import { togglePublishColumn } from '$lib/publishColumn';
import { openSettingsColumn } from '$lib/settingsColumn';
import { isSettingsPageId } from '$lib/settings/pagesRegistry';
import { sideState, type SideItem } from '$lib/classes/sideState.svelte';
import { overlayState } from '$lib/classes/overlayState.svelte';
import { keymodeState } from '$lib/classes/keymodeState.svelte';
import { scratchpadState } from '$lib/classes/scratchpadState.svelte';
import { riceState } from '$lib/rice/riceState.svelte';
import { animateLayout } from '$lib/animations/flip';
import { clampDeckWidth, resolveDeckWidthPx } from '$lib/deckWidth';
import { firstLeafId } from '$lib/classes/deckLayout';
import PictureInPicture2 from '@lucide/svelte/icons/picture-in-picture-2';
import SquareStack from '@lucide/svelte/icons/square-stack';
import { switchWorkspace } from '$lib/workspaces';
import { appState } from '$lib/classes/appState.svelte';
import { accountsDb } from '$lib/db';
import type { ColumnState } from '$lib/classes/columnState.svelte';
import type { CommandDef } from './registry.svelte';

export interface CoreCommandDeps {
    columnState: ColumnState;
}

export function isEffectiveDarkmode(): boolean {
    const value = settingsStore.design.darkmode as unknown;
    if (value === true || value === 'true') return true;
    if (value === 'prefer') {
        return typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
}

function toggleOrbit() {
    const next = !overlayState.orbit;
    overlayState.closeAll();
    if (next) sideState.close();
    overlayState.orbit = next;
}

function resolveFocusedColumnId(columnState: ColumnState): string | null {
    const active = document.activeElement?.closest('.deck-row');
    const focused = active
        ? columnState.columns.find((c) => c.scrollElement === active)
        : undefined;
    if (focused) return focused.id;
    const column = columnState.getSlotColumn(get(intersectingIndex));
    return column?.id ?? null;
}

export function createCoreCommands({ columnState }: CoreCommandDeps): CommandDef[] {
    return [
        {
            id: 'palette.toggle',
            title: 'command_palette_toggle',
            icon: Command,
            run: () => {
                const next = !overlayState.palette;
                overlayState.closeAll();
                if (next) sideState.close();
                overlayState.palette = next;
            },
        },
        {
            id: 'orbit.toggle',
            title: 'command_orbit_toggle',
            icon: Orbit,
            run: toggleOrbit,
        },
        {
            id: 'launchpad.toggle',
            title: 'command_orbit_toggle',
            hidden: true,
            run: toggleOrbit,
        },
        {
            id: 'action-center.toggle',
            title: 'command_action_center_toggle',
            icon: SlidersHorizontal,
            run: () => {
                const next = !overlayState.actionCenter;
                overlayState.closeAll();
                if (next) sideState.close();
                overlayState.actionCenter = next;
            },
        },
        {
            id: 'publish.toggle',
            title: 'command_publish_toggle',
            icon: SquarePen,
            run: () => {
                if (get(settings).design?.layout === 'decks') {
                    togglePublishColumn(columnState);
                } else {
                    publishState.show = !publishState.show;
                }
            },
        },
        {
            id: 'column.add',
            title: 'command_column_add',
            icon: Plus,
            run: () => {
                isColumnModalOpen.set(true);
            },
        },
        {
            id: 'column.focus',
            title: 'command_column_focus',
            hidden: true,
            run: (arg) => {
                const isDecks = get(settings).design?.layout === 'decks';
                let index: number;
                if (arg === 'next' || arg === 'prev') {
                    const count = columnState.slots.length;
                    if (count === 0) return;
                    let current: number;
                    if (isDecks) {
                        const active = document.activeElement?.closest('.deck-row');
                        const focused = active
                            ? columnState.columns.find((c) => c.scrollElement === active)
                            : undefined;
                        current = focused ? columnState.slotIndexOf(focused.id) : get(intersectingIndex);
                        if (current < 0) current = get(intersectingIndex);
                    } else {
                        current = get(currentTimeline);
                    }
                    const step = arg === 'next' ? 1 : -1;
                    index = ((current + step) % count + count) % count;
                } else {
                    index = Number(arg) - 1;
                    if (!Number.isFinite(index) || index < 0) return;
                }
                const column = columnState.getSlotColumn(index);
                if (!column) return;
                if (isDecks) {
                    column.scrollElement?.focus();
                    column.scrollElement?.scrollIntoView({ inline: 'end', behavior: 'instant' });
                } else if (get(currentTimeline) !== index) {
                    currentTimeline.set(index);
                }
            },
        },
        {
            id: 'column.tabify',
            title: 'command_column_tabify',
            icon: Group,
            run: (arg) => {
                const sourceId = resolveFocusedColumnId(columnState);
                if (!sourceId) return;
                if (columnState.tabsNodeOf(sourceId)) {
                    columnState.untabifyColumn(sourceId);
                    return;
                }
                const slotIdx = columnState.slotIndexOf(sourceId);
                const count = columnState.slots.length;
                if (slotIdx < 0 || count < 2) return;
                const step = arg === 'prev' ? -1 : 1;
                const target = columnState.getSlotColumn(((slotIdx + step) % count + count) % count);
                if (!target) return;
                columnState.tabifyColumn(sourceId, target.id);
            },
        },
        {
            id: 'column.untabify',
            title: 'command_column_untabify',
            icon: Ungroup,
            run: () => {
                const id = resolveFocusedColumnId(columnState);
                if (id) columnState.untabifyColumn(id);
            },
        },
        {
            id: 'column.tab',
            title: 'command_column_tab',
            hidden: true,
            run: (arg) => {
                const id = resolveFocusedColumnId(columnState);
                if (!id) return;
                if (arg === 'next') {
                    columnState.cycleTab(id, 1);
                } else if (arg === 'prev') {
                    columnState.cycleTab(id, -1);
                } else {
                    const n = Number(arg) - 1;
                    const node = columnState.tabsNodeOf(id);
                    if (node && Number.isFinite(n)) columnState.setTabsActive(node, n);
                }
            },
        },
        {
            id: 'column.move',
            title: 'command_column_move',
            hidden: true,
            run: (arg) => {
                if (arg !== 'left' && arg !== 'right') return;
                if (get(settings).design?.layout !== 'decks') return;
                const id = resolveFocusedColumnId(columnState);
                if (!id) return;
                const from = columnState.visibleSlotIndexOf(id);
                if (from === -1) return;
                const to = from + (arg === 'right' ? 1 : -1);
                if (to < 0 || to >= columnState.visibleSlotCount()) return;
                animateLayout(() => columnState.reorderVisibleSlots(from, to));
                const column = columnState.columns.find((c) => c.id === id);
                column?.scrollElement?.focus();
                column?.scrollElement?.scrollIntoView({ inline: 'nearest', behavior: 'instant' });
            },
        },
        {
            id: 'column.width',
            title: 'command_column_width',
            hidden: true,
            run: (arg) => {
                if (!arg || get(settings).design?.layout !== 'decks') return;
                const id = resolveFocusedColumnId(columnState);
                if (!id) return;
                const slotIdx = columnState.slotIndexOf(id);
                if (slotIdx === -1) return;
                const slot = columnState.slots[slotIdx];
                const targetIds = slot.layout.type === 'tabs' ? columnState.leafIdsOf(slotIdx) : [firstLeafId(slot.layout)];
                const targets = targetIds
                    .map((leafId) => columnState.columns.find((c) => c.id === leafId))
                    .filter((c) => !!c);
                if (!targets.length) return;

                const relative = /^([+-])(\d+)(px)?$/.exec(arg);
                const absolute = /^(\d+)(px)?$/.exec(arg);
                let width: number | string;
                if (relative) {
                    const delta = Number(relative[2]) * (relative[1] === '-' ? -1 : 1);
                    width = clampDeckWidth(resolveDeckWidthPx(targets[0]!.settings?.width ?? 'medium') + delta);
                } else if (absolute) {
                    width = clampDeckWidth(Number(absolute[1]));
                } else if (['xxs', 'xs', 'small', 'medium', 'large', 'xl', 'xxl'].includes(arg)) {
                    width = arg;
                } else {
                    return;
                }
                for (const col of targets) {
                    col!.settings = { ...col!.settings, width } as any;
                }
            },
        },
        {
            id: 'column.float',
            title: 'command_column_float',
            icon: PictureInPicture2,
            run: () => {
                if (get(settings).design?.layout !== 'decks') return;
                const id = resolveFocusedColumnId(columnState);
                if (!id) return;
                const slotIdx = columnState.slotIndexOf(id);
                if (slotIdx === -1 || columnState.slots[slotIdx].layout.type !== 'leaf') return;
                const column = columnState.columns.find((c) => c.id === id);
                if (!column) return;
                animateLayout(() => {
                    const next = !column.settings?.isPopup;
                    column.settings = {
                        ...column.settings,
                        isPopup: next,
                        ...(next && !column.settings?.popupPreset ? { popupPreset: 'center' } : {}),
                    } as any;
                    if (next) {
                        scratchpadState.show();
                        columnState.raiseFloating(column.id);
                    }
                });
            },
        },
        {
            id: 'scratchpad.toggle',
            title: 'command_scratchpad_toggle',
            icon: SquareStack,
            run: () => {
                const hasPopup = columnState.columns.some((c) => c.settings?.isPopup);
                if (!hasPopup && !scratchpadState.hidden) return;
                scratchpadState.toggle();
            },
        },
        {
            id: 'submap.enter',
            title: 'command_submap_enter',
            hidden: true,
            run: (arg) => {
                if (arg && riceState.submaps[arg]) {
                    keymodeState.enter(arg);
                } else {
                    console.warn(`[rice] unknown submap: ${arg}`);
                }
            },
        },
        {
            id: 'submap.exit',
            title: 'command_submap_exit',
            hidden: true,
            run: () => keymodeState.exit(),
        },
        {
            id: 'columns.refresh',
            title: 'command_columns_refresh',
            icon: RefreshCcw,
            run: () => {
                document.dispatchEvent(new KeyboardEvent('keydown', {
                    key: 'r',
                    code: 'R',
                    bubbles: true,
                    cancelable: true,
                }));
            },
        },
        {
            id: 'columns.scroll-top',
            title: 'command_columns_scroll_top',
            icon: CircleArrowUp,
            run: () => {
                try {
                    if (get(settings).design?.layout === 'decks') {
                        for (const column of columnState.columns) {
                            column?.scrollElement?.scroll({ top: 0, left: 0, behavior: 'smooth' });
                        }
                    } else {
                        document.querySelector(':root')?.scroll({ top: 0, left: 0, behavior: 'smooth' });
                    }
                } catch {
                }
            },
        },
        {
            id: 'nav.home',
            title: 'command_nav_home',
            icon: Home,
            run: () => {
                goto('/');
            },
        },
        {
            id: 'nav.chat',
            title: 'command_nav_chat',
            icon: MessageCircleMore,
            run: () => {
                goto('/chat');
            },
        },
        {
            id: 'nav.search',
            title: 'command_nav_search',
            icon: Search,
            run: () => {
                goto('/search');
            },
        },
        {
            id: 'nav.profile',
            title: 'command_nav_profile',
            icon: UserRound,
            run: () => {
                const currentAgent = get(agent);
                if (currentAgent) {
                    goto(`/profile/${currentAgent.handle()}`);
                }
            },
        },
        {
            id: 'nav.viewer',
            title: 'command_nav_viewer',
            icon: Database,
            run: () => {
                const currentAgent = get(agent);
                if (currentAgent) {
                    goto('/atproto-viewer/' + currentAgent.did());
                }
            },
        },
        {
            id: 'nav.tokmek',
            title: 'command_nav_tokmek',
            icon: Clapperboard,
            run: () => {
                goto('/');
                setTimeout(() => {
                    goto('/profile/did:plc:z72i7hdynmk6r22z27h6tvur/feed/thevids');
                }, 250);
                sideState.isTokStart = true;
            },
        },
        {
            id: 'settings.open',
            title: 'command_settings_open',
            hidden: true,
            run: (arg) => {
                const pageId = arg && isSettingsPageId(arg) ? arg : 'general';
                goto(`/settings/${pageId}`);
            },
        },
        {
            id: 'settings.column',
            title: 'command_settings_column',
            hidden: true,
            run: (arg) => {
                const pageId = arg && isSettingsPageId(arg) ? arg : 'general';
                openSettingsColumn(columnState, pageId);
            },
        },
        {
            id: 'side.toggle',
            title: 'command_side_toggle',
            hidden: true,
            run: (arg, ctx) => {
                const item = arg as SideItem | undefined;
                if (!item) return;
                if (sideState.openModal === item) {
                    sideState.close();
                    return;
                }
                overlayState.closeAll();
                sideState.openModal = item;
                sideState.anchor = ctx?.anchor ?? null;
            },
        },
        {
            id: 'darkmode.toggle',
            title: 'command_darkmode_toggle',
            icon: Moon,
            run: () => {
                settingsStore.design.darkmode = !isEffectiveDarkmode();
            },
        },
        {
            id: 'rice.toggle',
            title: 'command_rice_toggle',
            icon: Sparkles,
            run: () => {
                settingsStore.rice.enabled = !settingsStore.rice.enabled;
            },
        },
        {
            id: 'workspace.switch',
            title: 'command_workspace_switch',
            hidden: true,
            run: async (arg) => {
                const id = Number(arg);
                if (!Number.isFinite(id) || id === appState.profile.current) return;
                const profile = await accountsDb.profiles.get(id);
                if (profile) {
                    switchWorkspace(columnState, profile);
                }
            },
        },
        {
            id: 'workspace.next',
            title: 'command_workspace_next',
            icon: Layers,
            run: async () => {
                const profiles = await accountsDb.profiles.toArray();
                if (profiles.length < 2) return;
                const index = profiles.findIndex((p) => p.id === appState.profile.current);
                const next = profiles[(index + 1) % profiles.length];
                if (next) {
                    switchWorkspace(columnState, next);
                }
            },
        },
    ];
}
