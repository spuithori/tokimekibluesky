import '$lib/i18n';
import { setLocale } from 'tokimeki-i18n';
import type { LayoutLoad } from './$types';
import { appState } from '$lib/classes/appState.svelte';
import { settingsStore } from '$lib/settings/settings.svelte';

export const load: LayoutLoad = async () => {
    if(!Intl.Segmenter){
        console.log('Intl.Segmenter not found. Browser is too old.');
    }

    appState.preloadDb().catch(() => {});
    await setLocale(settingsStore.general?.language || window.navigator.language);
}

export const ssr = false;
