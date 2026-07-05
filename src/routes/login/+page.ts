import '$lib/i18n';
import { setLocale } from 'tokimeki-i18n';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
    await setLocale(window.navigator.language);
}
export const ssr = false;
