import { t as tr } from 'tokimeki-i18n';
import { CUSTOM_FEED_DEFS, VIEWER_DID } from '$lib/feedbuilder/types';
import type { CustomFeedPredicate, CustomFeedSort } from '$lib/feedbuilder/types';
import type { BuilderDraft, DraftSource } from './feedBuilder.svelte';
import { timeOfDayLabel, localTimeZone } from './timeOfDay';
import { floodLabel } from './floodWindow';
import { getCachedProfile } from './profileResolver.svelte';
import { isNegated, isOrGroup, leafPred, makeLeaf, type FilterLeaf, type PredicateOrGroup } from './filterModel';

export type EasySourceId = 'global' | 'following' | 'engagement' | 'forYou' | 'search' | 'feed';

export interface EasySourceOption {
  id: EasySourceId;
  label: string;

  needsViewer: boolean;
}

export const EASY_SOURCES: EasySourceOption[] = [
  { id: 'global', get label() { return tr('tfeeds_easy_src_global'); }, needsViewer: false },
  { id: 'following', get label() { return tr('tfeeds_easy_src_following'); }, needsViewer: true },
  { id: 'engagement', get label() { return tr('tfeeds_easy_src_engagement'); }, needsViewer: true },
  { id: 'forYou', get label() { return tr('tfeeds_easy_src_forYou'); }, needsViewer: true },
  { id: 'search', get label() { return tr('tfeeds_easy_src_search'); }, needsViewer: false },
  { id: 'feed', get label() { return tr('tfeeds_easy_src_feed'); }, needsViewer: false }
];

export function easySourceId(s: DraftSource): EasySourceId | null {
  switch (s.kind) {
    case 'timeline':
      return s.scope === 'global' ? 'global' : 'following';
    case 'engagement':
      return 'engagement';
    case 'forYou':
      return 'forYou';
    case 'search':
      return 'search';
    case 'feed':
      return 'feed';
    default:
      return null;
  }
}

export function easySourceLabel(s: DraftSource): string {
  if (s.kind === 'search') {
    const q = s.query.trim();
    return q ? tr('tfeeds_easy_src_search_q', { q }) : tr('tfeeds_easy_src_search_empty');
  }

  if (s.kind === 'feed') return s.feed ? tr('tfeeds_easy_src_feed_picked') : tr('tfeeds_easy_src_feed_empty');
  const id = easySourceId(s);
  const label = EASY_SOURCES.find((o) => o.id === id)?.label ?? tr('tfeeds_easy_src_card');

  return s.kind === 'timeline' && s.scope === 'following' && s.includeReposts === false ? tr('tfeeds_easy_src_no_reposts', { label }) : label;
}

export type EasyCondId =
  | 'language'
  | 'image'
  | 'video'
  | 'link'
  | 'noReply'
  | 'replyFollowing'
  | 'noDuplicate'
  | 'noFlood'
  | 'timeOfDay'
  | 'noAdult'
  | 'minLikes'
  | 'author'
  | 'keyword';

export interface EasyCondition {
  id: EasyCondId;

  menuLabel: string;

  make: () => CustomFeedPredicate;

  match: (p: CustomFeedPredicate) => boolean;

  label: (p: CustomFeedPredicate) => string;

  negLabel?: (p: CustomFeedPredicate) => string;
}

export function condLabel(c: EasyCondition, p: CustomFeedPredicate, negated: boolean): string {
  if (!negated) return c.label(p);
  return c.negLabel ? c.negLabel(p) : tr('tfeeds_easy_except', { label: c.label(p) });
}

export const LANGUAGES: { code: string; label: string }[] = [
  { code: 'ja', get label() { return tr('tfeeds_lang_ja'); } },
  { code: 'en', get label() { return tr('tfeeds_lang_en'); } },
  { code: 'ko', get label() { return tr('tfeeds_lang_ko'); } },
  { code: 'zh', get label() { return tr('tfeeds_lang_zh'); } },
  { code: 'es', get label() { return tr('tfeeds_lang_es'); } },
  { code: 'pt', get label() { return tr('tfeeds_lang_pt'); } },
  { code: 'fr', get label() { return tr('tfeeds_lang_fr'); } },
  { code: 'de', get label() { return tr('tfeeds_lang_de'); } }
];

export const MIN_LIKES_CHOICES = [5, 10, 30, 100, 500];

export const TIME_RANGE_CHOICES: { label: string; start?: string; end?: string }[] = [
  { get label() { return tr('tfeeds_easy_time_morning'); }, start: '05:00', end: '10:00' },
  { get label() { return tr('tfeeds_easy_time_day'); }, start: '10:00', end: '17:00' },
  { get label() { return tr('tfeeds_easy_time_evening'); }, start: '17:00', end: '22:00' },
  { get label() { return tr('tfeeds_easy_time_night'); }, start: '22:00', end: '05:00' },
  { get label() { return tr('tfeeds_easy_time_all'); } }
];

export const WEEKDAY_CHOICES: { label: string; days?: number[] }[] = [
  { get label() { return tr('tfeeds_easy_days_all'); } },
  { get label() { return tr('tfeeds_weekdays_weekday'); }, days: [1, 2, 3, 4, 5] },
  { get label() { return tr('tfeeds_weekdays_weekend'); }, days: [0, 6] }
];

const D = CUSTOM_FEED_DEFS;

export function authorLabel(did: string): string {
  if (!did) return tr('tfeeds_easy_author_unset');
  if (did === VIEWER_DID) return tr('tfeeds_easy_author_me');
  const p = getCachedProfile(did);
  return p?.handle ? `@${p.handle}` : `${did.slice(0, 16)}…`;
}

function languageLabel(codes: string[]): string {
  if (codes.length === 0) return tr('tfeeds_easy_lang_unset');
  return codes.map((c) => LANGUAGES.find((l) => l.code === c)?.label ?? c).join(tr('tfeeds_sep'));
}

export const EASY_CONDITIONS: EasyCondition[] = [
  {
    id: 'language',
    get menuLabel() { return tr('tfeeds_easy_c_language'); },
    make: () => ({ $type: D.predicateLanguage, codes: ['ja'] }),
    match: (p) => p.$type === D.predicateLanguage,
    label: (p) => (p.$type === D.predicateLanguage ? languageLabel(p.codes) : '')
  },
  {
    id: 'image',
    get menuLabel() { return tr('tfeeds_easy_c_image'); },
    make: () => ({ $type: D.predicateHasImage, value: true }),
    match: (p) => p.$type === D.predicateHasImage && p.value === true,
    label: () => tr('tfeeds_easy_c_image'),
    negLabel: () => tr('tfeeds_easy_c_image_neg')
  },
  {
    id: 'video',
    get menuLabel() { return tr('tfeeds_easy_c_video'); },
    make: () => ({ $type: D.predicateHasVideo, value: true }),
    match: (p) => p.$type === D.predicateHasVideo && p.value === true,
    label: () => tr('tfeeds_easy_c_video'),
    negLabel: () => tr('tfeeds_easy_c_video_neg')
  },
  {
    id: 'link',
    get menuLabel() { return tr('tfeeds_easy_c_link'); },
    make: () => ({ $type: D.predicateHasLink, value: true }),
    match: (p) => p.$type === D.predicateHasLink && p.value === true,
    label: () => tr('tfeeds_easy_c_link'),
    negLabel: () => tr('tfeeds_easy_c_link_neg')
  },
  {
    id: 'noReply',
    get menuLabel() { return tr('tfeeds_easy_c_no_reply_menu'); },
    make: () => ({ $type: D.predicateHasReply, value: false }),
    match: (p) => p.$type === D.predicateHasReply && p.value === false,
    label: () => tr('tfeeds_easy_c_no_reply'),
    negLabel: () => tr('tfeeds_easy_c_no_reply_neg')
  },
  {
    id: 'replyFollowing',
    get menuLabel() { return tr('tfeeds_easy_c_reply_following'); },
    make: () => ({ $type: D.predicateReplyToFollowing, value: true }),
    match: (p) => p.$type === D.predicateReplyToFollowing && p.value === true,
    label: () => tr('tfeeds_easy_c_reply_following'),
    negLabel: () => tr('tfeeds_easy_c_reply_following_neg')
  },
  {
    id: 'timeOfDay',
    get menuLabel() { return tr('tfeeds_easy_c_time_menu'); },
    make: () => ({ $type: D.predicateTimeOfDay, timezone: localTimeZone(), start: '22:00', end: '05:00' }),
    match: (p) => p.$type === D.predicateTimeOfDay,
    label: (p) => (p.$type === D.predicateTimeOfDay ? tr('tfeeds_easy_c_time', { time: timeOfDayLabel(p) }) : ''),
    negLabel: (p) => (p.$type === D.predicateTimeOfDay ? tr('tfeeds_easy_c_time_neg', { time: timeOfDayLabel(p) }) : '')
  },
  {
    id: 'noFlood',
    get menuLabel() { return tr('tfeeds_easy_c_no_flood_menu'); },
    make: () => ({ $type: D.predicateAuthorMaxPosts, max: 100, withinHours: 24 }),
    match: (p) => p.$type === D.predicateAuthorMaxPosts,
    label: (p) => (p.$type === D.predicateAuthorMaxPosts ? floodLabel(p) : ''),
    negLabel: (p) => (p.$type === D.predicateAuthorMaxPosts ? floodLabel(p, true) : '')
  },
  {
    id: 'noDuplicate',
    get menuLabel() { return tr('tfeeds_easy_c_no_dup_menu'); },
    make: () => ({ $type: D.predicateIsDuplicate, value: false }),
    match: (p) => p.$type === D.predicateIsDuplicate && p.value === false,
    label: () => tr('tfeeds_easy_c_no_dup'),
    negLabel: () => tr('tfeeds_easy_c_no_dup_neg')
  },
  {
    id: 'noAdult',
    get menuLabel() { return tr('tfeeds_easy_c_no_adult_menu'); },
    make: () => ({ $type: D.predicateHasLabel, value: false }),
    match: (p) => p.$type === D.predicateHasLabel && p.value === false && !p.labels,
    label: () => tr('tfeeds_easy_c_no_adult'),
    negLabel: () => tr('tfeeds_easy_c_no_adult_neg')
  },
  {
    id: 'minLikes',
    get menuLabel() { return tr('tfeeds_easy_c_min_likes_menu'); },
    make: () => ({ $type: D.predicateMinLikes, threshold: 10 }),
    match: (p) => p.$type === D.predicateMinLikes,
    label: (p) => (p.$type === D.predicateMinLikes ? tr('tfeeds_easy_c_min_likes', { n: p.threshold }) : ''),
    negLabel: (p) => (p.$type === D.predicateMinLikes ? tr('tfeeds_easy_c_min_likes_neg', { n: p.threshold }) : '')
  },
  {
    id: 'author',
    get menuLabel() { return tr('tfeeds_easy_c_author_menu'); },
    make: () => ({ $type: D.predicateAuthor, did: '' }),
    match: (p) => p.$type === D.predicateAuthor,
    label: (p) => (p.$type === D.predicateAuthor ? authorLabel(p.did) : ''),
    negLabel: (p) => (p.$type === D.predicateAuthor ? tr('tfeeds_easy_c_author_neg', { name: authorLabel(p.did) }) : '')
  },
  {
    id: 'keyword',
    get menuLabel() { return tr('tfeeds_easy_c_keyword_menu'); },
    make: () => ({ $type: D.predicateKeyword, value: '' }),
    match: (p) => p.$type === D.predicateKeyword && !p.exact && (p.target ?? 'text') === 'text',
    label: (p) =>
      p.$type === D.predicateKeyword ? (p.value.trim() ? tr('tfeeds_easy_c_keyword', { v: p.value.trim() }) : tr('tfeeds_easy_c_keyword_empty')) : '',
    negLabel: (p) =>
      p.$type === D.predicateKeyword ? (p.value.trim() ? tr('tfeeds_easy_c_keyword', { v: p.value.trim() }) : tr('tfeeds_easy_c_keyword_empty')) : ''
  }
];

export type Joiner = 'and' | 'or';

export interface FlatCond {
  pred: CustomFeedPredicate;

  negated: boolean;

  group: number;

  groupSize: number;
}

export function flattenConds(preds: PredicateOrGroup[]): FlatCond[] {
  const out: FlatCond[] = [];
  preds.forEach((p, group) => {
    const items = isOrGroup(p) ? p.items : [p];
    for (const leaf of items) out.push({ pred: leafPred(leaf), negated: isNegated(leaf), group, groupSize: items.length });
  });
  return out;
}

export function joinerAfter(preds: PredicateOrGroup[], i: number): Joiner {
  const flat = flattenConds(preds);
  return flat[i] && flat[i + 1] && flat[i].group === flat[i + 1].group ? 'or' : 'and';
}

function toGroups(preds: PredicateOrGroup[]): FilterLeaf[][] {
  return preds.map((p) => (isOrGroup(p) ? [...p.items] : [p]));
}

function fromGroups(groups: FilterLeaf[][]): PredicateOrGroup[] {
  return groups.filter((g) => g.length > 0).map((g) => (g.length === 1 ? g[0] : { kind: 'or' as const, items: g }));
}

function locate(groups: FilterLeaf[][], i: number): [number, number] | null {
  let n = i;
  for (let g = 0; g < groups.length; g++) {
    if (n < groups[g].length) return [g, n];
    n -= groups[g].length;
  }
  return null;
}

export function toggleJoiner(preds: PredicateOrGroup[], i: number): PredicateOrGroup[] {
  const groups = toGroups(preds);
  const at = locate(groups, i);
  if (!at || !locate(groups, i + 1)) return preds;
  const [g, k] = at;
  if (k < groups[g].length - 1) {
    groups.splice(g, 1, groups[g].slice(0, k + 1), groups[g].slice(k + 1));
  } else {
    groups.splice(g, 2, [...groups[g], ...groups[g + 1]]);
  }
  return fromGroups(groups);
}

export function replaceCond(preds: PredicateOrGroup[], i: number, p: CustomFeedPredicate): PredicateOrGroup[] {
  const groups = toGroups(preds);
  const at = locate(groups, i);
  if (!at) return preds;
  groups[at[0]][at[1]] = makeLeaf(p, isNegated(groups[at[0]][at[1]]));
  return fromGroups(groups);
}

export function setNegated(preds: PredicateOrGroup[], i: number, negated: boolean): PredicateOrGroup[] {
  const groups = toGroups(preds);
  const at = locate(groups, i);
  if (!at) return preds;
  groups[at[0]][at[1]] = makeLeaf(leafPred(groups[at[0]][at[1]]), negated);
  return fromGroups(groups);
}

export function removeCond(preds: PredicateOrGroup[], i: number): PredicateOrGroup[] {
  const groups = toGroups(preds);
  const at = locate(groups, i);
  if (!at) return preds;
  groups[at[0]].splice(at[1], 1);
  return fromGroups(groups);
}

export function appendCond(preds: PredicateOrGroup[], p: FilterLeaf, joiner: Joiner): PredicateOrGroup[] {
  const groups = toGroups(preds);
  if (joiner === 'or' && groups.length > 0) groups[groups.length - 1].push(p);
  else groups.push([p]);
  return fromGroups(groups);
}

export function defaultJoiner(preds: PredicateOrGroup[], next: FilterLeaf): Joiner {
  const flat = flattenConds(preds);
  const last = flat[flat.length - 1];
  const kw = (p: CustomFeedPredicate) => p.$type === D.predicateKeyword;
  return last && kw(last.pred) && !last.negated && kw(leafPred(next)) && !isNegated(next) ? 'or' : 'and';
}

export function easyConditionOf(p: PredicateOrGroup): EasyCondition | null {
  if (isOrGroup(p)) return null;
  const pred = leafPred(p);
  return EASY_CONDITIONS.find((c) => c.match(pred)) ?? null;
}

export function addableConditions(d: BuilderDraft): EasyCondition[] {
  const used = new Set(flattenConds(d.predicates).map((f) => easyConditionOf(f.pred)?.id).filter(Boolean));

  return EASY_CONDITIONS.filter((c) => c.id === 'keyword' || c.id === 'author' || !used.has(c.id));
}

export interface EasySortOption {
  sort: CustomFeedSort;
  label: string;

  windowed: boolean;
}

export const WINDOW_CHOICES: { value: string | undefined; label: string }[] = [
  { value: 'PT24H', label: '24h' },
  { value: 'P7D', label: '7d' },
  { value: 'P30D', label: '30d' },
  { value: undefined, get label() { return tr('tfeeds_window_all'); } }
];

export function easySorts(d: BuilderDraft): EasySortOption[] {
  const out: EasySortOption[] = [];
  if (d.source.kind === 'forYou') out.push({ sort: 'relevance', label: tr('tfeeds_sort_recommended'), windowed: false });
  out.push({ sort: 'chronological', label: tr('tfeeds_sort_chronological'), windowed: false });
  out.push({ sort: 'trending', label: tr('tfeeds_sort_trending'), windowed: false });
  out.push({ sort: 'likeCount', label: tr('tfeeds_easy_sort_likes'), windowed: true });
  out.push({ sort: 'repostCount', label: tr('tfeeds_easy_sort_reposts'), windowed: true });
  out.push({ sort: 'hotness', label: tr('tfeeds_easy_sort_hotness'), windowed: true });
  if (d.source.kind !== 'forYou' && hasKeyword(d)) {
    out.push({ sort: 'relevance', label: tr('tfeeds_sort_relevance'), windowed: true });
  }
  return out;
}

function hasKeyword(d: BuilderDraft): boolean {
  if (d.source.kind === 'search') return true;
  return flattenConds(d.predicates).some((f) => !f.negated && f.pred.$type === D.predicateKeyword);
}

export function easySortLabel(d: BuilderDraft): string {
  const opt = easySorts(d).find((o) => o.sort === d.sort);
  if (!opt) return tr('tfeeds_easy_sort_card');
  if (!opt.windowed) return opt.label;
  const w = WINDOW_CHOICES.find((c) => c.value === d.sortWindow);
  return tr('tfeeds_easy_sort_windowed', { label: opt.label, window: w?.label ?? d.sortWindow });
}

export type EasySupport = { ok: true } | { ok: false; reason: string };

export function easySupport(d: BuilderDraft): EasySupport {
  if (easySourceId(d.source) === null) {
    const what =
      d.source.kind === 'authors'
        ? tr('tfeeds_easy_no_src_authors')
        : d.source.kind === 'collection'
          ? tr('tfeeds_easy_no_src_collection')
          : tr('tfeeds_easy_no_src_advanced');
    return { ok: false, reason: tr('tfeeds_easy_no_source', { what }) };
  }
  if (d.source.kind === 'search' && d.source.exact) {
    return { ok: false, reason: tr('tfeeds_easy_no_exact') };
  }
  for (const p of d.predicates) {
    const items = isOrGroup(p) ? p.items : [p];
    if (isOrGroup(p) && items.length === 0) return { ok: false, reason: tr('tfeeds_easy_no_empty_or') };
    if (items.some((x) => !easyConditionOf(x))) return { ok: false, reason: tr('tfeeds_easy_no_cond') };
  }
  if (!easySorts(d).some((o) => o.sort === d.sort)) {
    return { ok: false, reason: tr('tfeeds_easy_no_sort') };
  }
  const opt = easySorts(d).find((o) => o.sort === d.sort)!;
  if (opt.windowed && !WINDOW_CHOICES.some((c) => c.value === d.sortWindow)) {
    return { ok: false, reason: tr('tfeeds_easy_no_window') };
  }
  if (d.sort === 'hotness' && d.hotnessHalflife && d.hotnessHalflife !== 'PT24H') {
    return { ok: false, reason: tr('tfeeds_easy_no_halflife') };
  }
  return { ok: true };
}

export type EasyToken =
  | { kind: 'source'; label: string }
  | { kind: 'cond'; index: number; label: string; negated: boolean }
  | { kind: 'join'; index: number; op: Joiner }
  | { kind: 'sort'; label: string }
  | { kind: 'text'; text: string };

export const JOINER_LABEL: Record<Joiner, string> = {
  get and() {
    return tr('tfeeds_join_and');
  },
  get or() {
    return tr('tfeeds_join_or');
  }
};

export function easySentence(d: BuilderDraft): EasyToken[] {
  const out: EasyToken[] = [{ kind: 'source', label: easySourceLabel(d.source) }];
  const flat = flattenConds(d.predicates);
  if (flat.length === 0) {
    out.push({ kind: 'text', text: tr('tfeeds_easy_s_posts_plain') });
  } else {
    out.push({ kind: 'text', text: tr('tfeeds_easy_s_of') });
    const groups = new Set(flat.map((f) => f.group)).size;
    const mixed = groups > 1 && flat.some((f) => f.groupSize > 1);
    const isKw = (i: number) => flat[i]?.pred.$type === D.predicateKeyword;
    const inParen = (i: number) => mixed && flat[i].groupSize > 1;

    const sharesSuffix = (i: number) =>
      isKw(i) &&
      isKw(i + 1) &&
      !flat[i].negated &&
      !flat[i + 1].negated &&
      (flat[i].group === flat[i + 1].group || (!inParen(i) && !inParen(i + 1)));
    flat.forEach((f, i) => {
      const c = easyConditionOf(f.pred);
      const first = i === 0 || flat[i - 1].group !== f.group;
      const last = i === flat.length - 1 || flat[i + 1].group !== f.group;
      if (mixed && f.groupSize > 1 && first) out.push({ kind: 'text', text: tr('tfeeds_paren_open') });
      out.push({ kind: 'cond', index: i, label: c ? condLabel(c, f.pred, f.negated) : '', negated: f.negated });

      const closeParen = mixed && f.groupSize > 1 && last;
      if (closeParen) out.push({ kind: 'text', text: tr('tfeeds_paren_close') });
      if (isKw(i) && !sharesSuffix(i)) out.push({ kind: 'text', text: tr(f.negated ? 'tfeeds_easy_s_not_contains' : 'tfeeds_easy_s_contains') });
      if (i < flat.length - 1) out.push({ kind: 'join', index: i, op: joinerAfter(d.predicates, i) });
    });
    out.push({ kind: 'text', text: tr(isKw(flat.length - 1) ? 'tfeeds_easy_s_posts_kw' : 'tfeeds_easy_s_posts') });
  }
  out.push({ kind: 'sort', label: easySortLabel(d) }, { kind: 'text', text: tr('tfeeds_easy_s_end') });
  return out;
}

export interface EasyUnit {
  key: string;
  tokens: EasyToken[];
}

function tokenKey(t: EasyToken, i: number): string {
  if (t.kind === 'cond') return `c${t.index}`;
  if (t.kind === 'join') return `j${t.index}`;
  return `${t.kind}${i}`;
}

export function easyUnits(tokens: EasyToken[]): EasyUnit[] {
  const units: EasyUnit[] = [];
  let pending: EasyToken[] = [];
  const open = tr('tfeeds_paren_open');
  tokens.forEach((t, i) => {
    if (t.kind === 'text' && t.text === open) {
      pending.push(t);
    } else if (t.kind === 'text' && units.length > 0 && pending.length === 0) {
      units[units.length - 1].tokens.push(t);
    } else {
      units.push({ key: tokenKey(t, i), tokens: [...pending, t] });
      pending = [];
    }
  });
  if (pending.length > 0) units.push({ key: 'tail', tokens: pending });
  return units;
}

export function easySentenceText(d: BuilderDraft): string {
  return easySentence(d)
    .map((t) => (t.kind === 'text' ? t.text : t.kind === 'join' ? JOINER_LABEL[t.op] : t.label))
    .join('');
}

export const MAX_PER_AUTHOR_CHOICES: (number | undefined)[] = [undefined, 1, 2, 3, 5];
