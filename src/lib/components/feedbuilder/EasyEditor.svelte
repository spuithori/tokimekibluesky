<script lang="ts">
  import Check from '@lucide/svelte/icons/check';
  import Plus from '@lucide/svelte/icons/plus';
  import X from '@lucide/svelte/icons/x';
  import type { Attachment } from 'svelte/attachments';
  import { _ } from 'tokimeki-i18n';
  import PopoverMenu from '$lib/components/feedbuilder/PopoverMenu.svelte';
  import { feedBuilder } from '$lib/feedbuilder/feedBuilder.svelte';
  import { makeLeaf } from '$lib/feedbuilder/filterModel';
  import { CUSTOM_FEED_DEFS as D, VIEWER_DID, type CustomFeedPredicate } from '$lib/feedbuilder/types';
  import { customFeeds } from '$lib/feedbuilder/customFeeds.svelte';
  import { feedKey, feedName, toFeedAtUri } from '$lib/feedbuilder/feeds';
  import DidPicker from './chips/DidPicker.svelte';
  import { getCachedProfile, resolveProfile } from '$lib/feedbuilder/profileResolver.svelte';
  import {
    EASY_SOURCES,
    LANGUAGES,
    MAX_PER_AUTHOR_CHOICES,
    MIN_LIKES_CHOICES,
    TIME_RANGE_CHOICES,
    WEEKDAY_CHOICES,
    WINDOW_CHOICES,
    JOINER_LABEL,
    addableConditions,
    appendCond,
    defaultJoiner,
    flattenConds,
    removeCond,
    replaceCond,
    toggleJoiner,
    setNegated,
    condLabel,
    easyConditionOf,
    easySentence,
    easySentenceText,
    easyUnits,
    easySourceId,
    easySorts,
    type EasyCondition,
    type EasySourceId,
    type EasyToken,
    type Joiner
  } from '$lib/feedbuilder/easyMode';

  const d = $derived(feedBuilder.draft);
  const tokens = $derived(easySentence(d));
  const units = $derived(easyUnits(tokens));
  const sourceId = $derived(easySourceId(d.source));
  const sorts = $derived(easySorts(d));
  const currentSort = $derived(sorts.find((o) => o.sort === d.sort));
  const addable = $derived(addableConditions(d));
  const flat = $derived(flattenConds(d.predicates));

  $effect(() => {
    for (const f of flat) {
      if (f.pred.$type === D.predicateAuthor && f.pred.did && f.pred.did !== VIEWER_DID && getCachedProfile(f.pred.did) === undefined) {
        void resolveProfile(f.pred.did);
      }
    }
  });

  function pickSource(id: EasySourceId) {
    if (id === sourceId) return;
    if (id === 'global') feedBuilder.setSource({ kind: 'timeline', scope: 'global' });
    else if (id === 'following') feedBuilder.setSource({ kind: 'timeline', scope: 'following' });
    else feedBuilder.setSourceKind(id);
    if (id === 'forYou' && feedBuilder.draft.sort === 'chronological') feedBuilder.setSort('relevance');
  }

  let refName = $state<string | null>(null);
  let feedError = $state<string | null>(null);
  $effect(() => {
    const uri = d.source.kind === 'feed' ? d.source.feed : '';
    refName = null;
    if (!uri) return;
    let alive = true;
    feedName(uri).then((n) => {
      if (alive) refName = n ?? feedKey(uri)?.rkey ?? null;
    });
    return () => {
      alive = false;
    };
  });
  const myFeeds = $derived(customFeeds.items.filter((f) => f.uri !== feedBuilder.originalUri));

  function sourceLabel(label: string): string {
    return d.source.kind === 'feed' && d.source.feed && refName ? $_('tfeeds_main_source_feed_named', { name: refName }) : label;
  }

  async function setFeedUrl(raw: string) {
    feedError = null;
    if (!raw.trim()) return;
    try {
      feedBuilder.setSource({ kind: 'feed', feed: await toFeedAtUri(raw) });
    } catch (e) {
      feedError = e instanceof Error ? e.message : $_('tfeeds_main_feed_error');
    }
  }

  function setQuery(q: string) {
    if (d.source.kind === 'search') feedBuilder.setSource({ ...d.source, query: q });
  }

  function predAt(index: number): CustomFeedPredicate {
    return flat[index].pred;
  }

  function update(index: number, p: CustomFeedPredicate) {
    feedBuilder.setPredicates(replaceCond(d.predicates, index, p));
  }

  let openOnMount = $state<number | null>(null);
  function autoOpen(index: number, toggle: () => void): Attachment<HTMLElement> {
    return (node) => {
      if (openOnMount === index) {
        openOnMount = null;
        queueMicrotask(() => {
          toggle();
          node.blur();
        });
      }
    };
  }

  function addCondition(c: EasyCondition, close: () => void, negated = false) {
    close();
    const p = makeLeaf(c.make(), negated);
    feedBuilder.setPredicates(appendCond(d.predicates, p, defaultJoiner(d.predicates, p)));
    if (c.id === 'keyword' || c.id === 'language' || c.id === 'minLikes' || c.id === 'timeOfDay' || c.id === 'author') {
      openOnMount = flattenConds(feedBuilder.draft.predicates).length - 1;
    }
  }

  function toggleLanguage(index: number, code: string) {
    const p = predAt(index);
    if (p.$type !== D.predicateLanguage) return;
    const codes = p.codes.includes(code) ? p.codes.filter((c) => c !== code) : [...p.codes, code];
    update(index, { ...p, codes });
  }

  function setThreshold(index: number, n: number) {
    const p = predAt(index);
    if (p.$type !== D.predicateMinLikes || !Number.isFinite(n) || n < 0) return;
    update(index, { ...p, threshold: Math.floor(n) });
  }

  function setTimeRange(index: number, start: string | undefined, end: string | undefined) {
    const p = predAt(index);
    if (p.$type !== D.predicateTimeOfDay) return;
    update(index, { ...p, start, end });
  }

  function setWeekdays(index: number, days: number[] | undefined) {
    const p = predAt(index);
    if (p.$type !== D.predicateTimeOfDay) return;
    update(index, { ...p, weekdays: days });
  }

  function setKeyword(index: number, value: string) {
    const p = predAt(index);
    if (p.$type !== D.predicateKeyword) return;
    update(index, { ...p, value });
  }

  function setAuthor(index: number, did: string) {
    const p = predAt(index);
    if (p.$type !== D.predicateAuthor) return;
    update(index, { ...p, did });
  }

  function removeCondition(index: number, close: () => void) {
    close();
    feedBuilder.setPredicates(removeCond(d.predicates, index));
  }

  function setNeg(index: number, negated: boolean) {
    feedBuilder.setPredicates(setNegated(d.predicates, index, negated));
  }

  function polarityLabel(c: EasyCondition, p: CustomFeedPredicate, negated: boolean): string {
    const base = condLabel(c, p, negated);
    if (c.id === 'author') {
      return negated
        ? $_('tfeeds_main_polarity_exclude', { label: c.label(p) })
        : $_('tfeeds_main_polarity_only', { label: c.label(p) });
    }
    if (c.id !== 'keyword') return base;
    return negated
      ? $_('tfeeds_main_polarity_not_contains', { label: base })
      : $_('tfeeds_main_polarity_contains', { label: base });
  }

  function flipJoiner(index: number) {
    feedBuilder.setPredicates(toggleJoiner(d.predicates, index));
  }

  function joinerHint(op: Joiner): string {
    return $_('tfeeds_main_joiner_hint', { op: JOINER_LABEL[op], next: JOINER_LABEL[op === 'and' ? 'or' : 'and'] });
  }

  function closeOnEnter(e: KeyboardEvent, close: () => void) {
    if (e.key !== 'Enter' || e.isComposing) return;
    e.preventDefault();
    close();
  }

  function perAuthorLabel(n: number | undefined): string {
    return n === undefined ? $_('tfeeds_main_per_author_none') : $_('tfeeds_main_per_author_n', { n });
  }
</script>

{#snippet renderToken(t: EasyToken)}
      {#if t.kind === 'text'}
        <span
          class="easy__text"
          class:is-open={t.text === $_('tfeeds_paren_open')}
          class:is-close={t.text.startsWith($_('tfeeds_paren_close'))}
          aria-hidden="true">{t.text}</span
        >
      {:else if t.kind === 'join'}
        <button
          type="button"
          class="easy__join"
          class:is-or={t.op === 'or'}
          aria-label={joinerHint(t.op)}
          title={joinerHint(t.op)}
          onclick={() => flipJoiner(t.index)}
        >
          {#key t.op}<span class="easy__join-label">{JOINER_LABEL[t.op]}</span>{/key}
        </button>
      {:else if t.kind === 'source'}
        <PopoverMenu placement="bottom-start">
          {#snippet trigger({ ref, toggle, open })}
            <button
              type="button"
              class="easy__word easy__word--key"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-label={$_('tfeeds_main_source_aria', { label: sourceLabel(t.label) })}
              {@attach ref}
              onclick={toggle}>{sourceLabel(t.label)}</button
            >
          {/snippet}
          {#snippet menu({ content, close })}
            <div class="easy-pop" role="group" aria-label={$_('tfeeds_main_source')} {@attach content}>
              <div role="radiogroup" aria-label={$_('tfeeds_main_source')} class="easy-pop__list">
                {#each EASY_SOURCES as o (o.id)}
                  <label class="easy-pop__option" class:is-on={sourceId === o.id}>
                    <input
                      type="radio"
                      name="easy-source"
                      checked={sourceId === o.id}
                      onchange={() => {
                        pickSource(o.id);
                        if (o.id !== 'search' && o.id !== 'feed') close();
                      }}
                    />
                    {o.label}
                  </label>
                {/each}
              </div>
              {#if d.source.kind === 'feed'}
                {#if myFeeds.length > 0}
                  <fieldset class="easy-pop__list">
                    <legend class="easy__label">{$_('tfeeds_main_from_my_feeds')}</legend>
                    {#each myFeeds as f (f.uri)}
                      <label class="easy-pop__option" class:is-on={d.source.feed === f.uri}>
                        <input
                          type="radio"
                          name="easy-feed"
                          checked={d.source.feed === f.uri}
                          onchange={() => {
                            feedBuilder.setSource({ kind: 'feed', feed: f.uri });
                            close();
                          }}
                        />
                        {f.record.name || f.rkey}
                      </label>
                    {/each}
                  </fieldset>
                {/if}
                <label class="easy-pop__field">
                  <span class="easy__label">{$_('tfeeds_main_feed_url')}</span>
                  <input
                    type="url"
                    placeholder="https://bsky.app/profile/…/feed/…"
                    onchange={(e) => setFeedUrl(e.currentTarget.value)}
                    onkeydown={(e) => closeOnEnter(e, close)}
                  />
                </label>
                {#if feedError}<p class="easy-pop__error">{feedError}</p>{/if}
              {/if}
              {#if d.source.kind === 'search'}
                <label class="easy-pop__field">
                  <span class="easy__label">{$_('tfeeds_main_search_query')}</span>
                  <!-- svelte-ignore a11y_autofocus -->
                  <input
                    type="search"
                    value={d.source.query}
                    oninput={(e) => setQuery(e.currentTarget.value)}
                    onkeydown={(e) => closeOnEnter(e, close)}
                    autofocus
                  />
                </label>
              {/if}
            </div>
          {/snippet}
        </PopoverMenu>
      {:else if t.kind === 'cond'}
        {@const index = t.index}
        {@const cond = easyConditionOf(flat[index].pred)}
        {@const pred = predAt(index)}
        {@const negated = flat[index].negated}
        <PopoverMenu placement="bottom-start">
          {#snippet trigger({ ref, toggle, open })}
            <button
              type="button"
              class="easy__word easy__word--cond"
              class:is-negated={negated}
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-label={$_('tfeeds_main_cond_aria', { label: t.label })}
              {@attach ref}
              {@attach autoOpen(index, toggle)}
              onclick={toggle}>{t.label}</button
            >
          {/snippet}
          {#snippet menu({ content, close })}
            <div class="easy-pop" role="group" aria-label={$_('tfeeds_main_cond_aria', { label: cond?.menuLabel ?? '' })} {@attach content}>
              {#if cond}
                <div class="easy-pop__seg easy-pop__seg--2" role="radiogroup" aria-label={$_('tfeeds_main_polarity_group')}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={!negated}
                    class:is-on={!negated}
                    onclick={() => setNeg(index, false)}>{polarityLabel(cond, pred, false)}</button
                  >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={negated}
                    class:is-on={negated}
                    class="is-neg"
                    onclick={() => setNeg(index, true)}>{polarityLabel(cond, pred, true)}</button
                  >
                </div>
              {/if}
              {#if pred.$type === D.predicateLanguage}
                <fieldset class="easy-pop__list">
                  <legend class="easy__label">{$_('tfeeds_easy_c_language')}</legend>
                  {#each LANGUAGES as l (l.code)}
                    <label class="easy-pop__option" class:is-on={pred.codes.includes(l.code)}>
                      <input
                        type="checkbox"
                        checked={pred.codes.includes(l.code)}
                        onchange={() => toggleLanguage(index, l.code)}
                      />
                      {l.label}
                    </label>
                  {/each}
                </fieldset>
              {:else if pred.$type === D.predicateMinLikes}
                <fieldset class="easy-pop__list">
                  <legend class="easy__label">{$_('tfeeds_easy_c_min_likes_menu')}</legend>
                  {#each MIN_LIKES_CHOICES as n (n)}
                    <label class="easy-pop__option" class:is-on={pred.threshold === n}>
                      <input
                        type="radio"
                        name="easy-min-likes-{index}"
                        checked={pred.threshold === n}
                        onchange={() => setThreshold(index, n)}
                      />
                      {$_('tfeeds_main_min_likes_n', { n })}
                    </label>
                  {/each}
                </fieldset>
                <label class="easy-pop__field">
                  <span class="easy__label">{$_('tfeeds_main_other_number')}</span>
                  <input
                    type="number"
                    min="0"
                    inputmode="numeric"
                    value={pred.threshold}
                    onchange={(e) => setThreshold(index, Number(e.currentTarget.value))}
                  />
                </label>
              {:else if pred.$type === D.predicateTimeOfDay}
                {@const custom = !TIME_RANGE_CHOICES.some((c) => c.start === pred.start && c.end === pred.end)}
                <fieldset class="easy-pop__list">
                  <legend class="easy__label">{$_('tfeeds_main_time_range_tz', { tz: pred.timezone ?? 'UTC' })}</legend>
                  {#each TIME_RANGE_CHOICES as c (c.label)}
                    <label class="easy-pop__option" class:is-on={pred.start === c.start && pred.end === c.end}>
                      <input
                        type="radio"
                        name="easy-time-{index}"
                        checked={pred.start === c.start && pred.end === c.end}
                        onchange={() => setTimeRange(index, c.start, c.end)}
                      />
                      {c.label}
                    </label>
                  {/each}
                  {#if custom}
                    <p class="easy__label">{$_('tfeeds_main_time_custom', { start: pred.start ?? '00:00', end: pred.end ?? '24:00' })}</p>
                  {/if}
                </fieldset>
                <div class="easy-pop__seg" role="radiogroup" aria-label={$_('tfeeds_main_weekdays')}>
                  {#each WEEKDAY_CHOICES as w (w.label)}
                    {@const on = (pred.weekdays ?? []).join() === (w.days ?? []).join()}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={on}
                      class:is-on={on}
                      onclick={() => setWeekdays(index, w.days)}>{w.label}</button
                    >
                  {/each}
                </div>
              {:else if pred.$type === D.predicateAuthor}
                <div class="easy-pop__field">
                  <span class="easy__label">{$_('tfeeds_main_author_search')}</span>
                  <DidPicker value={pred.did} onChange={(did) => setAuthor(index, did)} />
                </div>
              {:else if pred.$type === D.predicateKeyword}
                <label class="easy-pop__field">
                  <span class="easy__label">{$_('tfeeds_main_keyword_contains')}</span>
                  <!-- svelte-ignore a11y_autofocus -->
                  <input
                    type="text"
                    value={pred.value}
                    oninput={(e) => setKeyword(index, e.currentTarget.value)}
                    onkeydown={(e) => closeOnEnter(e, close)}
                    autofocus
                  />
                </label>
              {/if}
              <button type="button" class="easy-pop__remove" onclick={() => removeCondition(index, close)}>
                <X size={14} strokeWidth={2} aria-hidden="true" />
                {$_('tfeeds_main_remove_cond')}
              </button>
            </div>
          {/snippet}
        </PopoverMenu>
      {:else if t.kind === 'sort'}
        <PopoverMenu placement="bottom-start">
          {#snippet trigger({ ref, toggle, open })}
            <button
              type="button"
              class="easy__word easy__word--key"
              aria-haspopup="dialog"
              aria-expanded={open}
              aria-label={$_('tfeeds_main_sort_aria', { label: t.label })}
              {@attach ref}
              onclick={toggle}>{t.label}</button
            >
          {/snippet}
          {#snippet menu({ content, close })}
            <div class="easy-pop" role="group" aria-label={$_('tfeeds_main_sort')} {@attach content}>
              <div role="radiogroup" aria-label={$_('tfeeds_main_sort')} class="easy-pop__list">
                {#each sorts as o (o.sort)}
                  <label class="easy-pop__option" class:is-on={d.sort === o.sort}>
                    <input
                      type="radio"
                      name="easy-sort"
                      checked={d.sort === o.sort}
                      onchange={() => {
                        feedBuilder.setSort(o.sort);
                        if (!o.windowed) close();
                      }}
                    />
                    {o.label}
                  </label>
                {/each}
              </div>
              {#if currentSort?.windowed}
                <div class="easy-pop__seg" role="radiogroup" aria-label={$_('tfeeds_main_window')}>
                  {#each WINDOW_CHOICES as w (w.label)}
                    <button
                      type="button"
                      role="radio"
                      aria-checked={d.sortWindow === w.value}
                      class:is-on={d.sortWindow === w.value}
                      onclick={() => feedBuilder.setSortWindow(w.value)}>{w.label}</button
                    >
                  {/each}
                </div>
              {/if}
            </div>
          {/snippet}
        </PopoverMenu>
      {/if}
{/snippet}

<div class="easy">
  <div class="easy__sentence" role="group" aria-label={$_('tfeeds_main_sentence_aria', { text: easySentenceText(d) })}>
    {#each units as u (u.key)}
      <span class="easy__unit">
        {#each u.tokens as t, k (k)}
          {@render renderToken(t)}
        {/each}
      </span>
    {/each}
    {#if addable.length > 0}
      <PopoverMenu placement="bottom-start">
        {#snippet trigger({ ref, toggle, open })}
          <button
            type="button"
            class="easy__add"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={$_('tfeeds_main_add_cond')}
            {@attach ref}
            onclick={toggle}
          >
            <Plus size={20} strokeWidth={2.75} aria-hidden="true" />
          </button>
        {/snippet}
        {#snippet menu({ content, close })}
          <div class="easy-pop" role="group" aria-label={$_('tfeeds_main_add_cond')} {@attach content}>
            <ul class="easy-pop__list">
              {#each addable as c (c.id)}
                <li>
                  <button type="button" class="easy-pop__option" onclick={() => addCondition(c, close)}>
                    {c.menuLabel}
                  </button>
                </li>
                {#if c.id === 'keyword'}
                  <li>
                    <button type="button" class="easy-pop__option" onclick={() => addCondition(c, close, true)}>
                      {$_('tfeeds_main_add_keyword_neg')}
                    </button>
                  </li>
                {:else if c.id === 'author'}
                  <li>
                    <button type="button" class="easy-pop__option" onclick={() => addCondition(c, close, true)}>
                      {$_('tfeeds_main_add_author_neg')}
                    </button>
                  </li>
                {/if}
              {/each}
            </ul>
          </div>
        {/snippet}
      </PopoverMenu>
    {/if}
  </div>

  <div class="easy__display" role="group" aria-label={$_('tfeeds_main_display')}>
    <button
      type="button"
      class="easy__toggle"
      aria-pressed={d.hideSeen === true}
      onclick={() => feedBuilder.setHideSeen(d.hideSeen !== true)}
    >
      <span class="easy__check" aria-hidden="true">
        {#if d.hideSeen === true}<Check size={12} strokeWidth={3} />{/if}
      </span>
      {$_('tfeeds_main_hide_seen')}
    </button>
    <label class="easy__select">
      <span>{$_('tfeeds_main_per_author')}</span>
      <select
        value={d.maxPerAuthor === undefined ? '' : String(d.maxPerAuthor)}
        onchange={(e) => {
          const v = e.currentTarget.value;
          feedBuilder.setMaxPerAuthor(v === '' ? undefined : Number(v));
        }}
      >
        {#each MAX_PER_AUTHOR_CHOICES as n (n ?? 'none')}
          <option value={n === undefined ? '' : String(n)}>{perAuthorLabel(n)}</option>
        {/each}
      </select>
    </label>
    <label class="easy__select">
      <span>{$_('tfeeds_main_visibility')}</span>
      <select
        value={d.visibility}
        onchange={(e) => feedBuilder.setVisibility(e.currentTarget.value as 'private' | 'public')}
      >
        <option value="private">{$_('tfeeds_main_visibility_private')}</option>
        <option value="public">{$_('tfeeds_main_visibility_public')}</option>
      </select>
    </label>
  </div>
</div>

<style lang="postcss">
  .easy {
    display: flex;
    flex-direction: column;
    gap: var(--space-8);
    padding: var(--space-2) 0 var(--space-6);

    &__label {
      font-family: var(--code-font);
      font-size: 11px;
      letter-spacing: 0.1em;
      color: var(--text-color-3);
    }

    &__sentence {
      --chip-h: max(1.7em, 44px);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 0.45em 0.28em;
      margin: 0;
      max-width: 920px;
      font-size: clamp(22px, 2.6vw, 34px);
      font-weight: 600;
      line-height: 1;
      letter-spacing: -0.01em;
      font-feature-settings: 'palt';
      text-spacing-trim: trim-both;
    }

    &__unit {
      align-self: stretch;
      display: inline-flex;
      align-items: center;
      gap: 0.28em;
    }

    &__text {
      display: inline-flex;
      align-items: center;
      height: var(--chip-h);

      &.is-open { margin-right: -0.18em; }
      &.is-close { margin-left: -0.18em; }
    }

    &__word {
      --lift: 0px;
      --shadow: 0px;
      display: inline-flex;
      align-items: center;
      height: var(--chip-h);
      padding: 0 0.42em;
      border: 2px solid var(--ink);
      border-radius: var(--radius-2);
      background: var(--bg-color-1);
      color: var(--text-color-1);
      font: inherit;
      line-height: 1;
      white-space: nowrap;
      cursor: pointer;
      transform: translate(calc(var(--lift) * -1), calc(var(--lift) * -1));
      box-shadow: var(--shadow) var(--shadow) 0 var(--ink-shadow);
      animation: rise-in var(--duration-slow) var(--ease-out);
      transition:
        transform var(--duration-fast) var(--ease-out),
        box-shadow var(--duration-fast) var(--ease-out),
        background-color var(--duration-fast) var(--ease-out),
        color var(--duration-fast) var(--ease-out);

      &:hover { --lift: 2px; --shadow: 4px; }
      &:active { --lift: 0px; --shadow: 0px; }

      &.is-negated:not([aria-expanded='true']) {
        border-color: var(--danger-color);
        color: var(--danger-color);
      }

      &--key {
        border-width: 3px;
        --shadow: 4px;

        &:hover { --lift: 2px; --shadow: 6px; }
        &:active { --lift: 0px; --shadow: 1px; }
      }

      &[aria-expanded='true'] {
        --lift: 0px;
        --shadow: 0px;
        border-color: var(--primary-color);
        background: var(--primary-color);
        color: var(--on-primary);
      }

      &:focus-visible {
        outline: 3px solid var(--primary-color);
        outline-offset: 3px;
      }
    }

    &__join {
      align-self: stretch;
      display: inline-flex;
      align-items: center;
      min-width: 44px;
      justify-content: center;
      padding: 0 0.15em;
      border: 0;
      border-radius: var(--radius-2);
      background: transparent;
      color: var(--text-color-2);
      font: inherit;
      font-size: 0.6em;
      font-weight: 600;
      cursor: pointer;
      transition: background-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);

      &:hover { background: var(--surface-hover); color: var(--text-color-1); }
      &.is-or { color: var(--primary-color); }
      &:focus-visible { outline: 3px solid var(--primary-color); outline-offset: 2px; }
    }

    &__join-label {
      padding-bottom: 2px;
      border-bottom: 2px dashed currentColor;
      animation: rise-in var(--duration-mid) var(--ease-out);
    }

    &__add {
      display: inline-grid;
      place-items: center;
      width: var(--chip-h);
      height: var(--chip-h);
      border: 2px dashed var(--text-color-3);
      border-radius: var(--radius-2);
      background: transparent;
      color: var(--text-color-1);
      cursor: pointer;
      transition:
        border-color var(--duration-fast) var(--ease-out),
        background-color var(--duration-fast) var(--ease-out),
        transform var(--duration-fast) var(--ease-out);

      :global(svg) { width: 0.62em; height: 0.62em; }

      &:hover { border-style: solid; border-color: var(--ink); background: var(--bg-color-1); }
      &:active { transform: translateY(1px); }
      &[aria-expanded='true'] {
        border-style: solid;
        border-color: var(--primary-color);
        background: var(--primary-color);
        color: var(--on-primary);
      }
      &:focus-visible { outline: 3px solid var(--primary-color); outline-offset: 3px; }
    }

    &__display {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      align-items: center;
    }

    &__toggle {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 40px;
      padding: 0 14px;
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-2);
      background: var(--bg-color-1);
      color: var(--text-color-1);
      font-size: 13px;
      cursor: pointer;
      transition: background-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);

      &[aria-pressed='true'] {
        background: var(--ink);
        border-color: var(--ink);
        color: var(--base-bg-color);
      }
    }

    &__check {
      display: inline-grid;
      place-items: center;
      width: 14px;
      height: 14px;
      border: 1.5px solid currentColor;
    }

    &__select {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      min-height: 40px;
      padding: 0 4px 0 14px;
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-2);
      background: var(--bg-color-1);
      font-size: 13px;
      color: var(--text-color-2);

      select {
        min-height: 38px;
        border: 0;
        background: transparent;
        color: var(--text-color-1);
        font: 500 13px var(--font-body);
        cursor: pointer;
      }

      &:focus-within {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }

      select:focus-visible { outline: 0; }
    }
  }

  .easy-pop {
    min-width: 240px;
    max-width: min(360px, calc(100vw - 32px));
    background: var(--bg-color-1);
    color: var(--text-color-1);
    border: var(--line-strong);
    border-radius: var(--radius-2);
    box-shadow: var(--shadow-pop);
    animation: rise-in var(--duration-mid) var(--ease-out);
    font-size: 15px;

    &__error {
      margin: 0;
      padding: 0 var(--space-4) var(--space-3);
      font-size: 13px;
      color: var(--danger-color);
    }

    &__list {
      display: flex;
      flex-direction: column;
      margin: 0;
      padding: 0;
      border: 0;
      list-style: none;

      legend {
        padding: var(--space-3) var(--space-4) var(--space-1);
      }
    }

    &__option {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      width: 100%;
      min-height: 48px;
      padding: 0 var(--space-4);
      border: 0;
      border-bottom: 1px solid var(--hairline-faint);
      background: transparent;
      color: inherit;
      font: inherit;
      text-align: left;
      cursor: pointer;

      &:hover { background: var(--surface-hover); }
      &.is-on { background: var(--primary-color-soft); font-weight: 600; }

      input { accent-color: var(--primary-color); width: 16px; height: 16px; }
    }

    &__field {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      padding: var(--space-3) var(--space-4);

      input {
        min-height: 40px;
        padding: 0 var(--space-3);
        border: 1px solid var(--border-color-1);
        border-radius: var(--radius-2);
        background: var(--bg-color-1);
        color: var(--text-color-1);
        font: 500 15px var(--font-body);

        &:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 0; border-color: var(--primary-color); }
      }
    }

    &__seg {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      margin: var(--space-3) var(--space-4);
      border: var(--line-strong);

      button {
        min-height: 36px;
        border: 0;
        border-left: 1px solid var(--ink);
        background: transparent;
        color: var(--text-color-1);
        font: 500 13px var(--code-font);
        cursor: pointer;
        transition: background-color var(--duration-fast) var(--ease-out), color var(--duration-fast) var(--ease-out);

        &:first-child { border-left: 0; }
        &.is-on { background: var(--ink); color: var(--base-bg-color); }
      }
    }

    &__seg--2 {
      grid-template-columns: repeat(2, minmax(0, 1fr));

      button {
        min-height: 40px;
        padding: 0 var(--space-2);
        font: 600 13px var(--font-body);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;

        &.is-neg.is-on { background: var(--danger-color); color: var(--bg-color-1); }
      }
    }

    &__remove {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      min-height: 44px;
      padding: 0 var(--space-4);
      border: 0;
      border-top: 1px solid var(--hairline);
      background: transparent;
      color: var(--danger-color);
      font: 500 14px var(--font-body);
      cursor: pointer;

      &:hover { background: var(--surface-hover); }
    }
  }
</style>
