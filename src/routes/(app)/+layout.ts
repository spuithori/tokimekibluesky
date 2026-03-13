import '$lib/i18n';
import { locale, waitLocale } from 'svelte-i18n';
import type { LayoutLoad } from './$types';
import { appState } from '$lib/classes/appState.svelte';
import posthog from 'posthog-js'
import { browser } from '$app/environment';
import { PUBLIC_POSTHOG_KEY } from '$env/static/public';

export const load: LayoutLoad = async () => {
    if(!Intl.Segmenter){
        console.log('Intl.Segmenter not found. Browser is too old.');
    }

    if (browser) {
        posthog.init(PUBLIC_POSTHOG_KEY, {
            api_host: 'https://us.i.posthog.com',
            defaults: '2026-01-30',
        })
    }

    locale.set(window.navigator.language);
    console.log('current language: ' + window.navigator.language);
    appState.preloadDb();
    await waitLocale();
}

export const ssr = false;