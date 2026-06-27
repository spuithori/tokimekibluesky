import '$lib/i18n';
import { locale, waitLocale } from 'svelte-i18n';

export const ssr = false;
export const prerender = false;

export async function load() {
    locale.set(window.navigator.language);
    await waitLocale();
}
