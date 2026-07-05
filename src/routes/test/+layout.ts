import '$lib/i18n';
import { setLocale } from 'tokimeki-i18n';

export const ssr = false;
export const prerender = false;

export async function load() {
    await setLocale(window.navigator.language);
}
