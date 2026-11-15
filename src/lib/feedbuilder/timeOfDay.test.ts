import { describe, expect, it } from 'vitest';
import { CUSTOM_FEED_DEFS as D } from '$lib/feedbuilder/types';
import { timeOfDayLabel } from './timeOfDay';
import { addLocales, setLocale } from 'tokimeki-i18n';
import ja from './locales/ja.json';

await addLocales({ ja: [ja as Record<string, string>] });
await setLocale('ja');

describe('timeOfDayLabel', () => {
  it('時間帯と曜日を短い言葉にする', () => {
    const t = (o: object) => timeOfDayLabel({ $type: D.predicateTimeOfDay, ...o });
    expect(t({ timezone: 'Asia/Tokyo', start: '22:00', end: '05:00', weekdays: [5] })).toBe('日本時間 22:00〜05:00・金曜');
    expect(t({ timezone: 'Asia/Tokyo', weekdays: [6, 0] })).toBe('土日（日本時間）');
    expect(t({ timezone: 'America/New_York', start: '09:00', end: '17:00', weekdays: [1, 2, 3, 4, 5] })).toBe(
      'America/New_York 09:00〜17:00・平日'
    );
    expect(t({ timezone: 'UTC' })).toBe('時間帯（未指定）');
  });
});
