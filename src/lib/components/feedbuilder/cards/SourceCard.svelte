<script lang="ts">
  import { _ } from 'tokimeki-i18n';
  import Compass from '@lucide/svelte/icons/compass';
  import Globe from '@lucide/svelte/icons/globe';
  import Users from '@lucide/svelte/icons/users';
  import Library from '@lucide/svelte/icons/library';
  import Search from '@lucide/svelte/icons/search';
  import GripVertical from '@lucide/svelte/icons/grip-vertical';
  import X from '@lucide/svelte/icons/x';
  import Plus from '@lucide/svelte/icons/plus';
  import Repeat2 from '@lucide/svelte/icons/repeat-2';
  import HeartHandshake from '@lucide/svelte/icons/heart-handshake';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import Rss from '@lucide/svelte/icons/rss';
  import { customFeeds } from '$lib/feedbuilder/customFeeds.svelte';
  import { feedName, feedKey, toFeedAtUri } from '$lib/feedbuilder/feeds';
  import SectionCard from '../SectionCard.svelte';
  import { feedBuilder, describeEngagement, describeForYou, type SourceKind } from '$lib/feedbuilder/feedBuilder.svelte';
  import AuthorListEditor from '../AuthorListEditor.svelte';
  import { Sortable } from '$lib/feedbuilder/sortable.svelte';

  interface Props {
    open: boolean;
    onToggle: () => void;
  }
  let { open, onToggle }: Props = $props();

  const cardState = $derived(feedBuilder.cardStates.source);
  const diag = $derived(feedBuilder.diagnostics.find((d) => d.cardId === 'source'));
  const source = $derived(feedBuilder.draft.source);

  function setKind(kind: SourceKind) {
    feedBuilder.setSourceKind(kind);
  }

  function setScope(scope: 'global' | 'following') {
    if (source.kind !== 'timeline') return;
    feedBuilder.setSource({
      kind: 'timeline',
      scope,
      ...(source.includeReposts === false ? { includeReposts: false } : {})
    });
  }

  function setIncludeReposts(value: boolean) {
    if (source.kind !== 'timeline') return;
    feedBuilder.setSource({
      kind: 'timeline',
      scope: source.scope,
      ...(value ? {} : { includeReposts: false })
    });
  }

  const repostsForced = $derived(feedBuilder.draft.sort !== 'chronological');
  const includeRepostsChecked = $derived(
    source.kind === 'timeline' && source.includeReposts !== false
  );

  let collectionText = $derived(
    source.kind === 'collection' ? source.postUris.join('\n') : ''
  );
  function commitCollection() {
    if (source.kind !== 'collection') return;
    const uris = collectionText
      .split(/\s+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
    feedBuilder.setSource({ kind: 'collection', postUris: uris });
  }

  let newUriText = $state('');

  const collectionUris = $derived(
    source.kind === 'collection' ? source.postUris : []
  );

  function uriPreview(uri: string): string {
    const parts = uri.split('/');
    const did = parts[2] ?? '';
    const rkey = parts[parts.length - 1] ?? '';
    const didShort = did.length > 20 ? `${did.slice(0, 14)}…${did.slice(-4)}` : did;
    return `at://${didShort}/…/${rkey}`;
  }

  const collectionSortable = new Sortable({
    getIds: () => collectionUris,
    onreorder: (next) => {
      if (source.kind !== 'collection') return;
      feedBuilder.setSource({ kind: 'collection', postUris: next });
    }
  });

  function removeCollection(index: number) {
    if (source.kind !== 'collection') return;
    if (source.postUris.length <= 1) return;
    const arr = source.postUris.filter((_uri, i) => i !== index);
    feedBuilder.setSource({ kind: 'collection', postUris: arr });
  }

  function appendCollection() {
    if (source.kind !== 'collection') return;
    const trimmed = newUriText.trim();
    if (!trimmed.startsWith('at://did:')) return;
    if (source.postUris.includes(trimmed)) {
      newUriText = '';
      return;
    }
    feedBuilder.setSource({
      kind: 'collection',
      postUris: [...source.postUris, trimmed]
    });
    newUriText = '';
  }

  const ACTOR_OPTIONS = [1, 2, 3, 5];
  const HOUR_OPTIONS = [
    { hours: 6, key: 'tfeeds_dur_hours', n: 6 },
    { hours: 24, key: 'tfeeds_dur_hours', n: 24 },
    { hours: 72, key: 'tfeeds_dur_days', n: 3 },
    { hours: 168, key: 'tfeeds_dur_days', n: 7 }
  ];
  const EVENT_OPTIONS = [
    { id: 'like' as const, key: 'tfeeds_src_event_like' },
    { id: 'repost' as const, key: 'tfeeds_src_event_repost' }
  ];

  function toggleEvent(ev: 'like' | 'repost') {
    if (source.kind !== 'engagement' && source.kind !== 'forYou') return;
    const has = source.events.includes(ev);
    if (has && source.events.length === 1) return;
    const events = has ? source.events.filter((e) => e !== ev) : [...source.events, ev];
    feedBuilder.setSource({ ...source, events });
  }

  function setEngagement(patch: { minActors?: number; withinHours?: number }) {
    if (source.kind !== 'engagement') return;
    feedBuilder.setSource({ ...source, ...patch });
  }

  function setForYouHours(withinHours: number) {
    if (source.kind !== 'forYou') return;
    feedBuilder.setSource({ ...source, withinHours });
  }

  let searchText = $derived(source.kind === 'search' ? source.query : '');
  function commitSearch() {
    if (source.kind !== 'search') return;
    feedBuilder.setSource({ kind: 'search', query: searchText });
  }

  function summaryText(): string {
    if (source.kind === 'timeline') {
      const base =
        source.scope === 'global'
          ? $_('tfeeds_src_global')
          : $_('tfeeds_src_following');
      return source.includeReposts === false ? $_('tfeeds_src_no_reposts', { base }) : base;
    }
    if (source.kind === 'authors') {
      return source.dids.length > 0
        ? $_('tfeeds_src_authors_n', { n: source.dids.length })
        : $_('tfeeds_src_authors_empty');
    }
    if (source.kind === 'search') {
      return source.query.trim().length > 0
        ? $_('tfeeds_easy_src_search_q', { q: source.query })
        : $_('tfeeds_src_search_empty');
    }
    if (source.kind === 'collection') {
      return source.postUris.length > 0
        ? $_('tfeeds_src_collection_count', { n: source.postUris.length })
        : $_('tfeeds_src_collection_empty');
    }
    if (source.kind === 'engagement') {
      return describeEngagement(source);
    }
    if (source.kind === 'forYou') {
      return describeForYou(source);
    }
    if (source.kind === 'feed') {
      return source.feed ? $_('tfeeds_src_feed_posts', { name: refName ?? '…' }) : $_('tfeeds_src_feed_empty');
    }
    return $_('tfeeds_src_advanced_json');
  }

  const kinds = [
    { id: 'timeline' as const, key: 'tfeeds_src_kind_timeline', icon: Compass },
    { id: 'authors' as const, key: 'tfeeds_easy_no_src_authors', icon: Users },
    { id: 'search' as const, key: 'tfeeds_easy_src_search', icon: Search },
    { id: 'collection' as const, key: 'tfeeds_easy_no_src_collection', icon: Library },
    { id: 'engagement' as const, key: 'tfeeds_src_kind_engagement', icon: HeartHandshake },
    { id: 'forYou' as const, key: 'tfeeds_easy_src_forYou', icon: Sparkles },
    { id: 'feed' as const, key: 'tfeeds_src_kind_feed', icon: Rss }
  ];

  let refName = $state<string | null>(null);
  let feedError = $state<string | null>(null);
  let feedText = $state('');
  $effect(() => {
    const uri = source.kind === 'feed' ? source.feed : '';
    feedText = uri;
    refName = null;
    if (!uri) return;
    let alive = true;
    feedName(uri).then((n) => {
      if (alive) refName = n ?? feedKey(uri)?.rkey ?? uri;
    });
    return () => {
      alive = false;
    };
  });
  async function commitFeed() {
    feedError = null;
    if (!feedText.trim()) {
      feedBuilder.setSource({ kind: 'feed', feed: '' });
      return;
    }
    try {
      feedBuilder.setSource({ kind: 'feed', feed: await toFeedAtUri(feedText) });
    } catch (e) {
      feedError = e instanceof Error ? e.message : $_('tfeeds_src_feed_error');
    }
  }
  const myFeeds = $derived(customFeeds.items.filter((f) => f.uri !== feedBuilder.originalUri));
</script>

<SectionCard
  label={$_('tfeeds_src_card_label')}
  icon={Compass}
  accent="peri"
  state={cardState}
  {open}
  {onToggle}
  error={diag ? { message: diag.message, suggestion: diag.suggestion } : undefined}
>
  {#snippet summary()}
    {summaryText()}
  {/snippet}
  {#snippet body()}
    <div class="source-card__segmented" role="radiogroup" aria-label={$_('tfeeds_src_kind_aria')}>
      {#each kinds as k (k.id)}
        {@const Icon = k.icon}
        <button
          type="button"
          class="source-card__pill"
          class:is-active={source.kind === k.id}
          aria-pressed={source.kind === k.id}
          onclick={() => setKind(k.id)}
        >
          <Icon size={15} strokeWidth={1.9} />
          <span>{$_(k.key)}</span>
        </button>
      {/each}
    </div>

    {#if source.kind === 'timeline'}
      <div class="source-card__scope" role="radiogroup" aria-label={$_('tfeeds_src_scope_aria')}>
        <button
          type="button"
          class="source-card__scope-tile"
          class:is-active={source.scope === 'global'}
          onclick={() => setScope('global')}
        >
          <Globe size={16} strokeWidth={1.9} />
          <span class="source-card__scope-text">
            <span class="source-card__scope-title">{$_('tfeeds_tpl_global_name')}</span>
          </span>
        </button>
        <button
          type="button"
          class="source-card__scope-tile"
          class:is-active={source.scope === 'following'}
          onclick={() => setScope('following')}
        >
          <Users size={16} strokeWidth={1.9} />
          <span class="source-card__scope-text">
            <span class="source-card__scope-title">{$_('tfeeds_src_scope_following')}</span>
            <span class="source-card__scope-hint">{$_('tfeeds_src_login_required')}</span>
          </span>
        </button>
      </div>

      {#if source.scope === 'following'}
        <label class="source-card__option" class:is-disabled={repostsForced}>
          <input
            type="checkbox"
            class="source-card__option-checkbox"
            checked={includeRepostsChecked}
            disabled={repostsForced}
            onchange={(e) => setIncludeReposts((e.currentTarget as HTMLInputElement).checked)}
          />
          <Repeat2 size={16} strokeWidth={1.9} />
          <span class="source-card__option-text">
            <span class="source-card__option-title">{$_('tfeeds_src_include_reposts')}</span>
            <span class="source-card__option-hint">
              {repostsForced
                ? $_('tfeeds_src_reposts_forced_hint')
                : $_('tfeeds_src_reposts_hint')}
            </span>
          </span>
        </label>
      {/if}
    {:else if source.kind === 'authors'}
      <div class="source-card__field">
        <span class="source-card__field-label">{$_('tfeeds_src_authors_label')}</span>
        <AuthorListEditor
          dids={source.dids}
          onChange={(dids) => feedBuilder.setSource({ kind: 'authors', dids })}
          onFocus={() => feedBuilder.setActiveCard('source')}
        />
        <span class="source-card__field-hint">{$_('tfeeds_src_authors_hint')}</span>
      </div>
    {:else if source.kind === 'search'}
      <label class="source-card__field">
        <span class="source-card__field-label">{$_('tfeeds_src_query_label')}</span>
        <input
          type="text"
          class="source-card__search-input"
          placeholder={$_('tfeeds_src_query_placeholder')}
          bind:value={searchText}
          onblur={commitSearch}
          onfocus={() => feedBuilder.setActiveCard('source')}
        />
        <span class="source-card__field-hint">{$_('tfeeds_src_query_hint')}</span>
      </label>
      <div class="source-card__field">
        <span class="source-card__field-label">{$_('tfeeds_src_match_label')}</span>
        <div class="source-card__match-mode" role="radiogroup" aria-label={$_('tfeeds_src_match_label')}>
          <button
            type="button"
            class="source-card__match-option"
            class:is-active={!source.exact}
            onclick={() =>
              feedBuilder.setSource({ kind: 'search', query: source.query, exact: false })}
          >
            {$_('tfeeds_src_match_partial')}
          </button>
          <button
            type="button"
            class="source-card__match-option"
            class:is-active={!!source.exact}
            onclick={() =>
              feedBuilder.setSource({ kind: 'search', query: source.query, exact: true })}
          >
            {$_('tfeeds_src_match_word')}
          </button>
        </div>
        <span class="source-card__field-hint">{$_('tfeeds_src_match_hint')}</span>
      </div>
    {:else if source.kind === 'engagement'}
      <div class="source-card__field">
        <span class="source-card__field-label">{$_('tfeeds_src_events_label')}</span>
        <div class="source-card__match-mode" role="group" aria-label={$_('tfeeds_src_events_label')}>
          {#each EVENT_OPTIONS as ev (ev.id)}
            {@const id = ev.id}
            <button
              type="button"
              class="source-card__match-option"
              class:is-active={source.events.includes(id)}
              aria-pressed={source.events.includes(id)}
              onclick={() => toggleEvent(id)}
            >
              {$_(ev.key)}
            </button>
          {/each}
        </div>
      </div>
      <div class="source-card__field">
        <span class="source-card__field-label">{$_('tfeeds_src_actors_label')}</span>
        <div class="source-card__match-mode" role="radiogroup" aria-label={$_('tfeeds_src_actors_label')}>
          {#each ACTOR_OPTIONS as n (n)}
            <button
              type="button"
              class="source-card__match-option"
              class:is-active={source.minActors === n}
              aria-pressed={source.minActors === n}
              onclick={() => setEngagement({ minActors: n })}
            >
              {n === 1 ? $_('tfeeds_src_actors_one') : $_('tfeeds_src_actors_min', { n })}
            </button>
          {/each}
        </div>
      </div>
      <div class="source-card__field">
        <span class="source-card__field-label">{$_('tfeeds_src_period_label')}</span>
        <div class="source-card__match-mode" role="radiogroup" aria-label={$_('tfeeds_src_period_label')}>
          {#each HOUR_OPTIONS as o (o.hours)}
            <button
              type="button"
              class="source-card__match-option"
              class:is-active={source.withinHours === o.hours}
              aria-pressed={source.withinHours === o.hours}
              onclick={() => setEngagement({ withinHours: o.hours })}
            >
              {$_(o.key, { n: o.n })}
            </button>
          {/each}
        </div>
        <span class="source-card__field-hint">{$_('tfeeds_src_engagement_hint')}</span>
      </div>
    {:else if source.kind === 'forYou'}
      <div class="source-card__field">
        <span class="source-card__field-label">{$_('tfeeds_src_for_you_events_label')}</span>
        <div class="source-card__match-mode" role="group" aria-label={$_('tfeeds_src_for_you_events_label')}>
          {#each EVENT_OPTIONS as ev (ev.id)}
            {@const id = ev.id}
            <button
              type="button"
              class="source-card__match-option"
              class:is-active={source.events.includes(id)}
              aria-pressed={source.events.includes(id)}
              onclick={() => toggleEvent(id)}
            >
              {$_(ev.key)}
            </button>
          {/each}
        </div>
      </div>
      <div class="source-card__field">
        <span class="source-card__field-label">{$_('tfeeds_src_period_label')}</span>
        <div class="source-card__match-mode" role="radiogroup" aria-label={$_('tfeeds_src_period_label')}>
          {#each HOUR_OPTIONS as o (o.hours)}
            <button
              type="button"
              class="source-card__match-option"
              class:is-active={source.withinHours === o.hours}
              aria-pressed={source.withinHours === o.hours}
              onclick={() => setForYouHours(o.hours)}
            >
              {$_(o.key, { n: o.n })}
            </button>
          {/each}
        </div>
        <span class="source-card__field-hint">{$_('tfeeds_src_for_you_hint')}</span>
      </div>
    {:else if source.kind === 'collection'}
      <div class="source-card__field">
        <span class="source-card__field-label">{$_('tfeeds_src_post_uri_label')}</span>
        {#if collectionUris.length === 0}
          <p class="source-card__list-empty">
            {$_('tfeeds_src_collection_list_empty')}
          </p>
        {:else}
          <ol class="source-card__list" {@attach collectionSortable.bindList}>
            {#each collectionUris as uri, i (uri)}
              <li
                class="source-card__list-item"
                data-sortable-row
                data-id={uri}
                data-dragging={collectionSortable.draggingId === uri ? '1' : '0'}
              >
                <button
                  type="button"
                  class="source-card__list-handle"
                  aria-label={$_('tfeeds_src_reorder')}
                  {@attach collectionSortable.bindHandle(uri)}
                >
                  <GripVertical size={14} strokeWidth={2} />
                </button>
                <span class="source-card__list-uri" title={uri}>
                  {uriPreview(uri)}
                </span>
                <button
                  type="button"
                  class="source-card__list-btn source-card__list-btn--danger"
                  aria-label={$_('tfeeds_src_remove')}
                  disabled={collectionUris.length <= 1}
                  onclick={() => removeCollection(i)}
                >
                  <X size={14} strokeWidth={2} />
                </button>
              </li>
            {/each}
          </ol>
        {/if}

        <div class="source-card__list-new">
          <input
            type="text"
            class="source-card__search-input"
            placeholder="at://did:plc:.../app.bsky.feed.post/xxxxxx"
            bind:value={newUriText}
            onfocus={() => feedBuilder.setActiveCard('source')}
            onkeydown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                appendCollection();
              }
            }}
          />
          <button
            type="button"
            class="source-card__list-add"
            aria-label={$_('tfeeds_src_add')}
            disabled={!newUriText.trim().startsWith('at://did:')}
            onclick={appendCollection}
          >
            <Plus size={16} strokeWidth={2} />
            <span>{$_('tfeeds_src_add')}</span>
          </button>
        </div>

        <details class="source-card__bulk">
          <summary class="source-card__bulk-summary">
            {$_('tfeeds_src_bulk_edit')}
          </summary>
          <label class="source-card__field">
            <textarea
              class="source-card__textarea"
              rows="4"
              placeholder="at://did:plc:.../app.bsky.feed.post/xxxxxx"
              bind:value={collectionText}
              onblur={commitCollection}
              onfocus={() => feedBuilder.setActiveCard('source')}
            ></textarea>
            <span class="source-card__field-hint">{$_('tfeeds_src_bulk_hint')}</span>
          </label>
        </details>
      </div>
    {:else if source.kind === 'feed'}
      <label class="source-card__field">
        <span class="source-card__field-label">{$_('tfeeds_src_feed_url_label')}</span>
        <input
          type="text"
          class="source-card__search-input"
          placeholder="https://bsky.app/profile/…/feed/…"
          bind:value={feedText}
          onblur={commitFeed}
          onfocus={() => feedBuilder.setActiveCard('source')}
        />
        <span class="source-card__field-hint">
          {$_('tfeeds_src_feed_hint')}
        </span>
      </label>
      {#if feedError}<p class="source-card__error">{feedError}</p>{/if}
      {#if source.feed}
        <p class="source-card__field-hint">{$_('tfeeds_src_feed_ref', { name: refName ?? '…' })}</p>
      {/if}
      {#if myFeeds.length > 0}
        <div class="source-card__field">
          <span class="source-card__field-label">{$_('tfeeds_src_my_feeds')}</span>
          <div class="source-card__feed-chips">
            {#each myFeeds as f (f.uri)}
              <button
                type="button"
                class="source-card__match-option"
                class:is-active={source.feed === f.uri}
                onclick={() => feedBuilder.setSource({ kind: 'feed', feed: f.uri })}
              >
                {f.record.name || f.rkey}
              </button>
            {/each}
          </div>
        </div>
      {/if}
    {:else if source.kind === 'advanced'}
      <div class="source-card__advanced">
        <p class="source-card__advanced-note">
          {$_('tfeeds_src_advanced_note_pre')}<code>{source.raw.$type.split('#')[1] ?? source.raw.$type}</code
          >{$_('tfeeds_src_advanced_note_post')}
        </p>
        <pre class="source-card__advanced-json">{JSON.stringify(
            source.raw,
            null,
            2
          )}</pre>
      </div>
    {/if}
  {/snippet}
</SectionCard>

<style lang="postcss">
  .source-card {
    &__segmented {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-self: flex-start;
      max-width: 100%;
    }

    &__pill {
      all: unset;
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 36px;
      padding: 0 12px;
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-2);
      background: var(--bg-color-1);
      color: var(--text-color-1);
      font: 500 13px var(--font-body);
      white-space: nowrap;
      cursor: pointer;
      transition:
        background-color var(--duration-fast) var(--ease-out),
        border-color var(--duration-fast) var(--ease-out),
        color var(--duration-fast) var(--ease-out);

      &:hover { border-color: var(--ink); }
      &.is-active {
        border-color: var(--ink);
        background: var(--ink);
        color: var(--base-bg-color);
        font-weight: 600;
      }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
    }

    &__match-mode {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-self: flex-start;
      max-width: 100%;
    }

    &__match-option {
      all: unset;
      box-sizing: border-box;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      min-height: 36px;
      padding: 0 12px;
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-2);
      background: var(--bg-color-1);
      color: var(--text-color-1);
      font: 500 13px var(--font-body);
      white-space: nowrap;
      cursor: pointer;
      transition:
        background-color var(--duration-fast) var(--ease-out),
        border-color var(--duration-fast) var(--ease-out),
        color var(--duration-fast) var(--ease-out);

      &:hover { border-color: var(--ink); }
      &.is-active {
        border-color: var(--ink);
        background: var(--ink);
        color: var(--base-bg-color);
        font-weight: 600;
      }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
    }

    &__scope {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    &__scope-tile {
      all: unset;
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px var(--space-4);
      border-radius: var(--radius-3);
      background-color: var(--bg-color-1);
      border: 1px solid var(--border-color-2);
      cursor: pointer;
      color: var(--text-color-2);
      transition:
        background-color var(--duration-fast) var(--ease-out),
        border-color var(--duration-fast) var(--ease-out),
        color var(--duration-fast) var(--ease-out);

      &:hover {
        background-color: var(--surface-hover);
        color: var(--text-color-1);
      }

      &.is-active {
        background-color: var(--primary-color-soft);
        border-color: var(--primary-color);
        box-shadow: inset 0 0 0 1px var(--primary-color);
        color: var(--text-color-1);
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
    }

    &__scope-tile:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    &__scope-tile > :global(svg) {
      flex-shrink: 0;
      color: var(--text-color-3);
      transition: color var(--duration-fast) var(--ease-out);
    }
    &__scope-tile.is-active > :global(svg) {
      color: var(--primary-color);
    }

    &__scope-text {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }

    &__scope-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-color-1);
      letter-spacing: 0.01em;
    }

    &__scope-hint {
      font-size: 12px;
      color: var(--text-color-3);
      line-height: 1.55;
    }

    &__advanced {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    &__advanced-note {
      font-size: 13px;
      color: var(--text-color-2);
      line-height: 1.6;
      margin: 0;

      & code {
        background-color: color-mix(in srgb, var(--text-color-1) 6%, transparent);
        padding: 1px 6px;
        border-radius: var(--radius-1);
        font-size: 12px;
      }
    }

    &__advanced-json {
      margin: 0;
      padding: var(--space-3);
      background-color: color-mix(in srgb, var(--text-color-1) 3%, transparent);
      border-radius: var(--radius-2);
      font-size: 12px;
      line-height: 1.55;
      color: var(--text-color-2);
      max-height: 240px;
      overflow: auto;
      white-space: pre;
    }

    &__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    &__field-label {
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      color: var(--text-color-3);
    }

    &__option {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px var(--space-3);
      border-radius: var(--radius-3);
      background-color: color-mix(in srgb, var(--text-color-1) 2%, transparent);
      cursor: pointer;
      transition: background-color var(--duration-fast) var(--ease-out);

      &:hover {
        background-color: color-mix(in srgb, var(--text-color-1) 4%, transparent);
      }

      &.is-disabled {
        cursor: not-allowed;
        opacity: 0.55;

        &:hover {
          background-color: color-mix(in srgb, var(--text-color-1) 2%, transparent);
        }
      }
    }

    &__option-checkbox {
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      margin-top: 2px;
      accent-color: var(--primary-color);
      cursor: inherit;
    }

    &__option > :global(svg) {
      flex-shrink: 0;
      margin-top: 1px;
      color: var(--text-color-3);
    }

    &__option-text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    &__option-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-color-1);
    }

    &__option-hint {
      font-size: 12px;
      color: var(--text-color-3);
      line-height: 1.55;
    }

    &__feed-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;

      & > button {
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    &__error {
      margin: 0;
      font-size: 12px;
      color: var(--danger-color);
    }

    &__field-hint {
      font-size: 12px;
      color: var(--text-color-3);
      line-height: 1.5;
    }

    &__textarea {
      width: 100%;
      padding: var(--space-3);
      border: 1px solid var(--border-color-2);
      border-radius: var(--radius-3);
      font-family: var(--code-font);
      font-size: 13px;
      line-height: 1.55;
      background: var(--bg-color-1);
      color: var(--text-color-1);
      resize: vertical;
      box-sizing: border-box;
      transition:
        border-color var(--duration-fast) var(--ease-out),
        box-shadow var(--duration-fast) var(--ease-out);

      &::placeholder { color: var(--text-color-3); }

      &:focus {
        outline: none;
        border-color: color-mix(in srgb, var(--cyan-color) 55%, var(--border-color-1));
        box-shadow: 0 0 0 3px var(--cyan-color-soft);
      }
    }

    &__search-input {
      width: 100%;
      padding: 10px var(--space-3);
      border: 1px solid var(--border-color-2);
      border-radius: var(--radius-3);
      background: var(--bg-color-1);
      color: var(--text-color-1);
      font: inherit;
      font-size: 15px;
      box-sizing: border-box;
      transition:
        border-color var(--duration-fast) var(--ease-out),
        box-shadow var(--duration-fast) var(--ease-out);

      &::placeholder { color: var(--text-color-3); }

      &:focus {
        outline: none;
        border-color: color-mix(in srgb, var(--cyan-color) 55%, var(--border-color-1));
        box-shadow: 0 0 0 3px var(--cyan-color-soft);
      }
    }

    &__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    &__list-empty {
      margin: 0;
      padding: var(--space-3);
      border: 1px dashed var(--border-color-2);
      border-radius: var(--radius-3);
      background: color-mix(in srgb, var(--text-color-1) 2%, transparent);
      color: var(--text-color-3);
      font-size: 13px;
      line-height: 1.55;
      text-align: center;
    }

    &__list-item {
      display: grid;
      grid-template-columns: auto 1fr auto;
      align-items: center;
      gap: var(--space-2);
      padding: 8px 10px;
      border: 1px solid var(--border-color-2);
      border-radius: var(--radius-3);
      background: var(--bg-color-1);
      transition: transform 220ms cubic-bezier(0.2, 0, 0, 1);
      will-change: transform;

      &[data-dragging='1'] {
        transition: none;
      }
    }

    &__list-handle {
      all: unset;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 26px;
      height: 26px;
      border-radius: var(--radius-2);
      color: var(--text-color-3);
      cursor: grab;
      touch-action: none;

      &:hover {
        background-color: var(--surface-hover);
        color: var(--text-color-1);
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }

      &:active {
        cursor: grabbing;
      }
    }

    &__list-uri {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-family: var(--code-font);
      font-size: 12px;
      color: var(--text-color-2);
    }

    &__list-btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border: 1px solid var(--border-color-2);
      border-radius: var(--radius-2);
      background: var(--bg-color-1);
      color: var(--text-color-2);
      cursor: pointer;
      transition:
        background-color var(--duration-fast) var(--ease-out),
        border-color var(--duration-fast) var(--ease-out),
        color var(--duration-fast) var(--ease-out);

      &:hover:not(:disabled) {
        background-color: var(--surface-hover);
        color: var(--text-color-1);
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }

      &:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }

      &--danger:hover:not(:disabled) {
        color: var(--color-red, var(--danger-color));
        border-color: var(--danger-color);
      }
    }

    &__list-new {
      display: flex;
      gap: var(--space-2);
      align-items: stretch;

      & > :first-child {
        flex: 1 1 auto;
        min-width: 0;
      }
    }

    &__list-add {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 0 14px;
      border: 1px solid var(--border-color-2);
      border-radius: var(--radius-3);
      background: var(--bg-color-1);
      color: var(--text-color-1);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition:
        background-color var(--duration-fast) var(--ease-out),
        border-color var(--duration-fast) var(--ease-out),
        color var(--duration-fast) var(--ease-out);

      &:hover:not(:disabled) {
        background-color: var(--surface-hover);
        border-color: color-mix(in srgb, var(--cyan-color) 45%, var(--border-color-1));
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }

    &__bulk {
      margin-top: var(--space-2);
      border-top: 1px solid var(--border-color-2);
      padding-top: var(--space-3);
    }

    &__bulk-summary {
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-color-3);
      user-select: none;

      &:hover { color: var(--text-color-1); }
      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
        border-radius: var(--radius-2);
      }
    }
  }

  :global(.sortable-ghost) {
    box-sizing: border-box;
    background-color: var(--bg-color-1);
    border: 1px solid var(--primary-color);
    border-radius: var(--radius-3);
    box-shadow: 0 14px 30px -10px rgba(0, 0, 0, 0.45);
    color: var(--text-color-1);
    user-select: none;
    cursor: grabbing;
    transition: none !important;
  }
</style>
