<script lang="ts">
  import { _ } from 'tokimeki-i18n';
  import { xrpcQuery } from '$lib/feedbuilder/api';
  import FbAvatar from '$lib/components/feedbuilder/FbAvatar.svelte';
  import {
    getCachedProfile,
    resolveProfile
  } from '$lib/feedbuilder/profileResolver.svelte';
  import type { ProfileViewBasic, ProfileViewDetailed } from '$lib/feedbuilder/types';

  interface Props {
    value: string;
    onChange: (did: string) => void;
    placeholder?: string;
  }

  let { value, onChange, placeholder }: Props = $props();

  let query = $state('');
  let results = $state<ProfileViewBasic[]>([]);
  let loading = $state(false);
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  let resolved = $state<ProfileViewDetailed | null>(null);

  $effect(() => {
    if (!value) {
      resolved = null;
      query = '';
      return;
    }
    const cached = getCachedProfile(value);
    if (cached !== undefined) {
      resolved = cached;
      if (cached?.handle) query = `@${cached.handle}`;
      else query = value;
      return;
    }
    let alive = true;
    resolved = null;
    if (!query) query = value;
    resolveProfile(value).then((p) => {
      if (!alive) return;
      resolved = p;
      if (p?.handle) query = `@${p.handle}`;
    });
    return () => {
      alive = false;
    };
  });

  const DID_RE = /^did:(plc|web):[a-zA-Z0-9._:%-]+$/;

  function isLikelyDid(s: string): boolean {
    return DID_RE.test(s.trim());
  }

  function onInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value;
    query = raw;

    if (debounceTimer) clearTimeout(debounceTimer);

    if (isLikelyDid(raw)) {
      onChange(raw.trim());
      results = [];
      return;
    }

    const q = raw.trim().replace(/^@/, '');
    if (q.length === 0) {
      results = [];
      loading = false;
      return;
    }

    loading = true;
    debounceTimer = setTimeout(() => {
      void runSearch(q);
    }, 200);
  }

  async function runSearch(q: string): Promise<void> {
    try {
      const res = await xrpcQuery<{ actors: ProfileViewBasic[] }>(
        'app.bsky.actor.searchActorsTypeahead',
        { q, limit: 8 }
      );
      results = res.actors;
    } catch (err) {
      console.error('[DidPicker] searchActorsTypeahead failed:', err);
      results = [];
    } finally {
      loading = false;
    }
  }

  function select(actor: ProfileViewBasic) {
    onChange(actor.did);
    query = `@${actor.handle}`;
    results = [];
  }
</script>

<div class="did-picker">
  <input
    type="text"
    class="did-picker__input"
    placeholder={placeholder ?? $_('tfeeds_src_did_placeholder')}
    value={query}
    oninput={onInput}
    autocomplete="off"
    spellcheck="false"
  />

  {#if value && resolved}
    <div class="did-picker__current">
      <FbAvatar src={resolved.avatar} handle={resolved.handle} size={18} />
      <span class="did-picker__current-text">
        {#if resolved.displayName}
          <strong>{resolved.displayName}</strong>
        {/if}
        <span class="did-picker__current-handle">@{resolved.handle}</span>
      </span>
    </div>
  {:else if value && !isLikelyDid(query) && query.trim() !== value}
    <p class="did-picker__current-raw">{$_('tfeeds_src_did_current')} <code>{value}</code></p>
  {/if}

  {#if loading}
    <p class="did-picker__status">{$_('tfeeds_src_did_searching')}</p>
  {:else if results.length > 0}
    <ul class="did-picker__list">
      {#each results as actor (actor.did)}
        <li>
          <button
            type="button"
            class="did-picker__result"
            onclick={() => select(actor)}
          >
            <FbAvatar src={actor.avatar} handle={actor.handle} size={28} />
            <span class="did-picker__name-col">
              {#if actor.displayName}
                <span class="did-picker__name">{actor.displayName}</span>
              {/if}
              <span class="did-picker__handle">@{actor.handle}</span>
            </span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style lang="postcss">
  .did-picker {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;

    &__input {
      width: 100%;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--border-color-2);
      border-radius: var(--radius-2);
      background: var(--bg-color-2);
      color: var(--text-color-1);
      font: inherit;
      font-size: 0.9rem;
      box-sizing: border-box;
      transition:
        border-color var(--duration-fast) var(--ease-out),
        box-shadow var(--duration-fast) var(--ease-out);

      &::placeholder {
        color: var(--text-color-3);
      }

      &:focus {
        outline: none;
        border-color: color-mix(in srgb, var(--cyan-color) 55%, var(--border-color-1));
        background: var(--bg-color-1);
        box-shadow: 0 0 0 3px var(--cyan-color-soft);
      }
    }

    &__current {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      padding: 4px 10px 4px 4px;
      background-color: var(--bg-color-2);
      border: 1px solid var(--border-color-2);
      border-radius: var(--radius-pill);
      align-self: flex-start;
    }

    &__current-text {
      display: inline-flex;
      align-items: baseline;
      gap: 6px;
      min-width: 0;
      font-size: 12px;
      color: var(--text-color-2);

      & > strong {
        font-weight: 600;
        color: var(--text-color-1);
      }
    }

    &__current-handle {
      color: var(--text-color-3);
    }

    &__current-raw {
      margin: 0;
      font-size: 11px;
      color: var(--text-color-3);

      & > code {
        font-family: var(--code-font);
        font-size: 11px;
        background: var(--bg-color-3);
        padding: 1px 6px;
        border-radius: var(--radius-1);
        color: var(--text-color-2);
      }
    }

    &__status {
      margin: 0;
      padding: var(--space-2);
      color: var(--text-color-3);
      font-size: 12px;
      text-align: center;
    }

    &__list {
      list-style: none;
      padding: 4px;
      margin: 0;
      border: 1px solid var(--border-color-2);
      border-radius: var(--radius-3);
      background: var(--bg-color-1);
      max-height: 200px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 1px;
    }

    &__result {
      all: unset;
      display: flex;
      align-items: center;
      gap: var(--space-2);
      width: 100%;
      padding: 6px var(--space-2);
      border-radius: var(--radius-2);
      cursor: pointer;
      box-sizing: border-box;
      transition: background-color var(--duration-fast) var(--ease-out);

      &:hover {
        background: var(--surface-hover);
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: -1px;
      }
    }

    &__name-col {
      display: flex;
      flex-direction: column;
      min-width: 0;
      flex: 1;
    }

    &__name {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-color-1);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__handle {
      font-size: 11px;
      color: var(--text-color-3);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
</style>
