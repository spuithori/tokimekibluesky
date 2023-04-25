import '$lib/i18n';
import { locale, waitLocale } from 'svelte-i18n';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
    locale.set(window.navigator.language);
    console.log('current language: ' + window.navigator.language);
    await waitLocale();
}
export const ssr = false;
