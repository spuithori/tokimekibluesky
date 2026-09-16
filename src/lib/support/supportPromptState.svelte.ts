import { get } from 'svelte/store';
import { agents } from '$lib/stores';
import { settingsStore } from '$lib/settings/settings.svelte';
import { isSupportPromptDue, localDayString, recordActivity } from './supportPrompt';
import { fetchSupporterPlan, getSupporterPlan } from './supporterLabels';

class SupportPromptState {
    #booted = false;
    #forced = $state(false);

    get isDue(): boolean {
        return this.#forced || (!settingsStore.support.plan && isSupportPromptDue(settingsStore.support));
    }

    get plan() {
        return getSupporterPlan(settingsStore.support.plan);
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
        const today = localDayString(new Date());
        recordActivity(settingsStore.support, today);
        if (settingsStore.support.planCheckedDay !== today) {
            this.refreshPlan(today);
        }
    }

    async refreshPlan(today: string): Promise<void> {
        const dids = [...get(agents).values()].map((agent) => agent.did()).filter(Boolean);
        try {
            const plan = await fetchSupporterPlan(dids);
            settingsStore.support.plan = plan?.id ?? '';
            settingsStore.support.planCheckedDay = today;
        } catch (e) {
            console.warn('Supporter plan check failed:', e);
        }
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
