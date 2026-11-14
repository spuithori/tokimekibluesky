import { describe, it, expect } from 'vitest';
import { FIRST_ACTIVE_DAY, SUPPORT_GAP_DAYS, deferMochottPrompt, isMochottPromptScheduled, recordMochottPromptClosed } from './mochottPrompt';
import type { MochottPromptSettings } from '$lib/settings/types';

function fresh(): MochottPromptSettings {
    return { registered: false, closedCount: 0, nextActiveDay: FIRST_ACTIVE_DAY, checkedDay: '' };
}

function shownDays(prompt: MochottPromptSettings, until: number): number[] {
    const days: number[] = [];
    for (let day = 1; day <= until; day++) {
        if (isMochottPromptScheduled(prompt, day)) {
            days.push(day);
            recordMochottPromptClosed(prompt, day);
        }
    }
    return days;
}

describe('mochott prompt schedule', () => {
    it('shows three times at widening intervals and then never again', () => {
        expect(shownDays(fresh(), 2000)).toEqual([10, 40, 100]);
    });

    it('keeps showing on later days until it is closed', () => {
        const prompt = fresh();
        expect(isMochottPromptScheduled(prompt, 9)).toBe(false);
        expect(isMochottPromptScheduled(prompt, 10)).toBe(true);
        expect(isMochottPromptScheduled(prompt, 25)).toBe(true);
    });

    it('measures the next interval from the day it was closed, not the day it became due', () => {
        const prompt = fresh();
        recordMochottPromptClosed(prompt, 25);
        expect(isMochottPromptScheduled(prompt, 54)).toBe(false);
        expect(isMochottPromptScheduled(prompt, 55)).toBe(true);
    });

    it('never shows once a mochott registration has been seen', () => {
        const prompt = fresh();
        prompt.registered = true;
        expect(shownDays(prompt, 500)).toEqual([]);
    });

    it('waits after the support prompt and never moves an already later date earlier', () => {
        const prompt = fresh();
        deferMochottPrompt(prompt, 14);
        expect(isMochottPromptScheduled(prompt, 14 + SUPPORT_GAP_DAYS - 1)).toBe(false);
        expect(isMochottPromptScheduled(prompt, 14 + SUPPORT_GAP_DAYS)).toBe(true);

        recordMochottPromptClosed(prompt, 20);
        deferMochottPrompt(prompt, 21);
        expect(prompt.nextActiveDay).toBe(50);
    });
});
