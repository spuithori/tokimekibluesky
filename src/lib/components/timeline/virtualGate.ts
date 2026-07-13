import { settingsStore } from '$lib/settings/settings.svelte';

export function isVirtualTimelineEnabled(column: any): boolean {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('vlDisable') === '1') return false;
  } catch {}
  if (settingsStore.general?.disableVirtualList) return false;
  return !column?.style || column.style === 'default';
}
