import '$lib/i18n';
import { locale, waitLocale } from 'svelte-i18n';
import type { LayoutLoad } from './$types';
import { appState } from '$lib/classes/appState.svelte';

export const load: LayoutLoad = async () => {
    if(!Intl.Segmenter){
        console.log('Intl.Segmenter not found. Browser is too old.');
    }

    locale.set(window.navigator.language);
    console.log('current language: ' + window.navigator.language);
    appState.preloadDb();
    await waitLocale();
}

export const ssr = false;