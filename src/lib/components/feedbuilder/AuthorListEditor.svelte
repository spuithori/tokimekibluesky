<script lang="ts">
  import X from '@lucide/svelte/icons/x';
  import { _ } from 'tokimeki-i18n';
  import FbAvatar from '$lib/components/feedbuilder/FbAvatar.svelte';
  import ActorTypeahead from '$lib/components/feedbuilder/ActorTypeahead.svelte';
  import { xrpcQuery } from '$lib/feedbuilder/api';
  import { getCachedProfile, primeProfile, resolveProfile } from '$lib/feedbuilder/profileResolver.svelte';
  import type { ProfileViewDetailed } from '$lib/feedbuilder/types';

  interface Props {
    dids: string[];
    onChange: (dids: string[]) => void;
    onFocus?: () => void;
    id?: string;
  }

  let { dids, onChange, onFocus, id = 'authors-input' }: Props = $props();

  let text = $state('');
  let resolving = $state(false);
  let notFound = $state<string[]>([]);

  const DID_RE = /^did:(plc|web):[a-zA-Z0-9._:%-]+$/;

  $effect(() => {
    for (const did of dids) {
      if (getCachedProfile(did) === undefined) void resolveProfile(did);
    }
  });

  function add(list: string[]) {
    const next = [...dids];
    for (const d of list) if (!next.includes(d)) next.push(d);
    if (next.length !== dids.length) onChange(next);
  }

  function remove(did: string) {
    onChange(dids.filter((d) => d !== did));
  }

  function pick(actor: { did: string; handle: string; displayName?: string; avatar?: string }) {
    primeProfile(actor as ProfileViewDetailed);
    notFound = [];
    add([actor.did]);
  }

  async function addTyped() {
    const tokens = text
      .split(/[\s,、]+/)
      .map((t) => t.trim().replace(/^@/, ''))
      .filter((t) => t.length > 0);
    if (tokens.length === 0) return;
    resolving = true;
    notFound = [];
    const results = await Promise.all(
      tokens.map(async (t) => {
        if (DID_RE.test(t)) return { token: t, did: t };
        try {
          const r = await xrpcQuery<{ did: string }>('com.atproto.identity.resolveHandle', { handle: t });
          return { token: t, did: r.did };
        } catch {
          return { token: t, did: null };
        }
      })
    );
    resolving = false;
    add(results.flatMap((r) => (r.did ? [r.did] : [])));
    notFound = results.filter((r) => !r.did).map((r) => r.token);
    text = notFound.join(' ');
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key !== 'Enter' || e.isComposing || e.defaultPrevented) return;
    e.preventDefault();
    void addTyped();
  }

  function nameOf(did: string): string {
    const p = getCachedProfile(did);
    return p?.handle ? `@${p.handle}` : did;
  }
</script>

<div class="authors" onfocusin={() => onFocus?.()}>
  {#if dids.length > 0}
    <ul class="authors__list" aria-label={$_('tfeeds_src_authors_list', { n: dids.length })}>
      {#each dids as did (did)}
        {@const p = getCachedProfile(did)}
        <li class="authors__chip">
          <FbAvatar src={p?.avatar} handle={p?.handle ?? ''} size={20} />
          <span class="authors__name">
            {#if p}
              {#if p.displayName?.trim()}<strong>{p.displayName}</strong>{/if}
              <span class="authors__handle">@{p.handle}</span>
            {:else}
              <code>{did}</code>
            {/if}
          </span>
          <button type="button" class="authors__remove" aria-label={$_('tfeeds_src_authors_remove', { name: nameOf(did) })} onclick={() => remove(did)}>
            <X size={12} strokeWidth={2.4} aria-hidden="true" />
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="authors__input" onkeydown={onKeydown}>
    <ActorTypeahead
      bind:value={text}
      onPick={pick}
      {id}
      name="author"
      ariaLabel={$_('tfeeds_src_authors_add')}
      placeholder={$_('tfeeds_src_authors_placeholder')}
    />
  </div>
  {#if resolving}
    <p class="authors__note" aria-live="polite">{$_('tfeeds_src_authors_resolving')}</p>
  {:else if notFound.length > 0}
    <p class="authors__note authors__note--error" aria-live="polite">
      {$_('tfeeds_src_authors_not_found', { list: notFound.map((t) => `@${t}`).join($_('tfeeds_src_list_sep')) })}
    </p>
  {/if}
</div>

<style lang="postcss">
  .authors {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    min-width: 0;

    &__list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    &__chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      max-width: 100%;
      padding: 3px 4px 3px 3px;
      border: 1px solid var(--border-color-2);
      border-radius: var(--radius-pill);
      background: var(--bg-color-2);
    }

    &__name {
      display: inline-flex;
      align-items: baseline;
      gap: 6px;
      min-width: 0;
      font-size: 12px;
      color: var(--text-color-2);
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;

      & > strong {
        font-weight: 600;
        color: var(--text-color-1);
        overflow: hidden;
        text-overflow: ellipsis;
      }

      & > code {
        font-family: var(--code-font);
        font-size: 11px;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }

    &__handle {
      color: var(--text-color-3);
    }

    &__remove {
      all: unset;
      flex-shrink: 0;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      color: var(--text-color-3);
      cursor: pointer;

      &:hover {
        background: var(--surface-hover);
        color: var(--text-color-1);
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 1px;
      }
    }

    &__input {
      display: flex;
    }

    &__note {
      margin: 0;
      font-size: 12px;
      color: var(--text-color-3);

      &--error {
        color: var(--danger-color);
      }
    }
  }
</style>
