import { describe, it, expect } from 'vitest';
import {
    ACTIVE_DAYS_REQUIRED,
    CALENDAR_DAYS_REQUIRED,
    calendarDaysBetween,
    isSupportPromptDue,
    localDayString,
    recordActivity,
} from './supportPrompt';
import type { SupportSettings } from '$lib/settings/types';

function fresh(): SupportSettings {
    return { dismissed: false, qualified: false, firstActiveDay: '', lastActiveDay: '', activeDays: 0 };
}

function dayAfter(day: string, offset: number): string {
    const [y, m, d] = day.split('-').map(Number);
    return localDayString(new Date(y, m - 1, d + offset));
}

describe('localDayString', () => {
    it('formats a local calendar day with zero padding', () => {
        expect(localDayString(new Date(2026, 0, 5))).toBe('2026-01-05');
        expect(localDayString(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31');
    });
});

describe('calendarDaysBetween', () => {
    it('counts whole calendar days across month and DST boundaries', () => {
        expect(calendarDaysBetween('2026-02-27', '2026-03-02')).toBe(3);
        expect(calendarDaysBetween('2026-03-01', '2026-04-01')).toBe(31);
        expect(calendarDaysBetween('', '2026-04-01')).toBe(0);
    });
});

describe('recordActivity', () => {
    it('counts a day once no matter how many boots happen that day', () => {
        const s = fresh();
        expect(recordActivity(s, '2026-09-16')).toBe(true);
        expect(recordActivity(s, '2026-09-16')).toBe(false);
        expect(s.activeDays).toBe(1);
        expect(s.firstActiveDay).toBe('2026-09-16');
        expect(s.lastActiveDay).toBe('2026-09-16');
    });

    it('does not qualify after the active-day threshold alone when the calendar span is short', () => {
        const s = fresh();
        for (let i = 0; i < ACTIVE_DAYS_REQUIRED; i++) {
            recordActivity(s, dayAfter('2026-09-01', i));
        }
        expect(s.activeDays).toBe(ACTIVE_DAYS_REQUIRED);
        expect(s.qualified).toBe(false);
        expect(isSupportPromptDue(s)).toBe(false);
    });

    it('does not qualify after the calendar span alone when active days are few', () => {
        const s = fresh();
        recordActivity(s, '2026-09-01');
        recordActivity(s, dayAfter('2026-09-01', CALENDAR_DAYS_REQUIRED + 5));
        expect(s.qualified).toBe(false);
    });

    it('qualifies once both thresholds are met, and stays qualified', () => {
        const s = fresh();
        for (let i = 0; i < ACTIVE_DAYS_REQUIRED - 1; i++) {
            recordActivity(s, dayAfter('2026-09-01', i));
        }
        expect(s.qualified).toBe(false);
        recordActivity(s, dayAfter('2026-09-01', CALENDAR_DAYS_REQUIRED));
        expect(s.qualified).toBe(true);
        expect(isSupportPromptDue(s)).toBe(true);
        recordActivity(s, dayAfter('2026-09-01', CALENDAR_DAYS_REQUIRED + 1));
        expect(s.qualified).toBe(true);
    });

    it('never shows again after dismissal even as activity continues', () => {
        const s = { ...fresh(), qualified: true, dismissed: true };
        recordActivity(s, '2026-10-01');
        expect(isSupportPromptDue(s)).toBe(false);
    });
});
