export function isVirtualTimelineEnabled(column: any): boolean {
  try {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('vlDisable') === '1') return false;
  } catch {}
  return !column?.style || column.style === 'default';
}
