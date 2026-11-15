<script lang="ts">
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import X from '@lucide/svelte/icons/x';
  import Search from '@lucide/svelte/icons/search';
  import ChevronRight from '@lucide/svelte/icons/chevron-right';
  import Clock from '@lucide/svelte/icons/clock';
  import CornerDownLeft from '@lucide/svelte/icons/corner-down-left';
  import type { Snippet } from 'svelte';
  import { _ } from 'tokimeki-i18n';
  import { goto } from '$app/navigation';
  import { agent } from '$lib/stores';
  import { createDebouncedSearch } from '$lib/typeaheadSearch';
  import { parseInput, lexiconPath, type InputTarget } from '$lib/explorer/input';
  import { resolveHandleToDid } from '$lib/explorer/identity';
  import { explorerRecents } from '$lib/explorer/explorerState.svelte';
  import { shortcutManager } from '$lib/keyboard/shortcutManager.svelte';

  interface Crumb {
    label: string;
    href?: string;
    mono?: boolean;
  }

  interface Actor {
    did: string;
    handle: string;
    displayName?: string;
    avatar?: string;
  }

  interface Suggestion {
    key: string;
    path: string;
    label: string;
    sub?: string;
    avatar?: string;
    kind: 'target' | 'actor' | 'recent';
    target?: InputTarget;
  }

  let { crumbs = [], query = '', actions = undefined }: {
    crumbs?: Crumb[];
    query?: string;
    actions?: Snippet;
  } = $props();

  let editing = $state(false);
  let value = $state('');
  let actors = $state.raw<Actor[]>([]);
  let active = $state(0);
  let busy = $state(false);

  const KIND_LABEL = {
    repo: 'explorer_kind_repo',
    collection: 'explorer_kind_collection',
    record: 'explorer_kind_record',
    pds: 'explorer_kind_pds',
    lexicon: 'explorer_kind_lexicon',
  } as const;

  const search = createDebouncedSearch<Actor[]>(
    async (term, signal) => {
      const res = await $agent.xrpc.get('app.bsky.actor.searchActorsTypeahead', { q: term, limit: 6 }, { signal });
      return res?.actors ?? [];
    },
    {
      onResult: (result) => {
        actors = result;
      },
      onClear: () => {
        actors = [];
      },
    },
    200,
  );

  const target = $derived(parseInput(value));

  const suggestions = $derived.by<Suggestion[]>(() => {
    const list: Suggestion[] = [];
    if (target) {
      list.push({ key: 'target', path: target.path, label: value.trim(), sub: $_(KIND_LABEL[target.kind]), kind: 'target', target });
    }
    if (!value.trim()) {
      for (const recent of explorerRecents.items) {
        list.push({ key: 'recent:' + recent.path, path: recent.path, label: recent.label, kind: 'recent' });
      }
    } else if (!target || target.kind === 'repo') {
      for (const actor of actors) {
        list.push({ key: 'actor:' + actor.did, path: '/atproto-viewer/' + actor.did, label: actor.displayName || actor.handle, sub: '@' + actor.handle, avatar: actor.avatar, kind: 'actor' });
      }
    }
    return list;
  });

  function startEditing() {
    value = query;
    actors = [];
    active = 0;
    editing = true;
  }

  function stopEditing() {
    editing = false;
    search.cancel();
  }

  function handleInput() {
    active = 0;
    const term = value.trim();
    if (term && !/^(at:|did:|https?:|lex:|pds:)/.test(term) && !term.includes('/')) search.run(term.replace(/^@/, ''));
    else search.run('');
  }

  async function open(suggestion: Suggestion) {
    let path = suggestion.path;
    if (suggestion.target?.ambiguous) {
      busy = true;
      try {
        await resolveHandleToDid(suggestion.label.replace(/^@/, '').toLowerCase());
      } catch {
        path = lexiconPath(suggestion.label);
      }
      busy = false;
    }
    stopEditing();
    goto(path);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (!suggestions.length) return;
      event.preventDefault();
      active = (active + (event.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length;
    } else if (event.key === 'Enter') {
      const suggestion = suggestions[active];
      if (suggestion) {
        event.preventDefault();
        void open(suggestion);
      }
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      stopEditing();
    }
  }

  function focusOnMount(node: HTMLInputElement) {
    node.focus();
    node.select();
  }

  function closeOnOutside(node: HTMLElement) {
    const handler = (event: PointerEvent) => {
      if (!node.contains(event.target as Node)) stopEditing();
    };
    document.addEventListener('pointerdown', handler, true);
    return () => document.removeEventListener('pointerdown', handler, true);
  }

  $effect(() => shortcutManager.provide('page.close', () => {
    if (editing) {
      stopEditing();
      return true;
    }
    goto('/', { noScroll: true });
    return true;
  }));

</script>

<header class="explorer-bar">
  <button class="explorer-bar__button" onclick={() => history.back()} aria-label={$_('back')}>
    <ArrowLeft size="20" color="var(--text-color-1)" />
  </button>

  <div class="explorer-omni" class:explorer-omni--editing={editing} {@attach editing ? closeOnOutside : undefined}>
    {#if editing}
      <Search size="16" color="var(--text-color-3)" />
      <input
        class="explorer-omni__input"
        type="text"
        bind:value
        oninput={handleInput}
        onkeydown={handleKeydown}
        placeholder={$_('explorer_omni_placeholder')}
        aria-label={$_('explorer_omni_placeholder')}
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        {@attach focusOnMount}
      />

      {#if suggestions.length}
        <ul class="explorer-suggest" role="listbox">
          {#each suggestions as suggestion, index (suggestion.key)}
            <li role="option" aria-selected={index === active}>
              <button class="explorer-suggest__item" class:explorer-suggest__item--active={index === active} disabled={busy} onclick={() => open(suggestion)} onpointerenter={() => { active = index; }}>
                {#if suggestion.kind === 'actor'}
                  {#if suggestion.avatar}
                    <img class="explorer-suggest__avatar" src={suggestion.avatar} alt="" width="24" height="24" loading="lazy" />
                  {:else}
                    <span class="explorer-suggest__avatar"></span>
                  {/if}
                {:else if suggestion.kind === 'recent'}
                  <Clock size="16" color="var(--text-color-3)" />
                {:else}
                  <CornerDownLeft size="16" color="var(--primary-color)" />
                {/if}
                <span class="explorer-suggest__label">{suggestion.label}</span>
                {#if suggestion.sub}
                  <span class="explorer-suggest__sub">{suggestion.sub}</span>
                {/if}
              </button>
            </li>
          {/each}
        </ul>
      {/if}
    {:else}
      <nav class="explorer-crumbs" aria-label="Breadcrumb">
        {#each crumbs as crumb, index (index)}
          {#if index > 0}
            <ChevronRight size="14" color="var(--text-color-3)" />
          {/if}
          {#if crumb.href && index < crumbs.length - 1}
            <a class="explorer-crumbs__item" class:explorer-crumbs__item--mono={crumb.mono} href={crumb.href}>{crumb.label}</a>
          {:else}
            <span class="explorer-crumbs__item explorer-crumbs__item--current" class:explorer-crumbs__item--mono={crumb.mono}>{crumb.label}</span>
          {/if}
        {/each}
      </nav>
      <button class="explorer-omni__open" onclick={startEditing} aria-label={$_('explorer_omni_placeholder')}>
        {#if !crumbs.length}
          <span class="explorer-omni__hint">{$_('explorer_omni_placeholder')}</span>
        {/if}
        <Search size="16" color="var(--text-color-3)" />
      </button>
    {/if}
  </div>

  {@render actions?.()}

  <a class="explorer-bar__button" href="/" aria-label={$_('close')}>
    <X size="20" color="var(--text-color-1)" />
  </a>
</header>

<style lang="postcss">
  .explorer-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      height: var(--deck-heading-height, 52px);
      padding: 0 12px;
      border-bottom: 1px solid var(--border-color-2);
      min-width: 0;

      @media (max-width: 767px) {
          padding: 0 4px;
          gap: 4px;
      }

      &__button {
          flex: none;
          display: grid;
          place-content: center;
          width: 36px;
          height: 36px;
          border-radius: var(--radius-round, 50%);

          @media (hover: hover) {
              &:hover {
                  background-color: var(--state-hover, var(--bg-color-2));
              }
          }
      }
  }

  .explorer-omni {
      position: relative;
      flex: 1;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 8px;
      height: 36px;
      padding: 0 12px;
      border-radius: var(--radius-control, 8px);
      background-color: var(--bg-color-2);
      border: 1px solid transparent;

      &--editing {
          border-color: var(--primary-color);
          background-color: var(--bg-color-1);
      }

      &__input {
          flex: 1;
          min-width: 0;
          height: 100%;
          background: none;
          border: none;
          outline: none;
          color: var(--text-color-1);
          font-size: 14px;
          font-family: var(--code-font);

          &::placeholder {
              font-family: var(--font-body);
              color: var(--text-color-3);
          }
      }

      &__open {
          flex: 1;
          align-self: stretch;
          min-width: 28px;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          cursor: text;
      }

      &__hint {
          flex: 1;
          text-align: left;
          font-size: 14px;
          color: var(--text-color-3);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
      }
  }

  .explorer-crumbs {
      display: flex;
      align-items: center;
      gap: 4px;
      min-width: 0;
      font-size: 13px;

      &__item {
          min-width: 3em;
          flex: 0 4 auto;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          color: var(--text-color-3);
          padding: 2px 4px;
          border-radius: var(--border-radius-2);

          &--mono {
              font-family: var(--code-font);
              font-size: 12px;
          }

          &--current {
              color: var(--text-color-1);
              font-weight: 600;
              flex-shrink: 1;
              min-width: 6em;
          }

          @media (hover: hover) {
              &:is(a):hover {
                  color: var(--text-color-1);
                  background-color: var(--state-hover, var(--bg-color-3));
              }
          }
      }

      :global(svg) {
          flex: none;
      }
  }

  .explorer-suggest {
      position: absolute;
      top: calc(100% + 6px);
      left: -1px;
      right: -1px;
      z-index: 30;
      list-style: none;
      padding: 4px;
      max-height: min(420px, 60vh);
      overflow-y: auto;
      background: var(--surface-raised, var(--bg-color-1));
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-overlay, 10px);
      box-shadow: var(--elevation-2, 0 8px 24px rgba(0, 0, 0, .16));

      &__item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 40px;
          padding: 6px 10px;
          border-radius: var(--radius-control, 6px);
          text-align: left;
          color: var(--text-color-1);

          &--active {
              background-color: var(--state-selected, var(--bg-color-2));
          }
      }

      &__avatar {
          flex: none;
          width: 24px;
          height: 24px;
          border-radius: var(--avatar-border-radius, 50%);
          background-color: var(--bg-color-3);
          object-fit: cover;
      }

      &__label {
          min-width: 0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 14px;
      }

      &__sub {
          margin-left: auto;
          flex: none;
          max-width: 50%;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: 12px;
          color: var(--text-color-3);
      }
  }
</style>
