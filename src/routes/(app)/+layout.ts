import '$lib/i18n';
import { locale, waitLocale } from 'svelte-i18n';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async () => {
    locale.set(window.navigator.language);
    await waitLocale();
}

export const ssr = false;