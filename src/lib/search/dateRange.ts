export type RangePreset = 'day' | 'week' | 'month' | 'year';

export const RANGE_PRESETS: RangePreset[] = ['day', 'week', 'month', 'year'];

const PRESET_DAYS: Record<RangePreset, number> = {
    day: 1,
    week: 7,
    month: 30,
    year: 365,
};

export function toDateInputValue(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

export function presetSince(preset: RangePreset, now: Date = new Date()): string {
    const d = new Date(now);
    d.setDate(d.getDate() - PRESET_DAYS[preset]);
    return toDateInputValue(d);
}
