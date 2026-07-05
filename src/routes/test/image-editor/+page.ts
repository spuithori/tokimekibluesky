import '$lib/i18n';
import { setLocale } from 'tokimeki-i18n';
import { settingsStore } from '$lib/settings/settings.svelte';

export async function load() {
    await setLocale(settingsStore.general?.language || window.navigator.language);
}
