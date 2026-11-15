import { CUSTOM_FEED_DEFS as D } from '$lib/feedbuilder/types';

const TOP_KEYS = new Set([
  '$type',
  'name',
  'description',
  'avatar',
  'source',
  'filter',
  'sort',
  'sortWindow',
  'hotnessHalflife',
  'sortExpression',
  'visibility',
  'pinnedPosts',
  'contentMode',
  'maxPerAuthor',
  'hideSeen',
  'unlisted',
  'createdAt',
  'updatedAt'
]);

const SORTS = new Set([
  'chronological',
  'likeCount',
  'repostCount',
  'relevance',
  'hotness',
  'trending',
  'expression',
  'manual'
]);

const VALUE = ['value'];
const DID = ['did'];
const THRESHOLD = ['threshold'];

const PREDICATE_KEYS: Record<string, string[]> = {
  [D.predicateKeyword]: ['value', 'target', 'exact'],
  [D.predicateAuthor]: DID,
  [D.predicateHasImage]: VALUE,
  [D.predicateHasReply]: VALUE,
  [D.predicateHasQuote]: VALUE,
  [D.predicateHasVideo]: VALUE,
  [D.predicateHasLink]: VALUE,
  [D.predicateFirstPost]: VALUE,
  [D.predicateHasLabel]: ['value', 'labels'],
  [D.predicateMinLikes]: THRESHOLD,
  [D.predicateMinReposts]: THRESHOLD,
  [D.predicateMinReplies]: THRESHOLD,
  [D.predicateMinQuotes]: THRESHOLD,
  [D.predicateSince]: ['at'],
  [D.predicateUntil]: ['at'],
  [D.predicateLanguage]: ['codes'],
  [D.predicateMentions]: DID,
  [D.predicateDomain]: ['host'],
  [D.predicateTag]: ['tag'],
  [D.predicateVia]: VALUE,
  [D.predicateRegex]: ['pattern', 'caseSensitive', 'target'],
  [D.predicateImageClass]: ['class', 'minConfidence'],
  [D.predicateIsFromFollowing]: VALUE,
  [D.predicateIsMutual]: VALUE,
  [D.predicateInList]: ['list', 'value'],
  [D.predicateReplyTo]: DID,
  [D.predicateReplyToFollowing]: VALUE,
  [D.predicateQuotes]: DID,
  [D.predicateTimeOfDay]: ['timezone', 'start', 'end', 'weekdays'],
  [D.predicateAuthorMaxPosts]: ['max', 'withinHours', 'withinMinutes', 'mode'],
  [D.predicateIsDuplicate]: VALUE,
  [D.predicateInFeed]: ['feed', 'value']
};

const SOURCE_KEYS: Record<string, string[]> = {
  [D.sourceTimeline]: ['scope', 'includeReposts'],
  [D.sourceAuthors]: ['dids'],
  [D.sourceSearch]: ['query', 'exact'],
  [D.sourceCollection]: ['postUris'],
  [D.sourceFeed]: ['feed'],
  [D.sourceFollowingEngagement]: ['events', 'minActors', 'withinHours'],
  [D.sourceForYou]: ['events', 'withinHours'],
  [D.sourceFrom]: ['table', 'where', 'limit']
};

const ENUMS: Record<string, Record<string, unknown[]>> = {
  [D.predicateKeyword]: { target: ['text', 'alt', 'both'] },
  [D.predicateRegex]: { target: ['text', 'alt', 'both'] },
  [D.predicateImageClass]: { class: ['illustration', 'photo', 'screenshot', 'other'] },
  [D.predicateAuthorMaxPosts]: { mode: ['recent', 'burst'] },
  [D.sourceTimeline]: { scope: ['following', 'global'] }
};

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function onlyKeys(o: Obj, allowed: string[]): boolean {
  for (const k of Object.keys(o)) {
    if (k !== '$type' && !allowed.includes(k)) return false;
  }
  return true;
}

function enumsOk(o: Obj): boolean {
  const enums = ENUMS[o.$type as string];
  if (!enums) return true;
  for (const [k, values] of Object.entries(enums)) {
    if (o[k] !== undefined && !values.includes(o[k])) return false;
  }
  return true;
}

function eventsOk(o: Obj): boolean {
  const events = o.events;
  if (events === undefined) return true;
  return Array.isArray(events) && events.every((e) => e === 'like' || e === 'repost');
}

function filterNodeKnown(n: unknown): boolean {
  if (!isObj(n)) return false;
  if (n.$type === D.filterGroup) {
    if (!onlyKeys(n, ['op', 'items'])) return false;
    if (n.op !== 'and' && n.op !== 'or' && n.op !== 'not') return false;
    return Array.isArray(n.items) && n.items.every(filterNodeKnown);
  }
  const keys = PREDICATE_KEYS[n.$type as string];
  return keys !== undefined && onlyKeys(n, keys) && enumsOk(n);
}

function sourceKnown(s: unknown): boolean {
  if (!isObj(s)) return false;
  const keys = SOURCE_KEYS[s.$type as string];
  if (keys === undefined) return true;
  return onlyKeys(s, keys) && enumsOk(s) && eventsOk(s);
}

export function hasUnknownParts(record: unknown): boolean {
  if (!isObj(record)) return true;
  for (const k of Object.keys(record)) {
    if (!TOP_KEYS.has(k)) return true;
  }
  if (!SORTS.has(record.sort as string)) return true;
  if (record.visibility !== 'private' && record.visibility !== 'public') return true;
  if (record.contentMode !== undefined && record.contentMode !== 'default' && record.contentMode !== 'video') return true;
  if (!sourceKnown(record.source)) return true;
  if (record.filter !== undefined && !filterNodeKnown(record.filter)) return true;
  return false;
}
