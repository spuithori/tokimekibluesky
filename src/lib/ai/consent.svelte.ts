import { settingsStore } from "$lib/settings/settings.svelte";
import { AI_POLICY_VERSION, hasAiPolicyConsent, type AiFeatureId } from "$lib/ai-policy";

export type AiDialogView = 'consent' | 'policy';

interface AiDialogHistory {
    push(view: AiDialogView): void;
    pop(depth: number): void;
}

class AiConsentState {
    open = $state(false);
    view = $state<AiDialogView>('consent');
    policyOnly = $state(false);
    checked = $state(false);
    feature = $state<AiFeatureId | undefined>();
    #history: AiDialogHistory | undefined;
    #depth = 0;
    #agreed = false;
    #settle: ((agreed: boolean) => void) | undefined;

    attach(history: AiDialogHistory | undefined) {
        this.#history = history;
    }

    ensure(feature?: AiFeatureId): Promise<boolean> {
        if (hasAiPolicyConsent(settingsStore.general)) {
            return Promise.resolve(true);
        }

        if (this.open) {
            this.#finish();
        }
        this.feature = feature;
        this.policyOnly = false;
        this.#show('consent');
        return new Promise(resolve => {
            this.#settle = resolve;
        });
    }

    showPolicy() {
        if (!this.open) {
            this.policyOnly = true;
        }
        this.#show('policy');
    }

    back() {
        if (this.#history) {
            this.#history.pop(1);
        } else {
            this.sync('consent');
        }
    }

    settle(agreed: boolean) {
        if (!this.open) {
            return;
        }
        this.#agreed = agreed;
        if (this.#history && this.#depth > 0) {
            this.#history.pop(this.#depth);
        } else {
            this.#finish();
        }
    }

    sync(shown: AiDialogView | undefined) {
        if (!this.open) {
            return;
        }
        if (!shown) {
            this.#finish();
            return;
        }
        this.view = shown;
        this.#depth = shown === 'policy' && !this.policyOnly ? 2 : 1;
    }

    grant() {
        settingsStore.general.aiPolicyConsent = AI_POLICY_VERSION;
    }

    withdraw() {
        settingsStore.general.aiPolicyConsent = '';
        settingsStore.general.autoColumnIcon = false;
    }

    #show(view: AiDialogView) {
        this.open = true;
        this.view = view;
        this.#depth += 1;
        this.#history?.push(view);
    }

    #finish() {
        if (this.#agreed) {
            this.grant();
        }
        const agreed = this.#agreed;
        this.open = false;
        this.view = 'consent';
        this.policyOnly = false;
        this.checked = false;
        this.#depth = 0;
        this.#agreed = false;
        this.#settle?.(agreed);
        this.#settle = undefined;
    }
}

export const aiConsent = new AiConsentState();
