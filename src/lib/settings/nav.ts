import Settings from '@lucide/svelte/icons/settings';
import Palette from '@lucide/svelte/icons/palette';
import GanttChartSquare from '@lucide/svelte/icons/gantt-chart-square';
import Hand from '@lucide/svelte/icons/hand';
import WholeWord from '@lucide/svelte/icons/whole-word';
import BellRing from '@lucide/svelte/icons/bell-ring';
import CalendarClock from '@lucide/svelte/icons/calendar-clock';
import Database from '@lucide/svelte/icons/database';
import Layers from '@lucide/svelte/icons/layers';
import Heart from '@lucide/svelte/icons/heart';
import Keyboard from '@lucide/svelte/icons/keyboard';
import Sparkles from '@lucide/svelte/icons/sparkles';

/**
 * Data-driven settings navigation. The settings layout renders these instead of
 * hand-written <li> blocks. The bespoke gradient "support" icon and the social
 * list stay as static markup in the layout (one-offs not worth abstracting).
 */
export interface SettingsNavItem {
    id: string;
    label: string; // i18n key
    href: string;
    icon: any; // lucide-svelte component (see schema.types SettingOption.icon note)
    placement?: 'top' | 'bottom';
    parent?: string;
}

export const settingsNav: SettingsNavItem[] = [
    { id: 'profiles', label: 'settings_profiles', href: '/settings/profiles', icon: Layers },
    { id: 'general', label: 'settings_general', href: '/settings/general', icon: Settings },
    { id: 'design', label: 'settings_design', href: '/settings/design', icon: Palette },
    { id: 'timeline', label: 'settings_timeline', href: '/settings/timeline', icon: GanttChartSquare },
    { id: 'keyboard', label: 'settings_keyboard', href: '/settings/keyboard', icon: Keyboard },
    { id: 'moderation', label: 'settings_moderation', href: '/settings/moderation', icon: Hand },
    { id: 'keyword-mutes', label: 'settings_keyword_mutes', href: '/settings/keyword-mutes', icon: WholeWord, parent: 'moderation' },
    { id: 'push-notification', label: 'settings_push_notification', href: '/settings/push-notification', icon: BellRing },
    { id: 'schedule', label: 'schedule_post_title', href: '/settings/schedule', icon: CalendarClock },
    { id: 'ai', label: 'tokimeki_ai', href: '/settings/ai', icon: Sparkles },
    { id: 'data', label: 'settings_data_management', href: '/settings/data', icon: Database },
    { id: 'about', label: 'settings_about', href: '/settings/about', icon: Heart, placement: 'bottom' },
];

export function isNavCurrent(item: SettingsNavItem, pathname: string): boolean {
    return pathname === item.href || settingsNav.some((child) => child.parent === item.id && child.href === pathname);
}
