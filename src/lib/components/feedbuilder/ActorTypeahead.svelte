<script lang="ts">
  import { onDestroy } from 'svelte';
  import { scale } from 'svelte/transition';
  import { backOut } from 'svelte/easing';
  import { _ } from 'tokimeki-i18n';
  import { createDebouncedSearch } from '$lib/typeaheadSearch';
  import { xrpcQuery } from '$lib/feedbuilder/api';
  import type { ProfileViewBasic } from '$lib/feedbuilder/types';

  interface Props {
    value: string;
    onPick: (actor: ProfileViewBasic) => void;
    id: string;
    name?: string;
    placeholder?: string;
    ariaLabel?: string;
  }

  let { value = $bindable(''), onPick, id, name, placeholder, ariaLabel }: Props = $props();

  let suggestions = $state.raw<ProfileViewBasic[]>([]);
  let selected = $state(-1);
  let open = $state(false);
  let failed = false;
  let wrapper: HTMLElement;

  const search = createDebouncedSearch(
    (term, signal) =>
      xrpcQuery<{ actors: ProfileViewBasic[] }>('app.bsky.actor.searchActorsTypeahead', { q: term, limit: 6 }, signal),
    {
      onResult: (data) => {
        suggestions = data.actors ?? [];
        selected = -1;
        open = suggestions.length > 0;
      },
      onClear: close,
      onError: () => {
        failed = true;
        close();
      }
    }
  );

  function typeaheadTerm(input: string): string | null {
    const term = input.trim().replace(/^@/, '');
    if (!term || term.startsWith('did:')) return null;
    return term;
  }

  function moveSelection(current: number, count: number, key: 'ArrowDown' | 'ArrowUp'): number {
    if (count <= 0) return -1;
    if (key === 'ArrowDown') return (current + 1) % count;
    return current < 0 ? count - 1 : (current + count - 1) % count;
  }

  function onInput() {
    const term = typeaheadTerm(value);
    if (term === null || failed) {
      search.cancel();
      close();
      return;
    }
    search.run(term);
  }

  function close() {
    open = false;
    suggestions = [];
    selected = -1;
  }

  function pick(i: number) {
    const a = suggestions[i];
    if (!a) return;
    onPick(a);
    value = '';
    close();
  }

  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.isComposing && !(open && selected >= 0)) {
      search.cancel();
      close();
      return;
    }
    if (!open) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      selected = moveSelection(selected, suggestions.length, e.key);
    } else if (e.key === 'Enter' && selected >= 0 && !e.isComposing) {
      e.preventDefault();
      pick(selected);
    } else if (e.key === 'Escape') {
      close();
    }
  }

  function onFocusOut(e: FocusEvent) {
    if (!wrapper.contains(e.relatedTarget as Node)) close();
  }

  onDestroy(() => search.cancel());
</script>

<div class="actor-typeahead" bind:this={wrapper} onfocusout={onFocusOut}>
  <input
    class="actor-typeahead__input"
    type="text"
    {name}
    {id}
    {placeholder}
    bind:value
    inputmode="email"
    autocomplete="off"
    aria-label={ariaLabel}
    autocapitalize="off"
    spellcheck="false"
    role="combobox"
    aria-autocomplete="list"
    aria-expanded={open}
    aria-controls="{id}-listbox"
    aria-activedescendant={open && selected >= 0 ? `${id}-option-${selected}` : undefined}
    oninput={onInput}
    onkeydown={onKeydown}
  />
  {#if open}
    <div
      class="actor-typeahead__list"
      role="listbox"
      id="{id}-listbox"
      aria-label={$_('tfeeds_src_typeahead_list')}
      transition:scale={{ duration: 300, start: 0.92, opacity: 0, easing: backOut }}
    >
      {#each suggestions as a, i (a.did)}
        <button
          type="button"
          role="option"
          id="{id}-option-{i}"
          tabindex="-1"
          aria-selected={i === selected}
          class="actor-typeahead__item"
          class:actor-typeahead__item--selected={i === selected}
          onmousedown={(e) => {
            e.preventDefault();
            pick(i);
          }}
        >
          <span class="actor-typeahead__avatar" aria-hidden="true">
            {#if a.avatar}<img src={a.avatar} alt="" width="28" height="28" loading="lazy" />{/if}
          </span>
          <span class="actor-typeahead__content">
            <span class="actor-typeahead__name">{a.displayName?.trim() || a.handle}</span>
            <span class="actor-typeahead__handle">@{a.handle}</span>
          </span>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style lang="postcss">
  .actor-typeahead {
    position: relative;
    flex: 1;
    min-width: 12rem;

    &__input {
      box-sizing: border-box;
      width: 100%;
      padding: var(--space-2) var(--space-3);
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-2);
      background: var(--bg-color-1);
      color: var(--text-color-1);
      font-size: 0.9rem;

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 1px;
      }
    }

    &__list {
      position: absolute;
      top: calc(100% + 4px);
      left: 0;
      right: 0;
      display: flex;
      flex-direction: column;
      background: var(--surface-raised, var(--bg-color-1));
      padding: 8px;
      z-index: 10;
      border-radius: var(--radius-overlay, var(--border-radius-3));
      box-shadow: var(--elevation-2, 0 0 10px var(--box-shadow-color-2));
      transform-origin: top;
    }

    &__item {
      color: var(--text-color-1);
      font-size: 14px;
      white-space: nowrap;
      padding: 6px;
      width: 100%;
      text-align: left;
      display: grid;
      grid-template-columns: 28px 1fr;
      gap: 8px;
      align-items: center;
      border-radius: var(--border-radius-2);

      &--selected,
      &:hover {
        background-color: var(--state-hover, var(--bg-color-2));
      }
    }

    &__avatar {
      overflow: hidden;
      aspect-ratio: 1 / 1;
      border-radius: var(--avatar-border-radius, 50%);
      background-color: var(--primary-color);

      img {
        display: block;
        width: 100%;
      }
    }

    &__content {
      display: flex;
      flex-direction: column;
      line-height: 1.3;
      overflow: hidden;
    }

    &__name {
      font-weight: bold;
      font-size: 13px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    &__handle {
      font-size: 12px;
      color: var(--text-color-2);
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }
</style>
