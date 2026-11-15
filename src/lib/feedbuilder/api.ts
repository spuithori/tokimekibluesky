import { t } from 'tokimeki-i18n';
import type { Agent } from '$lib/agent';
import type { CustomFeedDefinitionRecord, PostView } from '$lib/feedbuilder/types';
import { session } from './session.svelte';

export const FEEDS_SERVICE_DID = 'did:web:feeds.tokimeki.blue';
export const FEEDS_SITE_URL = 'https://feeds.tokimeki.blue';
export const DEFAULT_FEED_AVATAR_URL = `${FEEDS_SITE_URL}/feed-avatar.png`;

const PROXY = { proxyDid: FEEDS_SERVICE_DID, proxyServiceId: 'bsky_fg' };

type Params = Record<string, string | number | boolean | string[] | undefined>;

export function requireAgent(): Agent {
  const agent = session.agent;
  if (!agent) throw new Error(t('tfeeds_err_login_required'));
  return agent;
}

export function xrpcQuery<T>(nsid: string, params: Params = {}, signal?: AbortSignal): Promise<T> {
  return requireAgent().xrpc.get<T>(nsid, params, { signal });
}

function query<T>(nsid: string, params: Params): Promise<T> {
  return requireAgent().callWithProxy<T>(nsid, params, PROXY);
}

function procedure<T>(nsid: string, data: unknown): Promise<T> {
  return requireAgent().callWithProxy<T>(nsid, undefined, { method: 'POST', data, ...PROXY });
}

export function apiErrorMessage(err: unknown): string {
  const e = err as { status?: number; error?: string; message?: string } | null;
  if (e?.status === 429 || e?.error === 'RateLimitExceeded') return t('tfeeds_err_rate_limit');
  if (e?.status === 503) return t('tfeeds_err_unavailable');
  if (e?.status === 401) return t('tfeeds_err_auth');
  return e?.message || String(err);
}

export interface DefinitionError {
  code: string;
  message: string;
  astPath?: string;
  suggestion?: string;
}

export interface PreviewReason {
  kind: 'repost' | 'like' | 'post' | 'follow';
  by: string;
  uri: string;
  at: string;
  context: boolean;
}

export interface PreviewItem {
  uri: string;
  createdAt: string;
  likeCount: number;
  repostCount: number;
  replyCount: number;
  quoteCount: number;
  score?: number;
  reason?: PreviewReason;
}

export interface PreviewStats {
  scanned: number;
  truncated: boolean;
  elapsedMs: number;
  notes: string[];
}

export interface PreviewResult {
  items: PreviewItem[];
  pinned?: string[];
  cursor?: string;
  stats: PreviewStats;
}

export interface ExplainNode {
  path: string;
  kind: 'and' | 'or' | 'not' | 'pred' | 'source' | 'window' | 'guard';
  matched: boolean | null;
  detail?: string;
  children?: ExplainNode[];
}

export interface ExplainResult {
  post: {
    uri: string;
    found: boolean;
    createdAt?: string;
    attrs: string[];
    modLabels: string[];
    counts?: { likes: number; reposts: number; replies: number; quotes: number };
  };
  source: ExplainNode;
  filter?: ExplainNode;
  window?: ExplainNode;
  guard?: ExplainNode;
  matched: boolean | null;
  pinned: boolean;
  viewerHidden: { post: boolean; author: boolean; boosted?: boolean; seen?: boolean } | null;
  included: boolean | null;
}

export type FeedMetric =
  | 'req'
  | 'anon'
  | 'items'
  | 'seen'
  | 'click'
  | 'like'
  | 'repost'
  | 'reply'
  | 'quote'
  | 'share'
  | 'more'
  | 'less';

export interface FeedStatsDay {
  date: string;
  viewers: number;
  counts: Record<FeedMetric, number>;
}

export interface FeedStats {
  days: FeedStatsDay[];
  viewers: number;
  hidden_posts: number;
  hidden_authors: number;
}

export interface GalleryFeed {
  feed: string;
  did: string;
  rkey: string;
  name: string;
  description?: string;
  sourceType: string;
  viewers: number;
  createdAt?: string;
  updatedAt?: string;
  definition: CustomFeedDefinitionRecord;
}

export interface GalleryPage {
  feeds: GalleryFeed[];
  total: number;
  cursor: string | null;
}

export interface ComposedGenerator {
  collection: string;
  record: Record<string, unknown>;
}

export const api = {
  gallery: (opts: { sort?: 'popular' | 'new'; q?: string; cursor?: string; limit?: number } = {}) =>
    query<GalleryPage>('tech.tokimeki.feeds.getGallery', {
      sort: opts.sort,
      q: opts.q || undefined,
      cursor: opts.cursor,
      limit: opts.limit
    }),
  validate: (definition: unknown) =>
    procedure<{ valid: true } | { valid: false; error: DefinitionError }>('tech.tokimeki.feeds.validateDefinition', {
      definition
    }),
  preview: (definition: unknown, opts: { limit?: number; cursor?: string } = {}) =>
    procedure<PreviewResult>('tech.tokimeki.feeds.previewFeed', {
      definition,
      limit: opts.limit,
      cursor: opts.cursor
    }),
  feedStats: (feedUri: string, days = 14) =>
    query<FeedStats>('tech.tokimeki.feeds.getFeedStats', { feed: feedUri, days }),
  explain: (definition: unknown, uri: string, opts: { feed?: string | null } = {}) =>
    procedure<ExplainResult>('tech.tokimeki.feeds.explainPost', {
      definition,
      uri,
      feed: opts.feed ?? undefined
    }),
  definitionHistory: (uri: string) =>
    query<{ versions: { replacedAt: string; record: CustomFeedDefinitionRecord }[] }>(
      'tech.tokimeki.feeds.getDefinitionHistory',
      { uri }
    ),
  refresh: (uri: string) => procedure<{ found: boolean }>('tech.tokimeki.feeds.refreshRecord', { uri }),
  composeGenerator: (definition: unknown, avatar?: unknown) =>
    procedure<ComposedGenerator>('tech.tokimeki.feeds.composeGenerator', {
      definition,
      ...(avatar ? { avatar } : {})
    })
};

export interface ActorBrief {
  did: string;
  handle: string;
  displayName?: string;
}

export async function hydrateActors(dids: string[]): Promise<Map<string, ActorBrief>> {
  const out = new Map<string, ActorBrief>();
  const uniq = [...new Set(dids)];
  for (let i = 0; i < uniq.length; i += 25) {
    const res = await xrpcQuery<{ profiles: ActorBrief[] }>('app.bsky.actor.getProfiles', {
      actors: uniq.slice(i, i + 25)
    });
    for (const p of res.profiles) out.set(p.did, { did: p.did, handle: p.handle, displayName: p.displayName });
  }
  return out;
}

export async function hydratePosts(uris: string[]): Promise<Map<string, PostView>> {
  const out = new Map<string, PostView>();
  const uniq = [...new Set(uris)];
  const chunks: string[][] = [];
  for (let i = 0; i < uniq.length; i += 25) chunks.push(uniq.slice(i, i + 25));
  const pages = await Promise.all(
    chunks.map((chunk) => xrpcQuery<{ posts: PostView[] }>('app.bsky.feed.getPosts', { uris: chunk }))
  );
  for (const res of pages) for (const p of res.posts) out.set(p.uri, p);
  return out;
}
