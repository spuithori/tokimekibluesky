import { settingsStore } from '$lib/settings/settings.svelte';
import { isSupportPromptDue, localDayString, recordActivity } from './supportPrompt';

class SupportPromptState {
    #booted = false;
    #forced = $state(false);

    get isDue(): boolean {
        return this.#forced || isSupportPromptDue(settingsStore.support);
    }

    boot(): void {
        if (this.#booted) {
            return;
        }
        this.#booted = true;
        if (import.meta.env.DEV && new URLSearchParams(location.search).has('support-prompt')) {
            this.#forced = true;
            return;
        }
        recordActivity(settingsStore.support, localDayString(new Date()));
    }

    dismiss(): void {
        if (this.#forced) {
            this.#forced = false;
            return;
        }
        settingsStore.support.dismissed = true;
    }
}

export const supportPromptState = new SupportPromptState();
