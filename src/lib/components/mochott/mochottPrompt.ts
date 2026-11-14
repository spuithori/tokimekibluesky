import type { MochottPromptSettings } from '$lib/settings/types';
import { MOCHOTT_ORIGIN } from './mochottConst';

export const MOCHOTT_URL = `${MOCHOTT_ORIGIN}/`;
export const FIRST_ACTIVE_DAY = 10;
export const REPEAT_INTERVALS = [30, 60];
export const SUPPORT_GAP_DAYS = 3;

export function isMochottPromptScheduled(prompt: MochottPromptSettings, activeDays: number): boolean {
    return !prompt.registered && prompt.closedCount <= REPEAT_INTERVALS.length && activeDays >= prompt.nextActiveDay;
}

export function recordMochottPromptClosed(prompt: MochottPromptSettings, activeDays: number): void {
    const interval = REPEAT_INTERVALS[prompt.closedCount];
    prompt.closedCount += 1;
    if (interval !== undefined) {
        prompt.nextActiveDay = activeDays + interval;
    }
}

export function deferMochottPrompt(prompt: MochottPromptSettings, activeDays: number): void {
    const next = activeDays + SUPPORT_GAP_DAYS;
    if (next > prompt.nextActiveDay) {
        prompt.nextActiveDay = next;
    }
}
