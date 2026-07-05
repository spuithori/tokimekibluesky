import Settings from '@lucide/svelte/icons/settings';
import Palette from '@lucide/svelte/icons/palette';
import WandSparkles from '@lucide/svelte/icons/wand-sparkles';
import GanttChartSquare from '@lucide/svelte/icons/gantt-chart-square';
import Hand from '@lucide/svelte/icons/hand';
import WholeWord from '@lucide/svelte/icons/whole-word';
import BellRing from '@lucide/svelte/icons/bell-ring';
import CalendarClock from '@lucide/svelte/icons/calendar-clock';
import Database from '@lucide/svelte/icons/database';
import Layers from '@lucide/svelte/icons/layers';
import Heart from '@lucide/svelte/icons/heart';

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
}

export const settingsNav: SettingsNavItem[] = [
    { id: 'profiles', label: 'settings_profiles', href: '/settings/profiles', icon: Layers },
    { id: 'general', label: 'settings_general', href: '/settings/general', icon: Settings },
    { id: 'design', label: 'settings_design', href: '/settings/design', icon: Palette },
    { id: 'rice', label: 'settings_rice', href: '/settings/rice', icon: WandSparkles },
    { id: 'timeline', label: 'settings_timeline', href: '/settings/timeline', icon: GanttChartSquare },
    { id: 'moderation', label: 'settings_moderation', href: '/settings/moderation', icon: Hand },
    { id: 'keyword-mutes', label: 'settings_keyword_mutes', href: '/settings/keyword-mutes', icon: WholeWord },
    { id: 'push-notification', label: 'settings_push_notification', href: '/settings/push-notification', icon: BellRing },
    { id: 'schedule', label: 'schedule_post_title', href: '/settings/schedule', icon: CalendarClock },
    { id: 'data', label: 'settings_data_management', href: '/settings/data', icon: Database },
    { id: 'about', label: 'settings_about', href: '/settings/about', icon: Heart, placement: 'bottom' },
];
