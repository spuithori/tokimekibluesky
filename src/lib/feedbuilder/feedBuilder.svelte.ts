import { t as tr } from 'tokimeki-i18n';
import { CUSTOM_FEED_DEFS, VIEWER_DID, imageClassLabel, DEFAULT_IMAGE_CONFIDENCE } from '$lib/feedbuilder/types';
import { timeOfDayLabel } from './timeOfDay';
import { floodWindowLabel } from './floodWindow';
import type {
  CustomFeedDefinitionRecord,
  CustomFeedSource,
  CustomFeedSort,
  CustomFeedVisibility,
  CustomFeedPredicate,
  CustomFeedFilterGroup,
  SortExpression
} from '$lib/feedbuilder/types';
import { api, apiErrorMessage, type ExplainResult, type PreviewStats } from './api';
import { hasUnknownParts } from './knownShape';
import { session } from './session.svelte';
import { easySupport } from './easyMode';
import { squareAvatar, toBlobJson, type BlobJson } from './avatar';
import {
  addAnd,
  excludeAuthorLeaf,
  excludedAuthorIndex,
  filterToPredicates,
  isAndGroup,
  isNegated,
  isOrGroup,
  leavesOf,
  moveNode,
  predicatesToFilter,
  removeAt,
  setLeafAt,
  type DropTarget,
  type FilterLeaf,
  type NodeAddr,
  type OrItem,
  type PredicateOrGroup
} from './filterModel';

export {
  isAndGroup,
  isNegated,
  isOrGroup,
  leafPred,
  makeLeaf,
  type AndGroup,
  type FilterLeaf,
  type NegatedPredicate,
  type NodeAddr,
  type OrItem,
  type PredicateOrGroup
} from './filterModel';
import {
  customFeeds,
  generatorUri,
  previewKey,
  type CustomFeedEntry,
  type PreviewFeedItem
} from './customFeeds.svelte';

const PREVIEW_PAGE = 30;

const EMPTY_PREVIEW = () => ({
  loading: false,
  loadingMore: false,
  feed: [] as PreviewFeedItem[],
  cursor: undefined as string | undefined,
  error: null as string | null,
  stats: null as PreviewStats | null,
  missing: 0,
  ranAt: null as number | null
});

export type BuilderCardId =
  | 'name'
  | 'source'
  | 'filter'
  | 'sort'
  | 'visibility';

export type CardState = 'empty' | 'editing' | 'ok' | 'error';

export type BuilderMode = 'easy' | 'card' | 'json';

function initialMode(d: BuilderDraft): BuilderMode {
  return easySupport(d).ok ? 'easy' : 'card';
}

export interface CardDiag {
  cardId: BuilderCardId;
  astPath?: string;
  code?: string;
  message: string;
  suggestion?: string;
}

export type DraftSource =
  | { kind: 'timeline'; scope: 'global' | 'following'; includeReposts?: boolean }
  | { kind: 'authors'; dids: string[] }
  | { kind: 'search'; query: string; exact?: boolean }
  | { kind: 'collection'; postUris: string[] }
  | { kind: 'engagement'; events: ('like' | 'repost')[]; minActors: number; withinHours: number }
  | { kind: 'forYou'; events: ('like' | 'repost')[]; withinHours: number }
  | { kind: 'feed'; feed: string }
  | { kind: 'advanced'; raw: CustomFeedSource };

export type SourceKind = 'timeline' | 'authors' | 'search' | 'collection' | 'engagement' | 'forYou' | 'feed';

export const ENGAGEMENT_DEFAULT = { events: ['like', 'repost'] as ('like' | 'repost')[], minActors: 1, withinHours: 24 };
export const FOR_YOU_DEFAULT = { events: ['like', 'repost'] as ('like' | 'repost')[], withinHours: 24 };

export interface BuilderTemplate {
  id: string;
  label: string;
  description: string;
  seed: () => BuilderDraft;
}

export type DraftAvatar = { kind: 'stored'; blob: BlobJson } | { kind: 'new'; file: Blob; url: string };

export interface BuilderDraft {
  name: string;

  avatar?: DraftAvatar;

  description?: string;
  source: DraftSource;
  predicates: PredicateOrGroup[];
  sort: CustomFeedSort;

  sortWindow?: string;

  hotnessHalflife?: string;

  sortExpression?: SortExpression;
  visibility: CustomFeedVisibility;

  pinnedPosts?: string[];
  contentMode?: 'default' | 'video';
  maxPerAuthor?: number;
  hideSeen?: boolean;

  unlisted?: boolean;
}

export const DESCRIPTION_MAX = 300;

export function graphemeCount(s: string): number {
  let n = 0;
  for (const _ of new Intl.Segmenter('ja', { granularity: 'grapheme' }).segment(s)) n++;
  return n;
}

const EMPTY_DRAFT: BuilderDraft = {
  name: '',
  source: { kind: 'timeline', scope: 'global' },
  predicates: [],
  sort: 'chronological',
  visibility: 'private'
};

export type ExprPresetId = 'hotness' | 'reposts' | 'discussion' | 'freshPop';

export interface ExprPreset {
  id: ExprPresetId;
  label: string;
  description: string;
  ast: SortExpression;
}

const DAY = 86400;
const HOUR = 3600;

export const EXPR_PRESETS: ExprPreset[] = [
  {
    id: 'hotness',
    get label() {
      return tr('tfeeds_expr_hotness_label');
    },
    get description() {
      return tr('tfeeds_expr_hotness_desc');
    },
    ast: {
      op: 'mul',
      args: [
        { op: 'log1p', args: [{ col: 'likeCount' }] },
        { op: 'decay', args: [{ col: 'age' }, { lit: DAY }] }
      ]
    }
  },
  {
    id: 'reposts',
    get label() {
      return tr('tfeeds_expr_reposts_label');
    },
    get description() {
      return tr('tfeeds_expr_reposts_desc');
    },
    ast: {
      op: 'mul',
      args: [
        {
          op: 'log1p',
          args: [
            {
              op: 'add',
              args: [
                { col: 'likeCount' },
                { op: 'mul', args: [{ lit: 3 }, { col: 'repostCount' }] }
              ]
            }
          ]
        },
        { op: 'decay', args: [{ col: 'age' }, { lit: DAY }] }
      ]
    }
  },
  {
    id: 'discussion',
    get label() {
      return tr('tfeeds_expr_discussion_label');
    },
    get description() {
      return tr('tfeeds_expr_discussion_desc');
    },
    ast: {
      op: 'mul',
      args: [
        {
          op: 'log1p',
          args: [
            {
              op: 'add',
              args: [{ col: 'replyCount' }, { col: 'quoteCount' }]
            }
          ]
        },
        { op: 'decay', args: [{ col: 'age' }, { lit: DAY }] }
      ]
    }
  },
  {
    id: 'freshPop',
    get label() {
      return tr('tfeeds_expr_freshPop_label');
    },
    get description() {
      return tr('tfeeds_expr_freshPop_desc');
    },
    ast: {
      op: 'add',
      args: [
        { op: 'log1p', args: [{ col: 'likeCount' }] },
        {
          op: 'mul',
          args: [
            { lit: 5 },
            { op: 'decay', args: [{ col: 'age' }, { lit: HOUR }] }
          ]
        }
      ]
    }
  }
];

function findPresetIdByAst(ast: SortExpression | undefined): ExprPresetId | null {
  if (!ast) return null;
  const key = JSON.stringify(ast);
  for (const p of EXPR_PRESETS) {
    if (JSON.stringify(p.ast) === key) return p.id;
  }
  return null;
}

export function exprPresetIdFromAst(
  ast: SortExpression | undefined
): ExprPresetId | null {
  return findPresetIdByAst(ast);
}

export const PINNED_MAX = 3;

const placeholderName = () => tr('tfeeds_placeholder_name');

export function draftAllowsRelevance(d: BuilderDraft): boolean {
  return d.source.kind === 'forYou' || draftHasKeyword(d);
}

export function draftHasKeyword(d: BuilderDraft): boolean {
  if (d.source.kind === 'search') return true;

  const isKw = (l: FilterLeaf) => !isNegated(l) && l.$type === CUSTOM_FEED_DEFS.predicateKeyword;
  return d.predicates.some((p) => leavesOf(p).some(isKw));
}

export function draftIsCorrelated(d: BuilderDraft): boolean {
  return d.source.kind === 'advanced' && d.source.raw.$type === CUSTOM_FEED_DEFS.sourceCorrelated;
}

export function isScoreSort(sort: CustomFeedSort): boolean {
  return sort === 'likeCount' || sort === 'repostCount' || sort === 'hotness' || sort === 'trending';
}

export function acceptsSortWindow(sort: CustomFeedSort): boolean {
  return isScoreSort(sort) || sort === 'relevance' || sort === 'expression';
}

export function acceptsHalflife(sort: CustomFeedSort): boolean {
  return sort === 'hotness';
}

export function draftToRecord(
  d: BuilderDraft
): Omit<CustomFeedDefinitionRecord, 'createdAt' | 'updatedAt'> {
  let source: CustomFeedSource;
  switch (d.source.kind) {
    case 'timeline':
      source = {
        $type: CUSTOM_FEED_DEFS.sourceTimeline,
        scope: d.source.scope,
        ...(d.source.includeReposts === false ? { includeReposts: false } : {})
      };
      break;
    case 'authors':
      source = { $type: CUSTOM_FEED_DEFS.sourceAuthors, dids: d.source.dids };
      break;
    case 'search':
      source = {
        $type: CUSTOM_FEED_DEFS.sourceSearch,
        query: d.source.query,
        ...(d.source.exact ? { exact: true } : {})
      };
      break;
    case 'collection':
      source = { $type: CUSTOM_FEED_DEFS.sourceCollection, postUris: d.source.postUris };
      break;
    case 'feed':
      source = { $type: CUSTOM_FEED_DEFS.sourceFeed, feed: d.source.feed };
      break;
    case 'engagement':
      source = {
        $type: CUSTOM_FEED_DEFS.sourceFollowingEngagement,
        events: d.source.events,
        minActors: d.source.minActors,
        withinHours: d.source.withinHours
      };
      break;
    case 'forYou':
      source = { $type: CUSTOM_FEED_DEFS.sourceForYou, events: d.source.events, withinHours: d.source.withinHours };
      break;
    case 'advanced':
      source = d.source.raw;
      break;
  }
  const filter = predicatesToFilter(d.predicates);

  const sortWindow =
    acceptsSortWindow(d.sort) ? d.sortWindow : undefined;
  const hotnessHalflife =
    acceptsHalflife(d.sort) ? d.hotnessHalflife : undefined;
  const sortExpression = d.sort === 'expression' ? d.sortExpression : undefined;
  return {
    name: d.name,
    ...(d.description !== undefined ? { description: d.description } : {}),

    ...(d.avatar?.kind === 'stored' ? { avatar: d.avatar.blob } : {}),
    source,
    ...(filter !== undefined ? { filter } : {}),
    sort: d.sort,
    ...(sortWindow !== undefined ? { sortWindow } : {}),
    ...(hotnessHalflife !== undefined ? { hotnessHalflife } : {}),
    ...(sortExpression !== undefined ? { sortExpression } : {}),
    visibility: d.visibility,
    ...(d.pinnedPosts && d.pinnedPosts.length > 0 ? { pinnedPosts: d.pinnedPosts } : {}),
    ...(d.contentMode === 'video' ? { contentMode: 'video' as const } : {}),
    ...(d.maxPerAuthor !== undefined ? { maxPerAuthor: d.maxPerAuthor } : {}),
    ...(d.hideSeen ? { hideSeen: true } : {}),
    ...(d.unlisted ? { unlisted: true } : {})
  };
}

export function recordToDraft(
  r: CustomFeedDefinitionRecord
): BuilderDraft | null {
  if (hasUnknownParts(r)) return null;
  if (r.sort === 'expression' && findPresetIdByAst(r.sortExpression) === null) {
    return null;
  }
  let source: DraftSource;
  switch (r.source.$type) {
    case CUSTOM_FEED_DEFS.sourceTimeline:
      source = {
        kind: 'timeline',
        scope: r.source.scope,
        ...(r.source.includeReposts === false ? { includeReposts: false } : {})
      };
      break;
    case CUSTOM_FEED_DEFS.sourceAuthors:
      source = { kind: 'authors', dids: r.source.dids };
      break;
    case CUSTOM_FEED_DEFS.sourceSearch:
      source = {
        kind: 'search',
        query: r.source.query,
        ...(r.source.exact ? { exact: true } : {})
      };
      break;
    case CUSTOM_FEED_DEFS.sourceCollection:
      source = { kind: 'collection', postUris: r.source.postUris };
      break;
    case CUSTOM_FEED_DEFS.sourceFeed:
      source = { kind: 'feed', feed: r.source.feed };
      break;
    case CUSTOM_FEED_DEFS.sourceFollowingEngagement:
      source = {
        kind: 'engagement',
        events: r.source.events?.length ? r.source.events : ENGAGEMENT_DEFAULT.events,
        minActors: r.source.minActors ?? ENGAGEMENT_DEFAULT.minActors,
        withinHours: r.source.withinHours ?? ENGAGEMENT_DEFAULT.withinHours
      };
      break;
    case CUSTOM_FEED_DEFS.sourceForYou:
      source = {
        kind: 'forYou',
        events: r.source.events?.length ? r.source.events : FOR_YOU_DEFAULT.events,
        withinHours: r.source.withinHours ?? FOR_YOU_DEFAULT.withinHours
      };
      break;
    case CUSTOM_FEED_DEFS.sourceFrom:

      if (r.source.where === undefined && r.source.limit === undefined) {
        source = {
          kind: 'timeline',
          scope: 'global',
          includeReposts: false
        };
      } else {
        source = { kind: 'advanced', raw: r.source };
      }
      break;
    default:

      source = { kind: 'advanced', raw: r.source };
      break;
  }
  const predicates = filterToPredicates(r.filter as Parameters<typeof filterToPredicates>[0]);
  if (predicates === null) return null;
  const avatar = toBlobJson(r.avatar);
  return {
    name: r.name,
    ...(avatar ? { avatar: { kind: 'stored' as const, blob: avatar } } : {}),
    ...(r.description !== undefined ? { description: r.description } : {}),
    source,
    predicates,
    sort: r.sort,
    ...(r.sortWindow !== undefined ? { sortWindow: r.sortWindow } : {}),
    ...(r.hotnessHalflife !== undefined
      ? { hotnessHalflife: r.hotnessHalflife }
      : {}),
    ...(r.sortExpression !== undefined
      ? { sortExpression: r.sortExpression }
      : {}),
    visibility: r.visibility,
    ...(r.pinnedPosts !== undefined ? { pinnedPosts: r.pinnedPosts } : {}),
    ...(r.contentMode !== undefined ? { contentMode: r.contentMode } : {}),
    ...(r.maxPerAuthor !== undefined ? { maxPerAuthor: r.maxPerAuthor } : {}),
    ...(r.hideSeen ? { hideSeen: true } : {}),
    ...(r.unlisted ? { unlisted: true } : {})
  };
}

export const BUILDER_TEMPLATES: BuilderTemplate[] = [
  {
    id: 'global',
    get label() {
      return tr('tfeeds_tpl_global_label');
    },
    get description() {
      return tr('tfeeds_tpl_global_desc');
    },
    seed: () => ({
      ...EMPTY_DRAFT,
      name: tr('tfeeds_tpl_global_name'),
      source: { kind: 'timeline', scope: 'global' },
      predicates: [],
      visibility: 'private'
    })
  },
  {
    id: 'photos',
    get label() {
      return tr('tfeeds_tpl_photos_label');
    },
    get description() {
      return tr('tfeeds_tpl_photos_desc');
    },
    seed: () => ({
      ...EMPTY_DRAFT,
      name: tr('tfeeds_tpl_photos_name'),
      source: { kind: 'timeline', scope: 'global' },
      predicates: [
        { $type: CUSTOM_FEED_DEFS.predicateHasImage, value: true }
      ],
      visibility: 'private'
    })
  },
  {
    id: 'videos',
    get label() {
      return tr('tfeeds_tpl_videos_label');
    },
    get description() {
      return tr('tfeeds_tpl_videos_desc');
    },
    seed: () => ({
      ...EMPTY_DRAFT,
      name: tr('tfeeds_tpl_videos_name'),
      source: { kind: 'timeline', scope: 'global' },
      predicates: [
        { $type: CUSTOM_FEED_DEFS.predicateHasVideo, value: true },
        { $type: CUSTOM_FEED_DEFS.predicateHasLabel, value: false }
      ],
      visibility: 'private',
      contentMode: 'video'
    })
  },
  {
    id: 'following',
    get label() {
      return tr('tfeeds_tpl_following_label');
    },
    get description() {
      return tr('tfeeds_tpl_following_desc');
    },
    seed: () => ({
      ...EMPTY_DRAFT,
      name: tr('tfeeds_tpl_following_name'),
      source: { kind: 'timeline', scope: 'following' },
      predicates: [
        {
          kind: 'or',
          items: [
            { $type: CUSTOM_FEED_DEFS.predicateHasReply, value: false },
            { $type: CUSTOM_FEED_DEFS.predicateReplyToFollowing, value: true }
          ]
        }
      ],
      visibility: 'public'
    })
  },
  {
    id: 'aboutMe',
    get label() {
      return tr('tfeeds_tpl_aboutMe_label');
    },
    get description() {
      return tr('tfeeds_tpl_aboutMe_desc');
    },
    seed: () => ({
      ...EMPTY_DRAFT,
      name: tr('tfeeds_tpl_aboutMe_name'),
      source: { kind: 'timeline', scope: 'global' },
      predicates: [
        {
          kind: 'or',
          items: [
            { $type: CUSTOM_FEED_DEFS.predicateReplyTo, did: VIEWER_DID },
            { $type: CUSTOM_FEED_DEFS.predicateQuotes, did: VIEWER_DID },
            { $type: CUSTOM_FEED_DEFS.predicateMentions, did: VIEWER_DID }
          ]
        }
      ],
      visibility: 'public'
    })
  },
  {
    id: 'cleanHot',
    get label() {
      return tr('tfeeds_tpl_cleanHot_label');
    },
    get description() {
      return tr('tfeeds_tpl_cleanHot_desc');
    },
    seed: () => ({
      ...EMPTY_DRAFT,
      name: tr('tfeeds_tpl_cleanHot_name'),
      source: { kind: 'timeline', scope: 'global' },
      predicates: [
        { $type: CUSTOM_FEED_DEFS.predicateAuthorMaxPosts, max: 100, withinHours: 24 },
        { $type: CUSTOM_FEED_DEFS.predicateIsDuplicate, value: false },
        { $type: CUSTOM_FEED_DEFS.predicateHasLabel, value: false }
      ],
      sort: 'hotness',
      sortWindow: 'PT24H',
      visibility: 'private',
      maxPerAuthor: 2
    })
  },
  {
    id: 'lateNight',
    get label() {
      return tr('tfeeds_tpl_lateNight_label');
    },
    get description() {
      return tr('tfeeds_tpl_lateNight_desc');
    },
    seed: () => ({
      ...EMPTY_DRAFT,
      name: tr('tfeeds_tpl_lateNight_name'),
      source: { kind: 'timeline', scope: 'global' },
      predicates: [
        { $type: CUSTOM_FEED_DEFS.predicateLanguage, codes: ['ja'] },
        { $type: CUSTOM_FEED_DEFS.predicateTimeOfDay, timezone: 'Asia/Tokyo', start: '22:00', end: '05:00' },
        { $type: CUSTOM_FEED_DEFS.predicateIsDuplicate, value: false }
      ],
      visibility: 'private'
    })
  },
  {
    id: 'trending',
    get label() {
      return tr('tfeeds_tpl_trending_label');
    },
    get description() {
      return tr('tfeeds_tpl_trending_desc');
    },
    seed: () => ({
      ...EMPTY_DRAFT,
      name: tr('tfeeds_tpl_trending_name'),
      source: { kind: 'timeline', scope: 'global' },
      predicates: [],
      sort: 'trending',
      sortWindow: 'PT24H',
      visibility: 'private',
      hideSeen: true
    })
  },
  {
    id: 'forYou',
    get label() {
      return tr('tfeeds_tpl_forYou_label');
    },
    get description() {
      return tr('tfeeds_tpl_forYou_desc');
    },
    seed: () => ({
      ...EMPTY_DRAFT,
      name: tr('tfeeds_tpl_forYou_name'),
      source: { kind: 'forYou', ...FOR_YOU_DEFAULT },
      predicates: [],
      sort: 'relevance',
      visibility: 'private',
      hideSeen: true,
      maxPerAuthor: 2
    })
  },
  {
    id: 'friendsLiked',
    get label() {
      return tr('tfeeds_tpl_friendsLiked_label');
    },
    get description() {
      return tr('tfeeds_tpl_friendsLiked_desc');
    },
    seed: () => ({
      ...EMPTY_DRAFT,
      name: tr('tfeeds_tpl_friendsLiked_name'),
      source: { kind: 'engagement', ...ENGAGEMENT_DEFAULT },
      predicates: [{ $type: CUSTOM_FEED_DEFS.predicateIsFromFollowing, value: false }],
      sort: 'likeCount',
      sortWindow: 'PT24H',
      visibility: 'private'
    })
  },
  {
    id: 'authors',
    get label() {
      return tr('tfeeds_tpl_authors_label');
    },
    get description() {
      return tr('tfeeds_tpl_authors_desc');
    },
    seed: () => ({
      ...EMPTY_DRAFT,
      name: tr('tfeeds_tpl_authors_name'),
      source: { kind: 'authors', dids: [] },
      predicates: [],
      visibility: 'private'
    })
  },
  {
    id: 'collection',
    get label() {
      return tr('tfeeds_tpl_collection_label');
    },
    get description() {
      return tr('tfeeds_tpl_collection_desc');
    },
    seed: () => ({
      ...EMPTY_DRAFT,
      name: tr('tfeeds_tpl_collection_name'),
      source: { kind: 'collection', postUris: [] },
      predicates: [],
      visibility: 'public'
    })
  }
];

function mapAstPathToCard(path: string | undefined): BuilderCardId | null {
  if (!path) return null;
  if (path.startsWith('name')) return 'name';
  if (path.startsWith('source')) return 'source';
  if (path.startsWith('filter')) return 'filter';
  if (path.startsWith('sort')) return 'sort';
  if (path.startsWith('visibility')) return 'visibility';
  if (path.startsWith('pinnedPosts') || path.startsWith('contentMode') || path.startsWith('hideSeen')) return 'visibility';
  if (path.startsWith('maxPerAuthor')) return 'sort';
  return null;
}

class FeedBuilderStore {
  draft = $state<BuilderDraft>({ ...EMPTY_DRAFT });

  mode = $state<BuilderMode>('easy');

  originalUri = $state<string | null>(null);

  locked = $state<boolean>(false);

  activeCardId = $state<BuilderCardId | null>(null);
  diagnostics = $state<CardDiag[]>([]);
  jsonText = $state<string>('');
  jsonError = $state<string | null>(null);
  saving = $state<boolean>(false);
  validating = $state<boolean>(false);

  globalError = $state<CardDiag | null>(null);
  preview = $state<{
    loading: boolean;
    loadingMore: boolean;
    feed: PreviewFeedItem[];
    cursor?: string;
    error: string | null;
    stats: PreviewStats | null;

    missing: number;

    ranAt: number | null;
  }>(EMPTY_PREVIEW());

  #debounceTimer: ReturnType<typeof setTimeout> | null = null;
  #previewTimer: ReturnType<typeof setTimeout> | null = null;

  autoPreviewPending = $state<boolean>(false);

  cardStates: Record<BuilderCardId, CardState> = $derived.by(() => {
    const d = this.draft;
    const byCard = new Map<BuilderCardId, CardState>();

    const assign = (id: BuilderCardId, next: CardState) => {
      const cur = byCard.get(id) ?? 'empty';
      const rank = { empty: 0, editing: 1, ok: 2, error: 3 } as const;
      if (rank[next] > rank[cur]) byCard.set(id, next);
    };

    if (d.name.trim()) assign('name', 'ok');
    if (sourceIsFilled(d.source)) assign('source', 'ok');
    else assign('source', 'editing');
    if (d.predicates.length > 0) assign('filter', 'ok');
    assign('sort', 'ok');
    assign('visibility', 'ok');
    if (this.activeCardId) assign(this.activeCardId, 'editing');
    for (const diag of this.diagnostics) {
      byCard.set(diag.cardId, 'error');
    }
    return {
      name: byCard.get('name') ?? 'empty',
      source: byCard.get('source') ?? 'empty',
      filter: byCard.get('filter') ?? 'empty',
      sort: byCard.get('sort') ?? 'empty',
      visibility: byCard.get('visibility') ?? 'empty'
    };
  });

  canPreview = $derived.by(() => {
    if (this.diagnostics.length > 0 || this.globalError !== null) return false;
    if (this.mode === 'json') return this.jsonText.trim().length > 0 && this.jsonError === null;
    return sourceIsFilled(this.draft.source);
  });

  descriptionLength = $derived(graphemeCount(this.draft.description ?? ''));
  descriptionTooLong = $derived(this.descriptionLength > DESCRIPTION_MAX);

  saveBlockedReason = $derived.by(() => {
    if (this.canSave || this.saving) return null;
    if (this.diagnostics.length > 0 || this.globalError !== null) return tr('tfeeds_save_blocked_error');
    if (this.mode !== 'json' && !this.draft.name.trim()) return tr('tfeeds_save_blocked_name');
    if (this.mode !== 'json' && !sourceIsFilled(this.draft.source)) return tr('tfeeds_save_blocked_source');
    if (this.mode !== 'json' && this.descriptionTooLong) return tr('tfeeds_save_blocked_description', { max: DESCRIPTION_MAX });
    return tr('tfeeds_save_blocked_empty');
  });

  #previewPayload(): Record<string, unknown> | null {
    const base = this.mode !== 'json' ? draftToRecord(this.draft) : this.tryParseJson();
    if (!base) return null;
    const rec = base as Record<string, unknown>;
    const name = typeof rec.name === 'string' ? rec.name.trim() : '';
    return name ? rec : { ...rec, name: placeholderName() };
  }

  canSave = $derived.by(() => {
    if (this.saving) return false;
    if (this.diagnostics.length > 0 || this.globalError !== null) return false;
    if (this.mode === 'json') {
      return this.jsonText.trim().length > 0 && this.jsonError === null;
    }
    return (
      this.draft.name.trim().length > 0 && sourceIsFilled(this.draft.source) && !this.descriptionTooLong
    );
  });

  reset(): void {
    this.#revokeAvatarUrl();
    this.draft = { ...EMPTY_DRAFT };
    this.mode = 'easy';
    this.originalUri = null;
    this.locked = false;
    this.activeCardId = null;
    this.diagnostics = [];
    this.globalError = null;
    this.jsonText = '';
    this.jsonError = null;
    this.preview = EMPTY_PREVIEW();
  }

  loadFromTemplate(templateId: string): void {
    const t = BUILDER_TEMPLATES.find((x) => x.id === templateId);
    if (!t) return;
    this.draft = t.seed();
    this.mode = initialMode(this.draft);
    this.originalUri = null;
    this.locked = false;
    this.diagnostics = [];
    this.preview = EMPTY_PREVIEW();
    this.scheduleValidate();
  }

  pendingOpen = false;

  loadAsNew(record: CustomFeedDefinitionRecord): void {
    const { avatar: _a, unlisted: _u, ...rest } = record;
    this.#revokeAvatarUrl();
    this.originalUri = null;
    this.#loadRecord({ ...rest, name: Array.from(tr('tfeeds_copy_name', { name: record.name })).slice(0, 64).join('') });
    this.pendingOpen = true;
  }

  loadFromEntry(entry: CustomFeedEntry): void {
    this.originalUri = entry.uri;
    this.#loadRecord(entry.record);

    if (!this.draft.avatar && entry.generatorAvatar) {
      this.draft = { ...this.draft, avatar: { kind: 'stored', blob: entry.generatorAvatar } };
    }
  }

  async setAvatar(file: Blob): Promise<void> {
    const blob = await squareAvatar(file);
    this.#revokeAvatarUrl();
    this.draft = { ...this.draft, avatar: { kind: 'new', file: blob, url: URL.createObjectURL(blob) } };
  }

  clearAvatar(): void {
    this.#revokeAvatarUrl();
    this.draft = { ...this.draft, avatar: undefined };
  }

  #revokeAvatarUrl(): void {
    if (this.draft.avatar?.kind === 'new') URL.revokeObjectURL(this.draft.avatar.url);
  }

  restoreVersion(record: CustomFeedDefinitionRecord): void {
    this.#loadRecord(record);
  }

  #loadRecord(record: CustomFeedDefinitionRecord): void {
    const entry = { record };
    const decoded = recordToDraft(entry.record);
    if (decoded) {
      this.draft = decoded;
      this.mode = initialMode(decoded);
      this.locked = false;
    } else {
      this.draft = { ...EMPTY_DRAFT, name: entry.record.name };
      const { createdAt: _c, updatedAt: _u, ...editable } = entry.record;
      this.jsonText = JSON.stringify(editable, null, 2);
      this.mode = 'json';
      this.locked = true;
    }
    this.diagnostics = [];
    this.preview = EMPTY_PREVIEW();
    this.scheduleValidate();
  }

  setName(value: string): void {
    this.draft = { ...this.draft, name: value };
    this.activeCardId = 'name';
    this.scheduleValidate();
  }

  setDescription(value: string): void {
    const { description: _d, ...rest } = this.draft;
    this.draft = value === '' ? rest : { ...rest, description: value };
    this.activeCardId = 'name';
    this.scheduleValidate();
  }

  setSource(next: DraftSource): void {
    let sort = this.draft.sort;
    let sortWindow = this.draft.sortWindow;
    let hotnessHalflife = this.draft.hotnessHalflife;
    const nextDraft = { ...this.draft, source: next };
    if (draftIsCorrelated(nextDraft) && isScoreSort(sort)) {
      sort = 'chronological';
      sortWindow = undefined;
      hotnessHalflife = undefined;
    }
    if (sort === 'relevance' && !draftAllowsRelevance(nextDraft)) {
      sort = 'chronological';
      sortWindow = undefined;
    }
    if (sort === 'manual' && next.kind !== 'collection') {
      sort = 'chronological';
      sortWindow = undefined;
    }
    this.draft = { ...this.draft, source: next, sort, sortWindow, hotnessHalflife };
    this.activeCardId = 'source';
    this.scheduleValidate();
  }

  setSourceKind(kind: SourceKind): void {
    if (this.draft.source.kind === kind) return;
    switch (kind) {
      case 'timeline':
        this.setSource({ kind: 'timeline', scope: 'global' });
        break;
      case 'authors':
        this.setSource({ kind: 'authors', dids: [] });
        break;
      case 'search':
        this.setSource({ kind: 'search', query: '' });
        break;
      case 'collection':
        this.setSource({ kind: 'collection', postUris: [] });
        break;
      case 'engagement':
        this.setSource({ kind: 'engagement', ...ENGAGEMENT_DEFAULT });
        break;
      case 'forYou':
        this.setSource({ kind: 'forYou', ...FOR_YOU_DEFAULT });
        break;
      case 'feed':
        this.setSource({ kind: 'feed', feed: '' });
        break;
    }
  }

  setSort(sort: CustomFeedSort): void {
    let sortWindow: string | undefined;
    if (isScoreSort(sort) || sort === 'expression') {
      sortWindow = this.draft.sortWindow ?? 'PT24H';
    } else if (sort === 'relevance') {
      sortWindow = this.draft.sortWindow;
    } else {
      sortWindow = undefined;
    }

    const hotnessHalflife = acceptsHalflife(sort)
      ? this.draft.hotnessHalflife ?? 'PT24H'
      : undefined;

    let sortExpression = this.draft.sortExpression;
    if (sort === 'expression' && !sortExpression) {
      sortExpression = EXPR_PRESETS[0].ast;
    } else if (sort !== 'expression') {
      sortExpression = undefined;
    }
    this.draft = { ...this.draft, sort, sortWindow, hotnessHalflife, sortExpression };
    this.scheduleValidate();
  }

  setSortWindow(window: string | undefined): void {
    this.draft = { ...this.draft, sortWindow: window };
    this.scheduleValidate();
  }

  setMaxPerAuthor(n: number | undefined): void {
    this.draft = { ...this.draft, maxPerAuthor: n };
    this.scheduleValidate();
  }

  setHideSeen(on: boolean): void {
    this.draft = { ...this.draft, hideSeen: on ? true : undefined };
    this.scheduleValidate();
  }

  setHotnessHalflife(halflife: string | undefined): void {
    this.draft = { ...this.draft, hotnessHalflife: halflife };
    this.scheduleValidate();
  }

  setExpressionPreset(id: ExprPresetId): void {
    const preset = EXPR_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    this.draft = {
      ...this.draft,
      sort: 'expression',
      sortExpression: preset.ast,
      sortWindow: this.draft.sortWindow ?? 'PT24H'
    };
    this.scheduleValidate();
  }

  setUnlisted(on: boolean): void {
    this.draft = { ...this.draft, unlisted: on ? true : undefined };
    this.scheduleValidate();
  }

  setVisibility(v: CustomFeedVisibility): void {
    this.draft = { ...this.draft, visibility: v };
    this.scheduleValidate();
  }

  setContentMode(mode: 'default' | 'video'): void {
    this.draft = { ...this.draft, contentMode: mode === 'video' ? 'video' : undefined };
    this.scheduleValidate();
  }

  togglePin(uri: string): boolean {
    const cur = this.draft.pinnedPosts ?? [];
    if (cur.includes(uri)) {
      this.setPinnedPosts(cur.filter((u) => u !== uri));
      return true;
    }
    if (cur.length >= PINNED_MAX) return false;
    this.setPinnedPosts([...cur, uri]);
    return true;
  }

  setPinnedPosts(uris: string[]): void {
    this.draft = { ...this.draft, pinnedPosts: uris.length > 0 ? uris : undefined };
    this.scheduleValidate();
  }

  addPredicate(p: FilterLeaf): void {
    this.draft = { ...this.draft, predicates: [...this.draft.predicates, p] };
    this.activeCardId = 'filter';
    this.scheduleValidate();
  }

  updatePredicate(index: number, p: FilterLeaf): void {
    const next = [...this.draft.predicates];
    next[index] = p;
    this.draft = { ...this.draft, predicates: next };
    this.scheduleValidate();
  }

  setPredicates(predicates: PredicateOrGroup[]): void {
    this.draft = { ...this.draft, predicates };
    this.activeCardId = 'filter';
    this.scheduleValidate();
  }

  excludeAuthor(did: string): boolean {
    if (excludedAuthorIndex(this.draft.predicates, did) >= 0) return false;
    this.addPredicate(excludeAuthorLeaf(did));
    return true;
  }

  unexcludeAuthor(did: string): void {
    const i = excludedAuthorIndex(this.draft.predicates, did);
    if (i >= 0) this.removePredicate(i);
  }

  moveCondition(from: NodeAddr, to: DropTarget): boolean {
    const next = moveNode(this.draft.predicates, from, to);
    if (!next) return false;
    this.setPredicates(next);
    return true;
  }

  removePredicate(index: number): void {
    const next = this.draft.predicates.filter((_, i) => i !== index);
    this.draft = { ...this.draft, predicates: next };
    this.scheduleValidate();
  }

  addOrGroup(seed: FilterLeaf, ...rest: FilterLeaf[]): void {
    const group: PredicateOrGroup = { kind: 'or', items: [seed, ...rest] };
    this.draft = { ...this.draft, predicates: [...this.draft.predicates, group] };
    this.activeCardId = 'filter';
    this.scheduleValidate();
  }

  addToOrGroup(groupIndex: number, p: FilterLeaf): void {
    const current = this.draft.predicates[groupIndex];
    if (!current || !isOrGroup(current)) return;
    const next = [...this.draft.predicates];
    next[groupIndex] = { kind: 'or', items: [...current.items, p] };
    this.draft = { ...this.draft, predicates: next };
    this.activeCardId = 'filter';
    this.scheduleValidate();
  }

  updateConditionAt(addr: NodeAddr, p: FilterLeaf): void {
    this.draft = { ...this.draft, predicates: setLeafAt(this.draft.predicates, addr, p) };
    this.scheduleValidate();
  }

  removeConditionAt(addr: NodeAddr): void {
    this.draft = { ...this.draft, predicates: removeAt(this.draft.predicates, addr) };
    this.scheduleValidate();
  }

  addAndCondition(groupIndex: number, childIndex: number, p: FilterLeaf): void {
    this.draft = { ...this.draft, predicates: addAnd(this.draft.predicates, groupIndex, childIndex, p) };
    this.activeCardId = 'filter';
    this.scheduleValidate();
  }

  setActiveCard(id: BuilderCardId | null): void {
    this.activeCardId = id;
  }

  setMode(next: BuilderMode): string | null {
    if (next === this.mode) return null;
    if (next === 'json') {
      this.jsonText = JSON.stringify(draftToRecord(this.draft), null, 2);
      this.jsonError = null;
      this.mode = 'json';
      return null;
    }
    let draft = this.draft;
    if (this.mode === 'json') {
      const parsed = this.tryParseJson();
      if (!parsed) return this.jsonError ?? tr('tfeeds_json_unreadable');
      const decoded = recordToDraft(parsed as CustomFeedDefinitionRecord);
      if (!decoded) {
        const msg = tr('tfeeds_json_only');
        this.jsonError = msg;
        this.locked = true;
        return msg;
      }

      if (this.draft.avatar?.kind === 'new' && !decoded.avatar) decoded.avatar = this.draft.avatar;
      draft = decoded;
    }
    if (next === 'easy') {
      const support = easySupport(draft);
      if (!support.ok) return tr('tfeeds_easy_unsupported', { reason: support.reason });
    }
    const fromJson = this.mode === 'json';
    this.draft = draft;
    this.mode = next;
    this.locked = false;
    this.jsonError = null;
    if (fromJson) this.scheduleValidate();
    return null;
  }

  setJsonText(text: string): void {
    this.jsonText = text;
    this.jsonError = null;
  }

  tryParseJson(): Partial<CustomFeedDefinitionRecord> | null {
    try {
      const parsed = JSON.parse(this.jsonText);
      if (typeof parsed !== 'object' || parsed === null) {
        this.jsonError = tr('tfeeds_json_not_object');
        return null;
      }
      return parsed as Partial<CustomFeedDefinitionRecord>;
    } catch (e) {
      this.jsonError = tr('tfeeds_json_invalid', { message: e instanceof Error ? e.message : String(e) });
      return null;
    }
  }

  scheduleValidate(): void {
    if (this.#debounceTimer) clearTimeout(this.#debounceTimer);
    this.#debounceTimer = setTimeout(() => {
      this.validateNow()
        .then(() => this.#maybeRunAutoPreview())
        .catch(() => {});
    }, 350);

    this.autoPreviewPending = true;
  }

  #maybeRunAutoPreview(): void {
    if (this.#previewTimer) clearTimeout(this.#previewTimer);
    if (!this.canPreview) {
      this.autoPreviewPending = false;
      return;
    }
    this.autoPreviewPending = true;
    this.#previewTimer = setTimeout(() => {
      this.autoPreviewPending = false;
      this.runPreview().catch(() => {});
    }, 500);
  }

  async validateNow(): Promise<void> {
    const base = this.#previewPayload();
    if (!base) return;

    const payload = { ...base, createdAt: new Date().toISOString() };
    this.validating = true;
    try {
      const res = await api.validate(payload);
      if (res.valid) {
        this.diagnostics = [];
        this.globalError = null;
      } else {
        const cardId = mapAstPathToCard(res.error.astPath);
        const diag: CardDiag = {
          cardId: cardId ?? 'name',
          astPath: res.error.astPath,
          code: res.error.code,
          message: res.error.message,
          suggestion: res.error.suggestion
        };
        if (cardId) {
          this.diagnostics = [diag];
          this.globalError = null;
        } else {
          this.diagnostics = [];
          this.globalError = diag;
        }
      }
    } catch (err) {
      console.error('[feedBuilder] validate failed:', err);
      this.diagnostics = [];
      this.globalError = null;
    } finally {
      this.validating = false;
    }
  }

  async save(): Promise<CustomFeedEntry | null> {
    if (!this.canSave) return null;

    if (this.mode !== 'json' && this.draft.avatar?.kind === 'new') {
      const agent = session.agent;
      if (!agent) throw new Error(tr('tfeeds_err_login_required'));
      this.saving = true;
      try {
        const file = this.draft.avatar.file;
        const res = await agent.uploadBlob(await file.arrayBuffer(), file.type || 'image/jpeg');
        const blob = toBlobJson(res.blob);
        if (!blob) throw new Error(tr('tfeeds_err_avatar_upload'));
        this.#revokeAvatarUrl();
        this.draft = { ...this.draft, avatar: { kind: 'stored', blob } };
      } finally {
        this.saving = false;
      }
    }
    const record =
      this.mode !== 'json'
        ? draftToRecord(this.draft)
        : (this.tryParseJson() as Omit<CustomFeedDefinitionRecord, 'createdAt' | 'updatedAt'>);
    if (!record) return null;
    this.saving = true;
    try {
      if (this.originalUri) {
        const existing = customFeeds.items.find((e) => e.uri === this.originalUri)?.record;
        const merged: CustomFeedDefinitionRecord = {
          ...(record as CustomFeedDefinitionRecord),
          createdAt: existing?.createdAt ?? new Date().toISOString()
        };
        return await customFeeds.update(this.originalUri, merged, { fromBuilder: true });
      }
      const created = await customFeeds.create(
        record as Omit<CustomFeedDefinitionRecord, 'createdAt' | 'updatedAt'>
      );
      this.originalUri = created.uri;
      return created;
    } finally {
      this.saving = false;
    }
  }

  async runPreview(): Promise<void> {
    const payload = this.#previewPayload();
    if (!payload) return;
    this.preview = { ...this.preview, loading: true, error: null };
    try {
      const record = payload as unknown as CustomFeedDefinitionRecord;
      const res = await customFeeds.execute({ record }, { limit: PREVIEW_PAGE });
      this.preview = {
        loading: false,
        loadingMore: false,
        feed: res.feed,
        cursor: res.cursor,
        error: null,
        stats: res.stats,
        missing: res.missing,
        ranAt: Date.now()
      };
    } catch (err) {
      this.preview = {
        ...this.preview,
        loading: false,
        feed: [],
        cursor: undefined,
        stats: null,
        missing: 0,
        error: apiErrorMessage(err)
      };
    }
  }

  explain = $state<{
    uri: string;
    loading: boolean;
    error: string | null;
    result: ExplainResult | null;
    payload: Record<string, unknown> | null;
  } | null>(null);

  async explainPost(uri: string): Promise<void> {
    const payload = this.#previewPayload();
    if (!payload) {
      this.explain = { uri, loading: false, error: tr('tfeeds_err_cannot_build'), result: null, payload: null };
      return;
    }
    this.explain = { uri, loading: true, error: null, result: null, payload };

    const rkey = this.originalUri?.split('/').pop();
    const feed = rkey && session.did ? generatorUri(session.did, rkey) : null;
    try {
      const result = await api.explain(payload, uri, { feed });
      if (this.explain?.uri === uri) this.explain = { uri, loading: false, error: null, result, payload };
    } catch (err) {
      if (this.explain?.uri === uri) {
        this.explain = { uri, loading: false, error: apiErrorMessage(err), result: null, payload };
      }
    }
  }

  async loadMorePreview(): Promise<void> {
    const cursor = this.preview.cursor;
    if (!cursor || this.preview.loadingMore || this.preview.loading) return;
    const payload = this.#previewPayload();
    if (!payload) return;
    this.preview = { ...this.preview, loadingMore: true };
    try {
      const record = payload as unknown as CustomFeedDefinitionRecord;
      const res = await customFeeds.execute({ record }, { limit: PREVIEW_PAGE, cursor });
      const seen = new Set(this.preview.feed.map(previewKey));
      this.preview = {
        ...this.preview,
        loadingMore: false,
        feed: [...this.preview.feed, ...res.feed.filter((f) => !seen.has(previewKey(f)))],
        cursor: res.cursor,
        missing: this.preview.missing + res.missing
      };
    } catch (err) {
      this.preview = {
        ...this.preview,
        loadingMore: false,
        error: apiErrorMessage(err)
      };
    }
  }
}

export function draftSummary(d: BuilderDraft): string {
  const source = describeSource(d.source);
  const filter = d.predicates.length > 0 ? describePredicates(d.predicates) : '';
  const sort =
    d.sort === 'relevance' && d.source.kind === 'forYou'
      ? tr('tfeeds_sort_recommended')
      : describeSort(d.sort, d.sortWindow, d.hotnessHalflife, d.sortExpression);
  if (filter) {
    const joiner = /む$/.test(filter) ? '' : tr('tfeeds_summary_joiner');
    return tr('tfeeds_summary_filtered', { source, filter, joiner, sort });
  }
  return tr('tfeeds_summary_plain', { source, sort });
}

function describeSort(
  sort: CustomFeedSort,
  sortWindow: string | undefined,
  hotnessHalflife: string | undefined,
  sortExpression: SortExpression | undefined
): string {
  switch (sort) {
    case 'chronological':
      return tr('tfeeds_sort_chronological');
    case 'likeCount':
      return tr('tfeeds_sort_likes') + windowSuffix(sortWindow);
    case 'repostCount':
      return tr('tfeeds_sort_reposts') + windowSuffix(sortWindow);
    case 'relevance':
      return tr('tfeeds_sort_relevance') + windowSuffix(sortWindow);
    case 'hotness':
      return tr('tfeeds_sort_hotness_halflife', { halflife: humanDuration(hotnessHalflife ?? 'PT24H') }) + windowSuffix(sortWindow);
    case 'trending':
      return tr('tfeeds_sort_trending') + windowSuffix(sortWindow);
    case 'expression': {
      const preset = EXPR_PRESETS.find(
        (p) => p.id === findPresetIdByAst(sortExpression)
      );
      const label = preset ? tr('tfeeds_sort_preset', { label: preset.label }) : tr('tfeeds_sort_custom_expr');
      return `${label}${windowSuffix(sortWindow)}`;
    }
    case 'manual':

      return tr('tfeeds_sort_manual');
  }
}

function windowSuffix(w: string | undefined): string {
  if (!w) return tr('tfeeds_window_suffix_all');
  return tr('tfeeds_window_suffix', { label: humanDuration(w) });
}

function humanDuration(iso: string): string {
  switch (iso) {
    case 'PT1H':
      return tr('tfeeds_dur_hours', { n: 1 });
    case 'PT6H':
      return tr('tfeeds_dur_hours', { n: 6 });
    case 'PT24H':
    case 'P1D':
      return tr('tfeeds_dur_hours', { n: 24 });
    case 'P7D':
    case 'PT168H':
      return tr('tfeeds_dur_days', { n: 7 });
    case 'P30D':
    case 'PT720H':
      return tr('tfeeds_dur_days', { n: 30 });
  }
  return iso;
}

function eventsLabel(events: ('like' | 'repost')[]): string {
  if (events.includes('like') && events.includes('repost')) return tr('tfeeds_events_both');
  return events.includes('like') ? tr('tfeeds_events_like') : tr('tfeeds_events_repost');
}

export function describeEngagement(s: { events: ('like' | 'repost')[]; minActors: number; withinHours: number }): string {
  const who = s.minActors > 1 ? tr('tfeeds_engagement_who_n', { n: s.minActors }) : tr('tfeeds_engagement_who');
  return tr('tfeeds_engagement_desc', { who, hours: s.withinHours, what: eventsLabel(s.events) });
}

export function describeForYou(s: { events: ('like' | 'repost')[]; withinHours: number }): string {
  return tr('tfeeds_for_you_desc', { hours: s.withinHours, what: eventsLabel(s.events) });
}

function describeSource(s: DraftSource): string {
  switch (s.kind) {
    case 'timeline':
      return s.scope === 'global' ? tr('tfeeds_src_global') : tr('tfeeds_src_following');
    case 'authors':
      return s.dids.length > 0
        ? tr('tfeeds_src_authors_n', { n: s.dids.length })
        : tr('tfeeds_src_authors_empty');
    case 'search':
      return s.query.trim().length > 0
        ? tr('tfeeds_easy_src_search_q', { q: s.query })
        : tr('tfeeds_src_search_empty');
    case 'collection':
      return s.postUris.length > 0
        ? tr('tfeeds_src_collection_n', { n: s.postUris.length })
        : tr('tfeeds_src_collection_empty');
    case 'engagement':
      return describeEngagement(s);
    case 'forYou':
      return describeForYou(s);
    case 'feed':
      return s.feed ? tr('tfeeds_p_in_feed') : tr('tfeeds_p_feed_unset');
    case 'advanced':
      return tr('tfeeds_src_advanced');
  }
}

function describePredicates(preds: PredicateOrGroup[]): string {
  return preds
    .map((p) => {
      if (isOrGroup(p)) {
        if (p.items.length === 0) return tr('tfeeds_or_empty');
        return '(' + p.items.map(orItemLabel).join(tr('tfeeds_summary_or')) + ')';
      }
      return leafLabel(p);
    })
    .join(tr('tfeeds_summary_and'));
}

function orItemLabel(item: OrItem): string {
  return isAndGroup(item) ? '(' + item.items.map(leafLabel).join(tr('tfeeds_summary_and')) + ')' : leafLabel(item);
}

function targetLabel(t: string | undefined): string {
  return t === 'alt' ? tr('tfeeds_p_target_alt') : t === 'both' ? tr('tfeeds_p_target_both') : '';
}

export function leafLabel(l: FilterLeaf): string {
  if (!isNegated(l)) return predicateLabel(l);
  const p = l.item;
  if (p.$type === CUSTOM_FEED_DEFS.predicateKeyword) {
    return p.value ? tr('tfeeds_p_keyword_neg', { target: targetLabel(p.target), v: p.value }) : tr('tfeeds_p_keyword_unset_neg');
  }
  return tr('tfeeds_easy_except', { label: predicateLabel(p) });
}

export function predicateLabel(p: CustomFeedPredicate): string {
  switch (p.$type) {
    case CUSTOM_FEED_DEFS.predicateKeyword:
      return p.value ? tr('tfeeds_p_keyword', { target: targetLabel(p.target), v: p.value }) : tr('tfeeds_p_keyword_unset');
    case CUSTOM_FEED_DEFS.predicateAuthor:
      return p.did === VIEWER_DID ? tr('tfeeds_p_author_me') : p.did ? tr('tfeeds_p_author', { who: `${p.did.slice(0, 16)}…` }) : tr('tfeeds_p_author_unset');
    case CUSTOM_FEED_DEFS.predicateReplyTo:
      return p.did === VIEWER_DID ? tr('tfeeds_p_reply_to_me') : p.did ? tr('tfeeds_p_reply_to', { who: `${p.did.slice(0, 16)}…` }) : tr('tfeeds_p_reply_to_unset');
    case CUSTOM_FEED_DEFS.predicateReplyToFollowing:
      return p.value ? tr('tfeeds_p_reply_following') : tr('tfeeds_p_reply_not_following');
    case CUSTOM_FEED_DEFS.predicateTimeOfDay:
      return timeOfDayLabel(p);
    case CUSTOM_FEED_DEFS.predicateAuthorMaxPosts:
      return p.mode === 'burst'
        ? tr('tfeeds_p_flood_burst', { w: floodWindowLabel(p), max: p.max })
        : tr('tfeeds_p_flood_recent', { w: floodWindowLabel(p), max: p.max });
    case CUSTOM_FEED_DEFS.predicateInFeed:
      return p.feed ? (p.value ? tr('tfeeds_p_in_feed') : tr('tfeeds_p_not_in_feed')) : tr('tfeeds_p_feed_unset');
    case CUSTOM_FEED_DEFS.predicateIsDuplicate:
      return p.value ? tr('tfeeds_p_dup') : tr('tfeeds_p_dup_first');
    case CUSTOM_FEED_DEFS.predicateQuotes:
      return p.did === VIEWER_DID ? tr('tfeeds_p_quotes_me') : p.did ? tr('tfeeds_p_quotes', { who: `${p.did.slice(0, 16)}…` }) : tr('tfeeds_p_quotes_unset');
    case CUSTOM_FEED_DEFS.predicateHasImage:
      return p.value ? tr('tfeeds_p_image') : tr('tfeeds_easy_c_image_neg');
    case CUSTOM_FEED_DEFS.predicateImageClass:
      return tr('tfeeds_p_image_class', { label: imageClassLabel(p.class), n: p.minConfidence ?? DEFAULT_IMAGE_CONFIDENCE });
    case CUSTOM_FEED_DEFS.predicateHasReply:
      return p.value ? tr('tfeeds_p_reply') : tr('tfeeds_p_reply_neg');
    case CUSTOM_FEED_DEFS.predicateHasQuote:
      return p.value ? tr('tfeeds_p_quote') : tr('tfeeds_p_quote_neg');
    case CUSTOM_FEED_DEFS.predicateHasVideo:
      return p.value ? tr('tfeeds_p_video') : tr('tfeeds_easy_c_video_neg');
    case CUSTOM_FEED_DEFS.predicateInList:
      return p.list ? (p.value ? tr('tfeeds_p_in_list') : tr('tfeeds_p_not_in_list')) : tr('tfeeds_p_list_unset');
    case CUSTOM_FEED_DEFS.predicateHasLink:
      return p.value ? tr('tfeeds_p_link') : tr('tfeeds_easy_c_link_neg');
    case CUSTOM_FEED_DEFS.predicateFirstPost:
      return p.value ? tr('tfeeds_p_first_post') : tr('tfeeds_p_first_post_neg');
    case CUSTOM_FEED_DEFS.predicateHasLabel:
      return p.value ? tr('tfeeds_p_label') : tr('tfeeds_easy_c_no_adult_menu');
    case CUSTOM_FEED_DEFS.predicateMinLikes:
      return tr('tfeeds_p_min_likes', { n: p.threshold });
    case CUSTOM_FEED_DEFS.predicateMinReposts:
      return tr('tfeeds_p_min_reposts', { n: p.threshold });
    case CUSTOM_FEED_DEFS.predicateMinReplies:
      return tr('tfeeds_p_min_replies', { n: p.threshold });
    case CUSTOM_FEED_DEFS.predicateMinQuotes:
      return tr('tfeeds_p_min_quotes', { n: p.threshold });
    case CUSTOM_FEED_DEFS.predicateSince:
      return tr('tfeeds_p_since', { at: p.at || tr('tfeeds_unset') });
    case CUSTOM_FEED_DEFS.predicateUntil:
      return tr('tfeeds_p_until', { at: p.at || tr('tfeeds_unset') });
    case CUSTOM_FEED_DEFS.predicateLanguage:
      return p.codes.length > 0 ? tr('tfeeds_p_language', { codes: p.codes.join('/') }) : tr('tfeeds_p_language_unset');
    case CUSTOM_FEED_DEFS.predicateMentions:
      return p.did === VIEWER_DID ? tr('tfeeds_p_mentions_me') : p.did ? tr('tfeeds_p_mentions', { who: `${p.did.slice(0, 16)}…` }) : tr('tfeeds_p_mentions_unset');
    case CUSTOM_FEED_DEFS.predicateDomain:
      return p.host ? tr('tfeeds_p_domain', { host: p.host }) : tr('tfeeds_p_domain_unset');
    case CUSTOM_FEED_DEFS.predicateTag:
      return p.tag ? `#${p.tag}` : tr('tfeeds_p_tag_unset');
    case CUSTOM_FEED_DEFS.predicateRegex:
      return p.pattern ? tr('tfeeds_p_regex', { pattern: p.pattern }) : tr('tfeeds_p_regex_unset');
    case CUSTOM_FEED_DEFS.predicateVia:
      return p.value?.trim() ? tr('tfeeds_p_via', { v: p.value.trim() }) : tr('tfeeds_p_via_any');
    case CUSTOM_FEED_DEFS.predicateIsFromFollowing:
      return p.value ? tr('tfeeds_easy_src_following') : tr('tfeeds_p_not_following');
    case CUSTOM_FEED_DEFS.predicateIsMutual:
      return p.value ? tr('tfeeds_p_mutual') : tr('tfeeds_p_not_mutual');
  }
}

function sourceIsFilled(s: DraftSource): boolean {
  switch (s.kind) {
    case 'timeline':
      return true;
    case 'authors':
      return s.dids.length > 0;
    case 'search':
      return s.query.trim().length > 0;
    case 'collection':
      return s.postUris.length > 0;
    case 'engagement':
    case 'forYou':
      return s.events.length > 0;
    case 'feed':
      return s.feed.length > 0;
    case 'advanced':
      return true;
  }
}

export const feedBuilder = new FeedBuilderStore();
