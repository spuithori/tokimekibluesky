import { t } from 'tokimeki-i18n';

export interface ProfileViewBasic {
  did: string;
  handle: string;
  displayName?: string;
  avatar?: string;
}

export interface ProfileViewDetailed extends ProfileViewBasic {
  description?: string;
}

export interface PostView {
  uri: string;
  cid: string;
  author: ProfileViewBasic;
  record: { text?: string; createdAt?: string; [k: string]: unknown };
  embed?: unknown;
  replyCount?: number;
  repostCount?: number;
  likeCount?: number;
  quoteCount?: number;
  indexedAt: string;
  [k: string]: unknown;
}

export const CUSTOM_FEED_DEFS = {
  filterGroup: 'tech.tokimeki.feeds.defs#filterGroup',
  predicateKeyword: 'tech.tokimeki.feeds.defs#predicateKeyword',
  predicateAuthor: 'tech.tokimeki.feeds.defs#predicateAuthor',
  predicateHasImage: 'tech.tokimeki.feeds.defs#predicateHasImage',
  predicateHasReply: 'tech.tokimeki.feeds.defs#predicateHasReply',
  predicateHasQuote: 'tech.tokimeki.feeds.defs#predicateHasQuote',
  predicateHasVideo: 'tech.tokimeki.feeds.defs#predicateHasVideo',
  predicateHasLink: 'tech.tokimeki.feeds.defs#predicateHasLink',
  predicateFirstPost: 'tech.tokimeki.feeds.defs#predicateFirstPost',
  predicateHasLabel: 'tech.tokimeki.feeds.defs#predicateHasLabel',
  predicateMinLikes: 'tech.tokimeki.feeds.defs#predicateMinLikes',
  predicateMinReposts: 'tech.tokimeki.feeds.defs#predicateMinReposts',
  predicateMinReplies: 'tech.tokimeki.feeds.defs#predicateMinReplies',
  predicateMinQuotes: 'tech.tokimeki.feeds.defs#predicateMinQuotes',
  predicateSince: 'tech.tokimeki.feeds.defs#predicateSince',
  predicateUntil: 'tech.tokimeki.feeds.defs#predicateUntil',
  predicateLanguage: 'tech.tokimeki.feeds.defs#predicateLanguage',
  predicateMentions: 'tech.tokimeki.feeds.defs#predicateMentions',
  predicateDomain: 'tech.tokimeki.feeds.defs#predicateDomain',
  predicateTag: 'tech.tokimeki.feeds.defs#predicateTag',
  predicateVia: 'tech.tokimeki.feeds.defs#predicateVia',
  predicateRegex: 'tech.tokimeki.feeds.defs#predicateRegex',
  predicateImageClass: 'tech.tokimeki.feeds.defs#predicateImageClass',
  predicateIsFromFollowing: 'tech.tokimeki.feeds.defs#predicateIsFromFollowing',
  predicateIsMutual: 'tech.tokimeki.feeds.defs#predicateIsMutual',
  predicateInList: 'tech.tokimeki.feeds.defs#predicateInList',
  predicateReplyTo: 'tech.tokimeki.feeds.defs#predicateReplyTo',
  predicateReplyToFollowing: 'tech.tokimeki.feeds.defs#predicateReplyToFollowing',
  predicateQuotes: 'tech.tokimeki.feeds.defs#predicateQuotes',
  predicateTimeOfDay: 'tech.tokimeki.feeds.defs#predicateTimeOfDay',
  predicateAuthorMaxPosts: 'tech.tokimeki.feeds.defs#predicateAuthorMaxPosts',
  predicateIsDuplicate: 'tech.tokimeki.feeds.defs#predicateIsDuplicate',
  predicateInFeed: 'tech.tokimeki.feeds.defs#predicateInFeed',
  sourceFeed: 'tech.tokimeki.feeds.defs#sourceFeed',
  sourceTimeline: 'tech.tokimeki.feeds.defs#sourceTimeline',
  sourceAuthors: 'tech.tokimeki.feeds.defs#sourceAuthors',
  sourceSearch: 'tech.tokimeki.feeds.defs#sourceSearch',
  sourceCollection: 'tech.tokimeki.feeds.defs#sourceCollection',
  sourceFrom: 'tech.tokimeki.feeds.defs#sourceFrom',
  sourceCorrelated: 'tech.tokimeki.feeds.defs#sourceCorrelated',
  sourceUnion: 'tech.tokimeki.feeds.defs#sourceUnion',
  sourceFollowingEngagement: 'tech.tokimeki.feeds.defs#sourceFollowingEngagement',
  sourceForYou: 'tech.tokimeki.feeds.defs#sourceForYou',
  eventReposts: 'tech.tokimeki.feeds.defs#eventReposts',
  eventLikes: 'tech.tokimeki.feeds.defs#eventLikes',
  eventPosts: 'tech.tokimeki.feeds.defs#eventPosts',
  eventFollows: 'tech.tokimeki.feeds.defs#eventFollows',
  scanPosts: 'tech.tokimeki.feeds.defs#scanPosts',
  scanLikes: 'tech.tokimeki.feeds.defs#scanLikes',
  scanReposts: 'tech.tokimeki.feeds.defs#scanReposts',
  windowNone: 'tech.tokimeki.feeds.defs#windowNone',
  windowBetweenBaseEvents: 'tech.tokimeki.feeds.defs#windowBetweenBaseEvents',
  windowDuration: 'tech.tokimeki.feeds.defs#windowDuration',
  windowFixed: 'tech.tokimeki.feeds.defs#windowFixed',
  includeBaseSubject: 'tech.tokimeki.feeds.defs#includeBaseSubject',
  includeBaseActor: 'tech.tokimeki.feeds.defs#includeBaseActor',
  definitionView: 'tech.tokimeki.feeds.defs#definitionView'
} as const;

export interface CustomFeedFilterGroup {
  $type: typeof CUSTOM_FEED_DEFS.filterGroup;
  op: 'and' | 'or' | 'not';
  items: Array<CustomFeedFilterGroup | CustomFeedPredicate>;
}

export interface CustomFeedPredicateKeyword {
  $type: typeof CUSTOM_FEED_DEFS.predicateKeyword;
  value: string;

  target?: CustomFeedTextTarget;

  exact?: boolean;
}
export interface CustomFeedPredicateAuthor {
  $type: typeof CUSTOM_FEED_DEFS.predicateAuthor;
  did: string;
}
export interface CustomFeedPredicateHasImage {
  $type: typeof CUSTOM_FEED_DEFS.predicateHasImage;
  value: boolean;
}
export interface CustomFeedPredicateHasReply {
  $type: typeof CUSTOM_FEED_DEFS.predicateHasReply;
  value: boolean;
}
export interface CustomFeedPredicateHasQuote {
  $type: typeof CUSTOM_FEED_DEFS.predicateHasQuote;
  value: boolean;
}
export interface CustomFeedPredicateMinLikes {
  $type: typeof CUSTOM_FEED_DEFS.predicateMinLikes;
  threshold: number;
}
export interface CustomFeedPredicateMinReposts {
  $type: typeof CUSTOM_FEED_DEFS.predicateMinReposts;
  threshold: number;
}
export interface CustomFeedPredicateMinReplies {
  $type: typeof CUSTOM_FEED_DEFS.predicateMinReplies;
  threshold: number;
}
export interface CustomFeedPredicateMinQuotes {
  $type: typeof CUSTOM_FEED_DEFS.predicateMinQuotes;
  threshold: number;
}
export interface CustomFeedPredicateSince {
  $type: typeof CUSTOM_FEED_DEFS.predicateSince;
  at: string;
}
export interface CustomFeedPredicateUntil {
  $type: typeof CUSTOM_FEED_DEFS.predicateUntil;
  at: string;
}
export interface CustomFeedPredicateLanguage {
  $type: typeof CUSTOM_FEED_DEFS.predicateLanguage;
  codes: string[];
}
export interface CustomFeedPredicateMentions {
  $type: typeof CUSTOM_FEED_DEFS.predicateMentions;
  did: string;
}
export interface CustomFeedPredicateDomain {
  $type: typeof CUSTOM_FEED_DEFS.predicateDomain;
  host: string;
}
export interface CustomFeedPredicateTag {
  $type: typeof CUSTOM_FEED_DEFS.predicateTag;
  tag: string;
}

export interface CustomFeedPredicateVia {
  $type: typeof CUSTOM_FEED_DEFS.predicateVia;
  value?: string;
}

export type CustomFeedImageClass = 'illustration' | 'photo' | 'screenshot' | 'other';
export const IMAGE_CLASSES: CustomFeedImageClass[] = ['illustration', 'photo', 'screenshot', 'other'];
export function imageClassLabel(c: string): string {
  return (IMAGE_CLASSES as string[]).includes(c) ? t(`tfeeds_image_class_${c}`) : c;
}

export const DEFAULT_IMAGE_CONFIDENCE = 70;

export interface CustomFeedPredicateImageClass {
  $type: typeof CUSTOM_FEED_DEFS.predicateImageClass;
  class: CustomFeedImageClass;
  minConfidence?: number;
}

export interface CustomFeedPredicateRegex {
  $type: typeof CUSTOM_FEED_DEFS.predicateRegex;
  pattern: string;
  caseSensitive?: boolean;

  target?: CustomFeedTextTarget;
}

export type CustomFeedTextTarget = 'text' | 'alt' | 'both';
export interface CustomFeedPredicateHasVideo {
  $type: typeof CUSTOM_FEED_DEFS.predicateHasVideo;
  value: boolean;
}
export interface CustomFeedPredicateHasLink {
  $type: typeof CUSTOM_FEED_DEFS.predicateHasLink;
  value: boolean;
}

export interface CustomFeedPredicateFirstPost {
  $type: typeof CUSTOM_FEED_DEFS.predicateFirstPost;
  value: boolean;
}

export interface CustomFeedPredicateHasLabel {
  $type: typeof CUSTOM_FEED_DEFS.predicateHasLabel;
  value: boolean;
  labels?: string[];
}

export interface CustomFeedPredicateInList {
  $type: typeof CUSTOM_FEED_DEFS.predicateInList;
  list: string;
  value: boolean;
}
export interface CustomFeedPredicateIsFromFollowing {
  $type: typeof CUSTOM_FEED_DEFS.predicateIsFromFollowing;
  value: boolean;
}

export interface CustomFeedPredicateIsMutual {
  $type: typeof CUSTOM_FEED_DEFS.predicateIsMutual;
  value: boolean;
}

export const VIEWER_DID = '$viewer.did';

export interface CustomFeedPredicateReplyTo {
  $type: typeof CUSTOM_FEED_DEFS.predicateReplyTo;
  did: string;
}

export interface CustomFeedPredicateReplyToFollowing {
  $type: typeof CUSTOM_FEED_DEFS.predicateReplyToFollowing;
  value: boolean;
}

export interface CustomFeedPredicateQuotes {
  $type: typeof CUSTOM_FEED_DEFS.predicateQuotes;
  did: string;
}

export interface CustomFeedPredicateTimeOfDay {
  $type: typeof CUSTOM_FEED_DEFS.predicateTimeOfDay;
  timezone?: string;

  start?: string;

  end?: string;
  weekdays?: number[];
}

export interface CustomFeedPredicateAuthorMaxPosts {
  $type: typeof CUSTOM_FEED_DEFS.predicateAuthorMaxPosts;
  max: number;
  withinHours?: number;
  withinMinutes?: number;
  mode?: 'recent' | 'burst';
}

export interface CustomFeedPredicateIsDuplicate {
  $type: typeof CUSTOM_FEED_DEFS.predicateIsDuplicate;
  value: boolean;
}

export interface CustomFeedPredicateInFeed {
  $type: typeof CUSTOM_FEED_DEFS.predicateInFeed;
  feed: string;
  value: boolean;
}

export type CustomFeedPredicate =
  | CustomFeedPredicateInFeed
  | CustomFeedPredicateAuthorMaxPosts
  | CustomFeedPredicateIsDuplicate
  | CustomFeedPredicateTimeOfDay
  | CustomFeedPredicateReplyTo
  | CustomFeedPredicateReplyToFollowing
  | CustomFeedPredicateQuotes
  | CustomFeedPredicateKeyword
  | CustomFeedPredicateAuthor
  | CustomFeedPredicateHasImage
  | CustomFeedPredicateHasReply
  | CustomFeedPredicateHasQuote
  | CustomFeedPredicateHasVideo
  | CustomFeedPredicateHasLink
  | CustomFeedPredicateFirstPost
  | CustomFeedPredicateHasLabel
  | CustomFeedPredicateMinLikes
  | CustomFeedPredicateMinReposts
  | CustomFeedPredicateMinReplies
  | CustomFeedPredicateMinQuotes
  | CustomFeedPredicateSince
  | CustomFeedPredicateUntil
  | CustomFeedPredicateLanguage
  | CustomFeedPredicateMentions
  | CustomFeedPredicateDomain
  | CustomFeedPredicateTag
  | CustomFeedPredicateVia
  | CustomFeedPredicateRegex
  | CustomFeedPredicateImageClass
  | CustomFeedPredicateIsFromFollowing
  | CustomFeedPredicateIsMutual
  | CustomFeedPredicateInList;

export interface CustomFeedSourceTimeline {
  $type: typeof CUSTOM_FEED_DEFS.sourceTimeline;
  scope: 'following' | 'global';

  includeReposts?: boolean;
}
export interface CustomFeedSourceAuthors {
  $type: typeof CUSTOM_FEED_DEFS.sourceAuthors;
  dids: string[];
}
export interface CustomFeedSourceSearch {
  $type: typeof CUSTOM_FEED_DEFS.sourceSearch;
  query: string;

  exact?: boolean;
}
export interface CustomFeedSourceCollection {
  $type: typeof CUSTOM_FEED_DEFS.sourceCollection;
  postUris: string[];
}

export interface CustomFeedSourceFollowingEngagement {
  $type: typeof CUSTOM_FEED_DEFS.sourceFollowingEngagement;

  events?: ('like' | 'repost')[];

  minActors?: number;

  withinHours?: number;
}

export interface CustomFeedSourceForYou {
  $type: typeof CUSTOM_FEED_DEFS.sourceForYou;

  events?: ('like' | 'repost')[];

  withinHours?: number;
}

export interface CustomFeedSourceFeed {
  $type: typeof CUSTOM_FEED_DEFS.sourceFeed;

  feed: string;
}

export interface CustomFeedEventReposts {
  $type: typeof CUSTOM_FEED_DEFS.eventReposts;
  repostedBy?: string;
  ofAuthor?: string;
}
export interface CustomFeedEventLikes {
  $type: typeof CUSTOM_FEED_DEFS.eventLikes;
  likedBy?: string;
  ofAuthor?: string;
}
export interface CustomFeedEventPosts {
  $type: typeof CUSTOM_FEED_DEFS.eventPosts;
  authoredBy?: string;
  where?: CustomFeedFilterGroup;
}
export interface CustomFeedEventFollows {
  $type: typeof CUSTOM_FEED_DEFS.eventFollows;
  followedBy?: string;
  subjectDid?: string;
}
export type CustomFeedEvent =
  | CustomFeedEventReposts
  | CustomFeedEventLikes
  | CustomFeedEventPosts
  | CustomFeedEventFollows;

export interface CustomFeedScanPosts {
  $type: typeof CUSTOM_FEED_DEFS.scanPosts;
  authoredBy?: string;
  where?: CustomFeedFilterGroup;
  limit?: number;

  order?: 'asc' | 'desc';
}
export interface CustomFeedScanLikes {
  $type: typeof CUSTOM_FEED_DEFS.scanLikes;
  likedBy?: string;
  limit?: number;
}
export interface CustomFeedScanReposts {
  $type: typeof CUSTOM_FEED_DEFS.scanReposts;
  repostedBy?: string;
  limit?: number;
}
export type CustomFeedScan =
  | CustomFeedScanPosts
  | CustomFeedScanLikes
  | CustomFeedScanReposts;

export interface CustomFeedWindowNone {
  $type: typeof CUSTOM_FEED_DEFS.windowNone;
}
export interface CustomFeedWindowBetweenBaseEvents {
  $type: typeof CUSTOM_FEED_DEFS.windowBetweenBaseEvents;
  partitionBy: string;
  orderBy: string;
  inclusive?: 'none' | 'start' | 'end' | 'both';
}
export interface CustomFeedWindowDuration {
  $type: typeof CUSTOM_FEED_DEFS.windowDuration;
  start: string;
  duration: string;
}
export interface CustomFeedWindowFixed {
  $type: typeof CUSTOM_FEED_DEFS.windowFixed;
  since?: string;
  until?: string;
}
export type CustomFeedWindow =
  | CustomFeedWindowNone
  | CustomFeedWindowBetweenBaseEvents
  | CustomFeedWindowDuration
  | CustomFeedWindowFixed;

export interface CustomFeedIncludeBaseSubject {
  $type: typeof CUSTOM_FEED_DEFS.includeBaseSubject;
}
export interface CustomFeedIncludeBaseActor {
  $type: typeof CUSTOM_FEED_DEFS.includeBaseActor;
}
export type CustomFeedInclude =
  | CustomFeedIncludeBaseSubject
  | CustomFeedIncludeBaseActor;

export interface CustomFeedSourceFrom {
  $type: typeof CUSTOM_FEED_DEFS.sourceFrom;
  table: 'posts';
  where?: CustomFeedFilterGroup;
  limit?: number;
}
export interface CustomFeedSourceCorrelated {
  $type: typeof CUSTOM_FEED_DEFS.sourceCorrelated;
  base: CustomFeedEvent;
  scan: CustomFeedScan;
  window?: CustomFeedWindow;
  include?: CustomFeedInclude[];

  requireScan?: boolean;
}
export interface CustomFeedSourceUnion {
  $type: typeof CUSTOM_FEED_DEFS.sourceUnion;

  inputs: Exclude<CustomFeedSource, CustomFeedSourceUnion>[];
}

export type CustomFeedSource =
  | CustomFeedSourceTimeline
  | CustomFeedSourceAuthors
  | CustomFeedSourceSearch
  | CustomFeedSourceCollection
  | CustomFeedSourceFollowingEngagement
  | CustomFeedSourceForYou
  | CustomFeedSourceFeed
  | CustomFeedSourceFrom
  | CustomFeedSourceCorrelated
  | CustomFeedSourceUnion;

export type CustomFeedSort =
  | 'chronological'
  | 'likeCount'
  | 'repostCount'
  | 'relevance'
  | 'hotness'

  | 'trending'
  | 'expression'
  | 'manual';

export type SortExprColumn =
  | 'likeCount'
  | 'repostCount'
  | 'replyCount'
  | 'quoteCount'

  | 'age';

export type SortExprOpName =
  | 'add'
  | 'sub'
  | 'mul'
  | 'div'
  | 'neg'
  | 'log10'
  | 'log1p'
  | 'exp'
  | 'sqrt'
  | 'pow'
  | 'min'
  | 'max'
  | 'decay';

export interface SortExprLit {
  lit: number;
}
export interface SortExprCol {
  col: SortExprColumn;
}
export interface SortExprOp {
  op: SortExprOpName;
  args: SortExpression[];
}
export type SortExpression = SortExprLit | SortExprCol | SortExprOp;
export type CustomFeedVisibility = 'private' | 'public';

export interface CustomFeedDefinitionRecord {
  $type?: string;
  name: string;
  description?: string;

  avatar?: unknown;
  source: CustomFeedSource;
  filter?: CustomFeedFilterGroup;
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
  createdAt: string;
  updatedAt?: string;
}
