<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { SvelteSet } from 'svelte/reactivity';
    import Search from '@lucide/svelte/icons/search';
    import ChevronRight from '@lucide/svelte/icons/chevron-right';
    import X from '@lucide/svelte/icons/x';
    import { checkTokenValue } from '../format';
    import { TOKEN_CATALOG, TOKEN_GROUPS, type CatalogToken, type TokenGroup } from './catalog';
    import { isHexColor } from './color';
    import type { ComposedRecord, Draft } from './draft';

    let { draft = $bindable(), composed, dark }: { draft: Draft; composed: ComposedRecord; dark: boolean } = $props();

    let query = $state('');
    let onlySet = $state(false);
    const open = new SvelteSet<TokenGroup>(['base']);

    const values = $derived.by(() => {
        const map = new Map(composed.tokens.map((t) => [t.name, t.value]));
        if (dark) for (const t of composed.dark ?? []) map.set(t.name, t.value);
        return map;
    });
    const imageKeys = $derived(new Set(draft.images.map((image) => image.key)));

    const tokens = $derived.by(() => {
        const known = new Set(TOKEN_CATALOG.map((t) => t.name));
        const custom: CatalogToken[] = [...values.keys()].filter((name) => !known.has(name)).map((name) => ({ name, group: 'other', kind: 'other' }));
        return [...TOKEN_CATALOG, ...custom];
    });

    const needle = $derived(query.trim().toLowerCase());
    const visible = $derived(tokens.filter((t) => (!onlySet || values.has(t.name)) && (!needle || t.name.includes(needle) || $_(`builder_group_${t.group}`).toLowerCase().includes(needle))));
    const groups = $derived(TOKEN_GROUPS.map((group) => {
        const all = tokens.filter((t) => t.group === group);
        return { group, items: visible.filter((t) => t.group === group), set: all.filter((t) => values.has(t.name)).length, total: all.length };
    }));

    function setValue(name: string, value: string) {
        const target = dark ? draft.darkOverrides : draft.overrides;
        target[name] = value.trim() === '' ? null : value.trim();
    }

    function reset(name: string) {
        const target = dark ? draft.darkOverrides : draft.overrides;
        target[name] = null;
    }

    function toggle(group: TokenGroup) {
        if (open.has(group)) open.delete(group);
        else open.add(group);
    }
</script>

<div class="advanced">
  <div class="advanced__filters">
    <label class="advanced__search">
      <Search size={16} color="currentColor"></Search>
      <input aria-label={$_('builder_search')} placeholder={$_('builder_search')} bind:value={query}>
    </label>
    <div class="advanced__options">
      <label class="advanced__check"><input type="checkbox" bind:checked={onlySet}>{$_('builder_only_set')}</label>
      {#if dark}
        <span class="advanced__mode">{$_('builder_editing_dark')}</span>
      {/if}
    </div>
  </div>

  {#each groups as { group, items, set, total } (group)}
    {#if items.length || !needle}
      <section class="advanced__group">
        <button class="advanced__group-button" aria-expanded={open.has(group) || !!needle} onclick={() => toggle(group)}>
          <span class="advanced__chevron" class:advanced__chevron--open={open.has(group) || !!needle}><ChevronRight size={14} color="currentColor"></ChevronRight></span>
          <span class="advanced__group-name">{$_(`builder_group_${group}`)}</span>
          <span class="advanced__count">{set} / {total}</span>
        </button>
        {#if open.has(group) || needle}
          <ul class="advanced__list">
            {#each items as token (token.name)}
              {@const value = values.get(token.name) ?? ''}
              {@const error = value ? checkTokenValue(value, imageKeys) : null}
              <li class="advanced__item">
                <div class="advanced__row">
                  {#if token.kind === 'color' && isHexColor(value)}
                    <input class="advanced__color" type="color" aria-label={$_('builder_value_of', { name: token.name })} value={value.length === 4 ? `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}` : value} oninput={(e) => setValue(token.name, e.currentTarget.value)}>
                  {:else}
                    <span class="advanced__swatch" style:background={(token.kind === 'color' || token.kind === 'background') && value && !error ? value : null}></span>
                  {/if}
                  <code class="advanced__name" title={token.name}>{token.name}</code>
                  <input class="advanced__value" class:advanced__value--error={!!error} aria-label={$_('builder_value_of', { name: token.name })} {value} onchange={(e) => setValue(token.name, e.currentTarget.value)}>
                  <button class="advanced__reset" aria-label={$_('builder_reset_token', { name: token.name })} disabled={!value} onclick={() => reset(token.name)}>
                    <X size={14} color="currentColor"></X>
                  </button>
                </div>
                {#if error}
                  <p class="advanced__error" role="alert">{error}</p>
                {/if}
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    {/if}
  {/each}
</div>

<style lang="postcss">
  .advanced__filters {
      display: flex;
      flex-direction: column;
      gap: 10px;
      padding: 12px 16px;
      border-bottom: 1px solid var(--builder-line);
  }

  .advanced__search {
      display: flex;
      align-items: center;
      gap: 8px;
      height: 40px;
      padding: 0 12px;
      border: 1px solid #dfe2e6;
      border-radius: 10px;
      color: var(--builder-muted);

      & input {
          flex-grow: 1;
          border: 0;
          outline: none;
          background: transparent;
          font: inherit;
          color: var(--builder-text);
      }

      &:focus-within {
          border-color: var(--builder-text);
      }
  }

  .advanced__options {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
  }

  .advanced__check {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: var(--builder-muted);
  }

  .advanced__mode {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 999px;
      background: #2b2d31;
      color: #fff;
  }

  .advanced__group {
      border-bottom: 1px solid var(--builder-line);
  }

  .advanced__group-button {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      text-align: left;
      color: var(--builder-text);
  }

  .advanced__chevron {
      display: flex;
      transition: transform .1s;

      &--open {
          transform: rotate(90deg);
      }
  }

  .advanced__group-name {
      flex-grow: 1;
      font-weight: 600;
  }

  .advanced__count {
      font-size: 12px;
      color: var(--builder-muted);
      font-variant-numeric: tabular-nums;
  }

  .advanced__list {
      list-style: none;
      margin: 0;
      padding: 0 16px 12px;
      display: flex;
      flex-direction: column;
      gap: 2px;
  }

  .advanced__item {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 4px 0;
  }

  .advanced__row {
      display: flex;
      align-items: center;
      gap: 8px;
  }

  .advanced__swatch,
  .advanced__color {
      width: 28px;
      height: 28px;
      flex-shrink: 0;
      border-radius: 7px;
      border: 1px solid #dfe2e6;
      padding: 0;
      background-image: linear-gradient(45deg, #eee 25%, transparent 25% 75%, #eee 75%), linear-gradient(45deg, #eee 25%, transparent 25% 75%, #eee 75%);
      background-size: 8px 8px;
      background-position: 0 0, 4px 4px;
  }

  .advanced__color {
      background: #fff;
  }

  .advanced__name {
      flex-grow: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 12px;
  }

  .advanced__value {
      width: 132px;
      height: 32px;
      padding: 0 8px;
      border: 1px solid #dfe2e6;
      border-radius: 8px;
      font-family: ui-monospace, monospace;
      font-size: 12px;
      color: var(--builder-text);
      background: #fff;

      &--error {
          border-color: #d93a32;
          color: var(--builder-danger);
      }
  }

  .advanced__reset {
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 7px;
      color: var(--builder-muted);

      &:disabled {
          opacity: .35;
      }
  }

  .advanced__error {
      margin: 0 0 0 36px;
      font-size: 12px;
      color: var(--builder-danger);
  }
</style>
