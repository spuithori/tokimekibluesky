import { toast } from 'svelte-sonner';
import { t } from 'tokimeki-i18n';
import {
  api,
  apiErrorMessage,
  hydrateActors,
  hydratePosts,
  requireAgent,
  DEFAULT_FEED_AVATAR_URL,
  FEEDS_SERVICE_DID,
  type ActorBrief,
  type PreviewItem,
  type PreviewStats
} from './api';
import { generatorAvatar, toBlobJson, type BlobJson } from './avatar';
import { session } from './session.svelte';
import type { CustomFeedDefinitionRecord, PostView } from '$lib/feedbuilder/types';

export const DEFINITION_COLLECTION = 'tech.tokimeki.feeds.definition';
export const GENERATOR_COLLECTION = 'app.bsky.feed.generator';

export interface CustomFeedEntry {
  uri: string;
  rkey: string;
  cid: string;
  record: CustomFeedDefinitionRecord;
  published: boolean;
  outdated?: boolean;
  generatorAvatar?: BlobJson;
}

export interface PreviewFeedItem {
  post: PostView;
  item: PreviewItem;
  reasonActor?: ActorBrief;
  pinned?: boolean;
}

export function previewKey(f: PreviewFeedItem): string {
  if (f.pinned) return `pin|${f.post.uri}`;
  const r = f.item.reason;
  return r?.context ? `${f.post.uri}|${r.uri}` : f.post.uri;
}

export interface ExecuteResult {
  feed: PreviewFeedItem[];
  cursor?: string;
  stats: PreviewStats;
  missing: number;
}

export function generatorUri(did: string, rkey: string): string {
  return `at://${did}/${GENERATOR_COLLECTION}/${rkey}`;
}

function rkeyOf(uri: string): string {
  return uri.split('/').pop() ?? '';
}

type ListedRecord = { uri: string; cid: string; value: Record<string, unknown> };

async function listAll(collection: string): Promise<ListedRecord[]> {
  const agent = requireAgent();
  const out: ListedRecord[] = [];
  let cursor: string | undefined;
  do {
    const res = await agent.xrpc.get<{ records: ListedRecord[]; cursor?: string }>('com.atproto.repo.listRecords', {
      repo: agent.did(),
      collection,
      limit: 100,
      cursor
    });
    out.push(...res.records);
    cursor = res.cursor;
  } while (cursor);
  return out;
}

class CustomFeedsStore {
  items = $state<CustomFeedEntry[]>([]);
  loaded = $state(false);
  loading = $state(false);
  #owner: string | null = null;

  async load(): Promise<void> {
    if (this.loaded || this.loading) return;
    this.loading = true;
    const owner = requireAgent().did();
    let stale = false;
    try {
      const [generators, definitions] = await Promise.all([
        listAll(GENERATOR_COLLECTION),
        listAll(DEFINITION_COLLECTION)
      ]);
      if (session.did !== owner) {
        stale = true;
        return;
      }
      const published = new Set<string>();
      const outdated = new Set<string>();
      const avatars = new Map<string, BlobJson>();
      for (const r of generators) {
        if (r.value.did !== FEEDS_SERVICE_DID) continue;
        const rkey = rkeyOf(r.uri);
        published.add(rkey);
        if (r.value.acceptsInteractions !== true) outdated.add(rkey);
        const a = toBlobJson(r.value.avatar);
        if (a) avatars.set(rkey, a);
      }
      this.items = definitions.map((r) => {
        const rkey = rkeyOf(r.uri);
        return {
          uri: r.uri,
          rkey,
          cid: r.cid,
          record: r.value as unknown as CustomFeedDefinitionRecord,
          published: published.has(rkey),
          outdated: outdated.has(rkey),
          generatorAvatar: avatars.get(rkey)
        };
      });
      this.#owner = owner;
      this.loaded = true;
    } catch (err) {
      console.error('[customFeeds] load failed:', err);
      toast.error(t('tfeeds_toast_load_failed'));
      throw err;
    } finally {
      this.loading = false;
      if (stale && session.did) void this.load().catch(() => {});
    }
  }

  async create(
    record: Omit<CustomFeedDefinitionRecord, 'createdAt' | 'updatedAt'>,
    opts: { silent?: boolean } = {}
  ): Promise<CustomFeedEntry> {
    try {
      const agent = requireAgent();
      const full = { ...record, createdAt: new Date().toISOString() } as CustomFeedDefinitionRecord;
      const res = await agent.xrpc.post<{ uri: string; cid: string }>('com.atproto.repo.createRecord', {
        repo: agent.did(),
        collection: DEFINITION_COLLECTION,
        record: { ...full, $type: DEFINITION_COLLECTION },
        validate: false
      });
      const entry: CustomFeedEntry = {
        uri: res.uri,
        rkey: rkeyOf(res.uri),
        cid: res.cid,
        record: full,
        published: false
      };
      this.items = [entry, ...this.items];
      await api.refresh(entry.uri).catch(() => {});
      if (!opts.silent) toast.success(t('tfeeds_toast_created'));
      return entry;
    } catch (err) {
      toast.error(t('tfeeds_toast_create_failed'));
      throw err;
    }
  }

  async duplicate(uri: string): Promise<CustomFeedEntry | undefined> {
    const src = this.items.find((e) => e.uri === uri);
    if (!src) return undefined;
    const rest = { ...src.record } as Partial<CustomFeedDefinitionRecord> & { $type?: string };
    delete rest.createdAt;
    delete rest.updatedAt;
    delete rest.$type;
    const name = Array.from(t('tfeeds_copy_name', { name: src.record.name })).slice(0, 64).join('');
    const entry = await this.create(
      { ...rest, name } as Omit<CustomFeedDefinitionRecord, 'createdAt' | 'updatedAt'>,
      { silent: true }
    );
    toast.success(t('tfeeds_toast_duplicated', { name }));
    return entry;
  }

  async update(
    uri: string,
    record: CustomFeedDefinitionRecord,
    opts: { silent?: boolean; fromBuilder?: boolean } = {}
  ): Promise<CustomFeedEntry> {
    const current = this.items.find((e) => e.uri === uri);
    if (!current) throw new Error('definition not found');
    try {
      const agent = requireAgent();
      const next = { ...record, updatedAt: new Date().toISOString() } as CustomFeedDefinitionRecord;
      const res = await agent.xrpc.post<{ uri: string; cid: string }>('com.atproto.repo.putRecord', {
        repo: agent.did(),
        collection: DEFINITION_COLLECTION,
        rkey: current.rkey,
        record: { ...next, $type: DEFINITION_COLLECTION },
        validate: false
      });
      const entry: CustomFeedEntry = {
        ...current,
        cid: res.cid,
        record: next,
        outdated: current.published ? false : current.outdated
      };
      this.items = this.items.map((e) => (e.uri === uri ? entry : e));
      if (current.published) await this.#putGenerator(entry, { fromBuilder: opts.fromBuilder });
      await api.refresh(entry.uri).catch(() => {});
      if (!opts.silent) toast.success(t('tfeeds_toast_updated'));
      return entry;
    } catch (err) {
      if (!opts.silent) toast.error(t('tfeeds_toast_update_failed'));
      throw err;
    }
  }

  async remove(uri: string): Promise<void> {
    const previous = this.items.find((e) => e.uri === uri);
    if (!previous) return;
    this.items = this.items.filter((e) => e.uri !== uri);
    try {
      const agent = requireAgent();
      const repo = agent.did();
      if (previous.published) {
        await agent.xrpc.post('com.atproto.repo.deleteRecord', {
          repo,
          collection: GENERATOR_COLLECTION,
          rkey: previous.rkey
        });
      }
      await agent.xrpc.post('com.atproto.repo.deleteRecord', {
        repo,
        collection: DEFINITION_COLLECTION,
        rkey: previous.rkey
      });
      await api.refresh(uri).catch(() => {});
      toast.success(t('tfeeds_toast_removed'));
    } catch (err) {
      this.items = [...this.items, previous];
      toast.error(t('tfeeds_toast_remove_failed'));
      throw err;
    }
  }

  async #putGenerator(entry: CustomFeedEntry, opts: { fromBuilder?: boolean } = {}): Promise<void> {
    const agent = requireAgent();
    const repo = agent.did();
    const existing = await agent.xrpc
      .get<{ value: { avatar?: unknown } }>('com.atproto.repo.getRecord', {
        repo,
        collection: GENERATOR_COLLECTION,
        rkey: entry.rkey
      })
      .then((r) => r.value)
      .catch(() => null);
    const avatar = await generatorAvatar(
      { definition: entry.record.avatar, existing: existing?.avatar, fromBuilder: opts.fromBuilder },
      async () => {
        const png = await fetch(DEFAULT_FEED_AVATAR_URL).then((r) => {
          if (!r.ok) throw new Error(`feed-avatar.png: ${r.status}`);
          return r.arrayBuffer();
        });
        const res = await agent.uploadBlob(png, 'image/png');
        return res.blob;
      }
    );
    const composed = await api.composeGenerator(
      { ...entry.record, $type: DEFINITION_COLLECTION },
      toBlobJson(entry.record.avatar) ? undefined : avatar
    );
    await agent.xrpc.post('com.atproto.repo.putRecord', {
      repo,
      collection: GENERATOR_COLLECTION,
      rkey: entry.rkey,
      record: composed.record
    });
    this.items = this.items.map((e) => (e.rkey === entry.rkey ? { ...e, generatorAvatar: avatar } : e));
  }

  async publish(uri: string, opts: { action?: { label: string; onClick: () => void } } = {}): Promise<void> {
    const entry = this.items.find((e) => e.uri === uri);
    if (!entry) return;
    try {
      await this.#putGenerator(entry);
      const wasPublished = entry.published;
      this.items = this.items.map((e) => (e.uri === uri ? { ...e, published: true, outdated: false } : e));
      await api.refresh(generatorUri(requireAgent().did(), entry.rkey)).catch(() => {});
      toast.success(
        t(wasPublished ? 'tfeeds_toast_republished' : 'tfeeds_toast_published'),
        opts.action ? { action: opts.action } : undefined
      );
    } catch (err) {
      toast.error(t('tfeeds_toast_publish_failed', { message: apiErrorMessage(err) }));
      throw err;
    }
  }

  async unpublish(uri: string): Promise<void> {
    const entry = this.items.find((e) => e.uri === uri);
    if (!entry) return;
    try {
      const agent = requireAgent();
      const repo = agent.did();
      await agent.xrpc.post('com.atproto.repo.deleteRecord', {
        repo,
        collection: GENERATOR_COLLECTION,
        rkey: entry.rkey
      });
      this.items = this.items.map((e) => (e.uri === uri ? { ...e, published: false } : e));
      await api.refresh(generatorUri(repo, entry.rkey)).catch(() => {});
      toast.success(t('tfeeds_toast_unpublished'));
    } catch (err) {
      toast.error(t('tfeeds_toast_unpublish_failed'));
      throw err;
    }
  }

  async execute(
    entry: Pick<CustomFeedEntry, 'record'>,
    opts: { limit?: number; cursor?: string } = {}
  ): Promise<ExecuteResult> {
    const res = await api.preview(entry.record, opts);
    const reasonDids = res.items.flatMap((i) => (i.reason ? [i.reason.by] : []));
    const pinned = res.pinned ?? [];
    const [posts, actors] = await Promise.all([
      hydratePosts([...pinned, ...res.items.map((i) => i.uri)]),
      reasonDids.length > 0
        ? hydrateActors(reasonDids).catch(() => new Map<string, ActorBrief>())
        : Promise.resolve(new Map<string, ActorBrief>())
    ]);
    const feed: PreviewFeedItem[] = [];
    for (const uri of pinned) {
      const post = posts.get(uri);
      if (!post) continue;
      const item: PreviewItem = {
        uri,
        createdAt: post.record.createdAt ?? post.indexedAt,
        likeCount: post.likeCount ?? 0,
        repostCount: post.repostCount ?? 0,
        replyCount: post.replyCount ?? 0,
        quoteCount: post.quoteCount ?? 0
      };
      feed.push({ post, item, pinned: true });
    }
    for (const item of res.items) {
      const post = posts.get(item.uri);
      if (post) feed.push({ post, item, reasonActor: item.reason ? actors.get(item.reason.by) : undefined });
    }
    return { feed, cursor: res.cursor, stats: res.stats, missing: res.items.length - feed.length };
  }

  reset(): void {
    this.items = [];
    this.loaded = false;
    this.#owner = null;
  }

  get owner(): string | null {
    return this.#owner;
  }
}

export const customFeeds = new CustomFeedsStore();
