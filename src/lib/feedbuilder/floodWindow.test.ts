import { describe, expect, it } from 'vitest';
import { CUSTOM_FEED_DEFS as D } from '$lib/feedbuilder/types';
import type { CustomFeedPredicateAuthorMaxPosts } from '$lib/feedbuilder/types';
import { floodLabel, floodWindowLabel, switchFloodMode } from './floodWindow';
import { addLocales, setLocale } from 'tokimeki-i18n';
import ja from './locales/ja.json';

await addLocales({ ja: [ja as Record<string, string>] });
await setLocale('ja');

const pred = (p: Partial<CustomFeedPredicateAuthorMaxPosts>): CustomFeedPredicateAuthorMaxPosts => ({
  $type: D.predicateAuthorMaxPosts,
  max: 100,
  ...p
});

describe('連投の条件', () => {
  it('期間は時間で割り切れれば時間、そうでなければ分で書く', () => {
    expect(floodWindowLabel(pred({}))).toBe('24 時間');
    expect(floodWindowLabel(pred({ withinMinutes: 120 }))).toBe('2 時間');
    expect(floodWindowLabel(pred({ withinMinutes: 90 }))).toBe('90 分');
  });

  it('人ごと・時間帯ごとで文言が変わる', () => {
    expect(floodLabel(pred({ max: 10, withinMinutes: 60, mode: 'burst' }))).toBe('連投した時間帯以外（1 時間に 10 件まで）');
    expect(floodLabel(pred({ max: 10, withinMinutes: 60, mode: 'burst' }), true)).toBe('連投した時間帯（1 時間に 10 件超）');
    expect(floodLabel(pred({}), true)).toBe('連投している人（24 時間に 100 件超）');
  });

  it('既定のまま切り替えたら切り替え先の既定にし、変えた値は残す', () => {
    const burst = switchFloodMode(pred({ withinHours: 24 }), 'burst');
    expect(burst).toEqual({ $type: D.predicateAuthorMaxPosts, max: 10, withinMinutes: 60, mode: 'burst' });
    expect(switchFloodMode(burst, 'recent')).toEqual({ $type: D.predicateAuthorMaxPosts, max: 100, withinHours: 24 });
    const custom = switchFloodMode(pred({ max: 5, withinHours: 3 }), 'burst');
    expect(custom).toEqual({ $type: D.predicateAuthorMaxPosts, max: 5, withinHours: 3, mode: 'burst' });
    expect(switchFloodMode(custom, 'recent')).toEqual({ $type: D.predicateAuthorMaxPosts, max: 5, withinHours: 3 });
  });
});
