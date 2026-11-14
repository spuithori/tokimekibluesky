import { get } from 'svelte/store';
import { agents } from '$lib/stores';
import { settingsStore } from '$lib/settings/settings.svelte';
import { localDayString } from '$lib/support/supportPrompt';
import { supportPromptState } from '$lib/support/supportPromptState.svelte';
import { fetchPublicationState } from '$lib/chotto/mochottApi';
import { deferMochottPrompt, isMochottPromptScheduled, recordMochottPromptClosed } from './mochottPrompt';

class MochottPromptState {
    #booted = false;
    #forced = $state(false);
    #unregistered = $state(false);

    get isDue(): boolean {
        return this.#forced || (this.#unregistered && isMochottPromptScheduled(settingsStore.mochottPrompt, settingsStore.support.activeDays));
    }

    boot(): void {
        if (this.#booted) {
            return;
        }
        this.#booted = true;
        if (import.meta.env.DEV && new URLSearchParams(location.search).has('mochott-prompt')) {
            this.#forced = true;
            return;
        }
        const prompt = settingsStore.mochottPrompt;
        const activeDays = settingsStore.support.activeDays;
        if (supportPromptState.isDue) {
            deferMochottPrompt(prompt, activeDays);
            return;
        }
        if (!isMochottPromptScheduled(prompt, activeDays)) {
            return;
        }
        const today = localDayString(new Date());
        if (prompt.checkedDay === today) {
            this.#unregistered = true;
            return;
        }
        (window.requestIdleCallback ?? ((callback) => window.setTimeout(callback, 3000)))(() => this.check(today));
    }

    async check(today: string): Promise<void> {
        const dids = [...get(agents).values()].map((agent) => agent.did()).filter(Boolean);
        if (!dids.length) {
            return;
        }
        try {
            const states = await Promise.all(dids.map((did) => fetchPublicationState(did)));
            if (states.some((state) => state.kind === 'registered')) {
                settingsStore.mochottPrompt.registered = true;
                return;
            }
            settingsStore.mochottPrompt.checkedDay = today;
            this.#unregistered = true;
        } catch (e) {
            console.warn('mochott registration check failed:', e);
        }
    }

    dismiss(): void {
        if (this.#forced) {
            this.#forced = false;
            return;
        }
        recordMochottPromptClosed(settingsStore.mochottPrompt, settingsStore.support.activeDays);
    }
}

export const mochottPromptState = new MochottPromptState();
