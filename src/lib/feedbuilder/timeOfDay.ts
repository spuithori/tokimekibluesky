import { t } from 'tokimeki-i18n';
import type { CustomFeedPredicateTimeOfDay } from '$lib/feedbuilder/types';

export function weekdayName(d: number): string {
  return d >= 0 && d <= 6 ? t(`tfeeds_weekday_${d}`) : '?';
}

export const WEEKDAY_INDEXES = [0, 1, 2, 3, 4, 5, 6];

export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function tzLabel(tz: string): string {
  if (tz === 'Asia/Tokyo') return t('tfeeds_tz_tokyo');
  if (tz === 'UTC') return t('tfeeds_tz_utc');
  return tz;
}

function weekdaysLabel(days: number[] | undefined): string {
  if (!days || days.length === 0 || days.length === 7) return '';
  const set = [...new Set(days)].sort((a, b) => a - b);
  if (set.join() === '1,2,3,4,5') return t('tfeeds_weekdays_weekday');
  if (set.join() === '0,6') return t('tfeeds_weekdays_weekend');
  return t('tfeeds_weekdays_list', { days: set.map(weekdayName).join(t('tfeeds_sep')) });
}

export function timeOfDayLabel(p: CustomFeedPredicateTimeOfDay): string {
  const start = p.start ?? '00:00';
  const end = p.end ?? '24:00';
  const allDay = start === end || (start === '00:00' && end === '24:00');
  const tz = p.timezone ?? 'UTC';
  const parts: string[] = [];
  if (!allDay) parts.push(t('tfeeds_time_range', { tz: tzLabel(tz), start, end }));
  const w = weekdaysLabel(p.weekdays);
  if (w) parts.push(allDay ? t('tfeeds_time_days_tz', { days: w, tz: tzLabel(tz) }) : w);
  return parts.length ? parts.join(t('tfeeds_sep')) : t('tfeeds_time_unset');
}
