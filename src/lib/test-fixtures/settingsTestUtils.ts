import { flushSync } from 'svelte';
import { settingsStore } from '$lib/settings/settings.svelte';
import { migrate } from '$lib/settings/migrations';

export function resetSettings(seed?: unknown): void {
    localStorage.clear();
    settingsStore.raw = migrate(seed);
    flushSync();
}
