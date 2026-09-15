import { settingsStore } from '$lib/settings/settings.svelte';

class OnboardingState {
    wizardActive = $state(false);
    tourOpen = $state(false);
    tourStep = $state(0);

    openWizard() {
        this.wizardActive = true;
    }

    closeWizard() {
        this.wizardActive = false;
        settingsStore.onboarding.completed = true;
    }

    startTour() {
        this.tourStep = 0;
        this.tourOpen = true;
    }

    endTour() {
        this.tourOpen = false;
        settingsStore.onboarding.tourSeen = true;
    }
}

export const onboardingState = new OnboardingState();
