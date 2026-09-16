import type { SupportSettings } from '$lib/settings/types';

export const SUPPORT_URL = 'https://tokimeki.fanbox.cc/';
export const COFFEE_URL = 'https://buymeacoffee.com/spuithori';
export const ACTIVE_DAYS_REQUIRED = 7;
export const CALENDAR_DAYS_REQUIRED = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export function localDayString(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function parseDay(day: string): number {
    const [y, m, d] = day.split('-').map(Number);
    return Date.UTC(y, m - 1, d);
}

export function calendarDaysBetween(fromDay: string, toDay: string): number {
    if (!fromDay || !toDay) {
        return 0;
    }
    return Math.floor((parseDay(toDay) - parseDay(fromDay)) / DAY_MS);
}

export function recordActivity(support: SupportSettings, today: string): boolean {
    if (support.lastActiveDay === today) {
        return false;
    }
    if (!support.firstActiveDay) {
        support.firstActiveDay = today;
    }
    support.lastActiveDay = today;
    support.activeDays += 1;
    if (
        !support.qualified &&
        support.activeDays >= ACTIVE_DAYS_REQUIRED &&
        calendarDaysBetween(support.firstActiveDay, today) >= CALENDAR_DAYS_REQUIRED
    ) {
        support.qualified = true;
    }
    return true;
}

export function isSupportPromptDue(support: SupportSettings): boolean {
    return support.qualified && !support.dismissed;
}
