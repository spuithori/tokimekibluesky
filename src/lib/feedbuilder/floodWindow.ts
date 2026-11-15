import { t } from 'tokimeki-i18n';
import type { CustomFeedPredicateAuthorMaxPosts } from '$lib/feedbuilder/types';

export function floodWindowMinutes(p: CustomFeedPredicateAuthorMaxPosts): number {
  return p.withinMinutes ?? (p.withinHours ?? 24) * 60;
}

export function floodWindowLabel(p: CustomFeedPredicateAuthorMaxPosts): string {
  const m = floodWindowMinutes(p);
  return m % 60 === 0 ? t('tfeeds_dur_hours', { n: m / 60 }) : t('tfeeds_dur_minutes', { n: m });
}

export function floodLabel(p: CustomFeedPredicateAuthorMaxPosts, negated = false): string {
  const w = floodWindowLabel(p);
  if (p.mode === 'burst') {
    return t(negated ? 'tfeeds_flood_burst_neg' : 'tfeeds_flood_burst', { w, max: p.max });
  }
  return t(negated ? 'tfeeds_flood_recent_neg' : 'tfeeds_flood_recent', { w, max: p.max });
}

export const BURST_DEFAULT = { max: 10, withinMinutes: 60 };

export const RECENT_DEFAULT = { max: 100, withinHours: 24 };

export function switchFloodMode(
  p: CustomFeedPredicateAuthorMaxPosts,
  mode: 'recent' | 'burst'
): CustomFeedPredicateAuthorMaxPosts {
  const { withinHours: _h, withinMinutes: _m, mode: _mode, ...rest } = p;
  const isRecentDefault = p.max === RECENT_DEFAULT.max && floodWindowMinutes(p) === RECENT_DEFAULT.withinHours * 60;
  const isBurstDefault = p.max === BURST_DEFAULT.max && floodWindowMinutes(p) === BURST_DEFAULT.withinMinutes;
  if (mode === 'burst') {
    return isRecentDefault ? { ...rest, ...BURST_DEFAULT, mode } : { ...p, mode };
  }
  return isBurstDefault ? { ...rest, ...RECENT_DEFAULT } : { ...rest, ...windowOf(p) };
}

function windowOf(p: CustomFeedPredicateAuthorMaxPosts): { withinHours?: number; withinMinutes?: number } {
  if (p.withinMinutes !== undefined) return { withinMinutes: p.withinMinutes };
  if (p.withinHours !== undefined) return { withinHours: p.withinHours };
  return {};
}
