<script lang="ts">
  import ArrowDownUp from '@lucide/svelte/icons/arrow-down-up';
  import Calculator from '@lucide/svelte/icons/calculator';
  import Clock from '@lucide/svelte/icons/clock';
  import Flame from '@lucide/svelte/icons/flame';
  import Repeat2 from '@lucide/svelte/icons/repeat-2';
  import Eye from '@lucide/svelte/icons/eye';
  import Lock from '@lucide/svelte/icons/lock';
  import Globe from '@lucide/svelte/icons/globe';
  import ListOrdered from '@lucide/svelte/icons/list-ordered';
  import Sparkles from '@lucide/svelte/icons/sparkles';
  import TrendingUp from '@lucide/svelte/icons/trending-up';
  import Zap from '@lucide/svelte/icons/zap';
  import type { Component } from 'svelte';
  import { _ } from 'tokimeki-i18n';
  import SectionCard from '../SectionCard.svelte';
  import DisplayOptions from './DisplayOptions.svelte';
  import {
    feedBuilder,
    draftAllowsRelevance,
    draftIsCorrelated,
    acceptsSortWindow,
    acceptsHalflife,
    EXPR_PRESETS,
    exprPresetIdFromAst,
    type ExprPresetId
  } from '$lib/feedbuilder/feedBuilder.svelte';
  import type { CustomFeedSort, CustomFeedVisibility } from '$lib/feedbuilder/types';

  interface Props {
    which: 'sort' | 'visibility';
    open: boolean;
    onToggle: () => void;
  }
  let { which, open, onToggle }: Props = $props();

  const cardState = $derived(feedBuilder.cardStates[which]);
  const diag = $derived(feedBuilder.diagnostics.find((d) => d.cardId === which));

  interface SortOption {
    value: CustomFeedSort;
    label: string;
    hint: string;
    icon: Component;
    scoreOnly: boolean;
    searchOnly?: boolean;
    collectionOnly?: boolean;
  }
  const sortOptions: SortOption[] = [
    {
      value: 'chronological',
      get label() {
        return $_('tfeeds_sortvis_sort_chronological');
      },
      hint: '',
      icon: Clock,
      scoreOnly: false
    },
    {
      value: 'likeCount',
      get label() {
        return $_('tfeeds_sort_likes');
      },
      get hint() {
        return $_('tfeeds_sortvis_sort_likes_hint');
      },
      icon: Flame,
      scoreOnly: true
    },
    {
      value: 'repostCount',
      get label() {
        return $_('tfeeds_sort_reposts');
      },
      get hint() {
        return $_('tfeeds_sortvis_sort_reposts_hint');
      },
      icon: Repeat2,
      scoreOnly: true
    },
    {
      value: 'hotness',
      get label() {
        return $_('tfeeds_easy_sort_hotness');
      },
      get hint() {
        return $_('tfeeds_sortvis_sort_hotness_hint');
      },
      icon: TrendingUp,
      scoreOnly: true
    },
    {
      value: 'trending',
      get label() {
        return $_('tfeeds_sort_trending');
      },
      get hint() {
        return $_('tfeeds_sortvis_sort_trending_hint');
      },
      icon: Zap,
      scoreOnly: true
    },
    {
      value: 'expression',
      get label() {
        return $_('tfeeds_sort_custom_expr');
      },
      get hint() {
        return $_('tfeeds_sortvis_sort_expression_hint');
      },
      icon: Calculator,
      scoreOnly: true
    },
    {
      value: 'relevance',
      get label() {
        return $_('tfeeds_sortvis_sort_relevance');
      },
      get hint() {
        return $_('tfeeds_sortvis_sort_relevance_hint');
      },
      icon: Sparkles,
      scoreOnly: false,
      searchOnly: true
    },
    {
      value: 'manual',
      get label() {
        return $_('tfeeds_sort_manual');
      },
      get hint() {
        return $_('tfeeds_sortvis_sort_manual_hint');
      },
      icon: ListOrdered,
      scoreOnly: false,
      collectionOnly: true
    }
  ];

  const sourceKind = $derived(feedBuilder.draft.source.kind);
  const scoreSortBlocked = $derived(draftIsCorrelated(feedBuilder.draft));
  const searchSortBlocked = $derived(!draftAllowsRelevance(feedBuilder.draft));
  const forYou = $derived(sourceKind === 'forYou');
  function optLabel(opt: SortOption): string {
    return opt.value === 'relevance' && forYou ? $_('tfeeds_sortvis_sort_for_you') : opt.label;
  }
  function optHint(opt: SortOption): string {
    return opt.value === 'relevance' && forYou ? $_('tfeeds_sortvis_sort_for_you_hint') : opt.hint;
  }
  const collectionSortBlocked = $derived(sourceKind !== 'collection');

  function isBlocked(opt: SortOption): boolean {
    return (
      (opt.scoreOnly && scoreSortBlocked) ||
      (opt.searchOnly === true && searchSortBlocked) ||
      (opt.collectionOnly === true && collectionSortBlocked)
    );
  }
  const visibleSortOptions = $derived(
    sortOptions.filter((o) => !isBlocked(o) || feedBuilder.draft.sort === o.value)
  );
  const hiddenSortNotes = $derived.by(() => {
    const notes: string[] = [];
    if (scoreSortBlocked) notes.push($_('tfeeds_sortvis_note_correlated'));
    if (searchSortBlocked) notes.push($_('tfeeds_sortvis_note_relevance'));
    if (collectionSortBlocked) notes.push($_('tfeeds_sortvis_note_collection'));
    return notes;
  });

  const PER_AUTHOR_OPTIONS: { value: number | undefined; label: string }[] = [
    {
      value: undefined,
      get label() {
        return $_('tfeeds_sortvis_per_author_off');
      }
    },
    ...[1, 2, 3, 5].map((n) => ({
      value: n,
      get label() {
        return $_('tfeeds_sortvis_count', { n });
      }
    }))
  ];

  function setSort(v: CustomFeedSort) {
    feedBuilder.setSort(v);
  }
  function setVisibility(v: CustomFeedVisibility) {
    feedBuilder.setVisibility(v);
  }

  interface WindowOption {
    value: string | undefined;
    label: string;
  }
  type CustomUnit = 'h' | 'd';

  function durLabel(n: number, u: CustomUnit): string {
    return u === 'h' ? $_('tfeeds_dur_hours', { n }) : $_('tfeeds_dur_days', { n });
  }

  const windowOptions: WindowOption[] = [
    {
      value: undefined,
      get label() {
        return $_('tfeeds_window_all');
      }
    },
    {
      value: 'PT24H',
      get label() {
        return durLabel(24, 'h');
      }
    },
    {
      value: 'P7D',
      get label() {
        return durLabel(7, 'd');
      }
    },
    {
      value: 'P30D',
      get label() {
        return durLabel(30, 'd');
      }
    }
  ];

  let customMode = $state(false);
  let customNum = $state<number>(12);
  let customUnit = $state<CustomUnit>('h');
  const currentWindow = $derived(feedBuilder.draft.sortWindow);
  const isPreset = $derived(windowOptions.some((o) => o.value === currentWindow));

  function parseIso(s: string): { n: number; u: CustomUnit } | null {
    const h = /^PT(\d+)H$/.exec(s);
    if (h) return { n: Number(h[1]), u: 'h' };
    const d = /^P(\d+)D$/.exec(s);
    if (d) return { n: Number(d[1]), u: 'd' };
    return null;
  }

  function buildIso(n: number, u: CustomUnit): string {
    const safe = Math.max(1, Math.min(Math.floor(n), 9999));
    return u === 'h' ? `PT${safe}H` : `P${safe}D`;
  }

  $effect(() => {
    if (currentWindow && !isPreset) {
      customMode = true;
      const parsed = parseIso(currentWindow);
      if (parsed) {
        customNum = parsed.n;
        customUnit = parsed.u;
      }
    } else if (isPreset) {
      customMode = false;
    }
  });

  function pickWindow(v: string | undefined) {
    customMode = false;
    feedBuilder.setSortWindow(v);
  }

  function openCustom() {
    customMode = true;
    const parsed = currentWindow ? parseIso(currentWindow) : null;
    if (parsed) {
      customNum = parsed.n;
      customUnit = parsed.u;
    }
    feedBuilder.setSortWindow(buildIso(customNum, customUnit));
  }

  function setCustomNum(raw: string) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) return;
    customNum = Math.floor(n);
    feedBuilder.setSortWindow(buildIso(customNum, customUnit));
  }

  function setCustomUnit(u: CustomUnit) {
    customUnit = u;
    feedBuilder.setSortWindow(buildIso(customNum, customUnit));
  }

  const showWindow = $derived(acceptsSortWindow(feedBuilder.draft.sort));

  function windowSummary(w: string | undefined): string {
    if (!w) return $_('tfeeds_window_all');
    const preset = windowOptions.find((o) => o.value === w);
    if (preset) return preset.label;
    const parsed = parseIso(w);
    if (parsed) {
      return durLabel(parsed.n, parsed.u);
    }
    return w;
  }

  interface HalflifeOption {
    value: string;
    label: string;
  }
  const halflifeOptions: HalflifeOption[] = [
    {
      value: 'PT12H',
      get label() {
        return durLabel(12, 'h');
      }
    },
    {
      value: 'PT24H',
      get label() {
        return durLabel(24, 'h');
      }
    },
    {
      value: 'P3D',
      get label() {
        return durLabel(3, 'd');
      }
    },
    {
      value: 'P7D',
      get label() {
        return durLabel(7, 'd');
      }
    }
  ];

  let halflifeCustomMode = $state(false);
  let halflifeCustomNum = $state<number>(24);
  let halflifeCustomUnit = $state<CustomUnit>('h');
  const currentHalflife = $derived(feedBuilder.draft.hotnessHalflife);
  const halflifeIsPreset = $derived(
    halflifeOptions.some((o) => o.value === currentHalflife)
  );

  $effect(() => {
    if (currentHalflife && !halflifeIsPreset) {
      halflifeCustomMode = true;
      const parsed = parseIso(currentHalflife);
      if (parsed) {
        halflifeCustomNum = parsed.n;
        halflifeCustomUnit = parsed.u;
      }
    } else if (halflifeIsPreset) {
      halflifeCustomMode = false;
    }
  });

  function pickHalflife(v: string) {
    halflifeCustomMode = false;
    feedBuilder.setHotnessHalflife(v);
  }

  function openHalflifeCustom() {
    halflifeCustomMode = true;
    const parsed = currentHalflife ? parseIso(currentHalflife) : null;
    if (parsed) {
      halflifeCustomNum = parsed.n;
      halflifeCustomUnit = parsed.u;
    }
    feedBuilder.setHotnessHalflife(buildIso(halflifeCustomNum, halflifeCustomUnit));
  }

  function setHalflifeCustomNum(raw: string) {
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 1) return;
    halflifeCustomNum = Math.floor(n);
    feedBuilder.setHotnessHalflife(buildIso(halflifeCustomNum, halflifeCustomUnit));
  }

  function setHalflifeCustomUnit(u: CustomUnit) {
    halflifeCustomUnit = u;
    feedBuilder.setHotnessHalflife(buildIso(halflifeCustomNum, halflifeCustomUnit));
  }

  const showHalflife = $derived(acceptsHalflife(feedBuilder.draft.sort));

  const showPresets = $derived(feedBuilder.draft.sort === 'expression');
  const activePresetId = $derived(
    exprPresetIdFromAst(feedBuilder.draft.sortExpression)
  );

  function pickPreset(id: ExprPresetId) {
    feedBuilder.setExpressionPreset(id);
  }

  function openJsonMode() {
    feedBuilder.setMode('json');
  }

  function halflifeSummary(h: string | undefined): string {
    const value = h ?? 'PT24H';
    const preset = halflifeOptions.find((o) => o.value === value);
    if (preset) return preset.label;
    const parsed = parseIso(value);
    if (parsed) {
      return durLabel(parsed.n, parsed.u);
    }
    return value;
  }

  function sortSummary(): string {
    const s = sortOptions.find((o) => o.value === feedBuilder.draft.sort);
    if (!s) return feedBuilder.draft.sort;
    const parts: string[] = [];
    if (feedBuilder.draft.sort === 'expression') {
      const presetId = exprPresetIdFromAst(feedBuilder.draft.sortExpression);
      if (presetId) {
        const preset = EXPR_PRESETS.find((p) => p.id === presetId);
        if (preset) parts.push(preset.label);
      } else {
        parts.push('JSON');
      }
    }
    if (acceptsHalflife(feedBuilder.draft.sort)) {
      parts.push($_('tfeeds_sortvis_summary_halflife', { v: halflifeSummary(feedBuilder.draft.hotnessHalflife) }));
    }
    if (acceptsSortWindow(feedBuilder.draft.sort)) {
      parts.push(windowSummary(feedBuilder.draft.sortWindow));
    }
    if (feedBuilder.draft.maxPerAuthor !== undefined) {
      parts.push($_('tfeeds_sortvis_summary_per_author', { n: feedBuilder.draft.maxPerAuthor }));
    }
    if (parts.length === 0) return optLabel(s);
    return `${optLabel(s)} ${parts.map((p) => `(${p})`).join(' ')}`;
  }
</script>

{#if which === 'sort'}
  <SectionCard
    label={$_('tfeeds_sortvis_sort_card')}
    icon={ArrowDownUp}
    accent="sky"
    state={cardState}
    {open}
    {onToggle}
    error={diag ? { message: diag.message, suggestion: diag.suggestion } : undefined}
  >
    {#snippet summary()}
      {sortSummary()}
    {/snippet}
    {#snippet body()}
      <div class="sortvis__tiles" role="radiogroup" aria-label={$_('tfeeds_sortvis_sort_order')}>
        {#each visibleSortOptions as opt (opt.value)}
          {@const Icon = opt.icon}
          {@const blocked = isBlocked(opt)}
          <button
            type="button"
            class="sortvis__tile sortvis__tile--sort"
            class:is-active={feedBuilder.draft.sort === opt.value}
            class:is-disabled={blocked}
            disabled={blocked}
            onclick={() => setSort(opt.value)}
          >
            <Icon size={16} strokeWidth={1.9} />
            <span class="sortvis__tile-text">
              <span class="sortvis__tile-title">{optLabel(opt)}</span>
              <span class="sortvis__tile-hint">
                {blocked ? $_('tfeeds_sortvis_sort_blocked') : optHint(opt)}
              </span>
            </span>
          </button>
        {/each}
      </div>
      {#if hiddenSortNotes.length > 0}
        <ul class="sortvis__more">
          {#each hiddenSortNotes as note (note)}
            <li>{note}</li>
          {/each}
        </ul>
      {/if}

      {#if showWindow}
        <div class="sortvis__window">
          <span class="sortvis__window-label">{$_('tfeeds_sortvis_window')}</span>
          <div class="sortvis__window-pills" role="radiogroup" aria-label={$_('tfeeds_sortvis_window')}>
            {#each windowOptions as w (w.label)}
              <button
                type="button"
                class="sortvis__window-pill"
                class:is-active={!customMode && currentWindow === w.value}
                onclick={() => pickWindow(w.value)}
              >
                {w.label}
              </button>
            {/each}
            <button
              type="button"
              class="sortvis__window-pill"
              class:is-active={customMode}
              onclick={openCustom}
            >
              {$_('tfeeds_sortvis_custom')}
            </button>
          </div>
          {#if customMode}
            <div class="sortvis__window-custom" role="group" aria-label={$_('tfeeds_sortvis_window_custom')}>
              <input
                type="number"
                class="sortvis__window-num"
                min="1"
                max="9999"
                step="1"
                value={customNum}
                oninput={(e) => setCustomNum((e.target as HTMLInputElement).value)}
                aria-label={$_('tfeeds_sortvis_number')}
              />
              <div class="sortvis__window-units" role="radiogroup" aria-label={$_('tfeeds_sortvis_unit')}>
                <button
                  type="button"
                  class="sortvis__window-unit"
                  class:is-active={customUnit === 'h'}
                  onclick={() => setCustomUnit('h')}
                >
                  {$_('tfeeds_sortvis_unit_hours')}
                </button>
                <button
                  type="button"
                  class="sortvis__window-unit"
                  class:is-active={customUnit === 'd'}
                  onclick={() => setCustomUnit('d')}
                >
                  {$_('tfeeds_sortvis_unit_days')}
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      {#if showHalflife}
        <div class="sortvis__window">
          <span class="sortvis__window-label">{$_('tfeeds_sortvis_halflife')}</span>
          <div class="sortvis__window-pills" role="radiogroup" aria-label={$_('tfeeds_sortvis_halflife')}>
            {#each halflifeOptions as h (h.label)}
              <button
                type="button"
                class="sortvis__window-pill"
                class:is-active={!halflifeCustomMode && currentHalflife === h.value}
                onclick={() => pickHalflife(h.value)}
              >
                {h.label}
              </button>
            {/each}
            <button
              type="button"
              class="sortvis__window-pill"
              class:is-active={halflifeCustomMode}
              onclick={openHalflifeCustom}
            >
              {$_('tfeeds_sortvis_custom')}
            </button>
          </div>
          {#if halflifeCustomMode}
            <div class="sortvis__window-custom" role="group" aria-label={$_('tfeeds_sortvis_halflife_custom')}>
              <input
                type="number"
                class="sortvis__window-num"
                min="1"
                max="9999"
                step="1"
                value={halflifeCustomNum}
                oninput={(e) => setHalflifeCustomNum((e.target as HTMLInputElement).value)}
                aria-label={$_('tfeeds_sortvis_number')}
              />
              <div class="sortvis__window-units" role="radiogroup" aria-label={$_('tfeeds_sortvis_unit')}>
                <button
                  type="button"
                  class="sortvis__window-unit"
                  class:is-active={halflifeCustomUnit === 'h'}
                  onclick={() => setHalflifeCustomUnit('h')}
                >
                  {$_('tfeeds_sortvis_unit_hours')}
                </button>
                <button
                  type="button"
                  class="sortvis__window-unit"
                  class:is-active={halflifeCustomUnit === 'd'}
                  onclick={() => setHalflifeCustomUnit('d')}
                >
                  {$_('tfeeds_sortvis_unit_days')}
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/if}

      {#if showPresets}
        <div class="sortvis__window">
          <span class="sortvis__window-label">{$_('tfeeds_sortvis_presets')}</span>
          <div class="sortvis__window-pills" role="radiogroup" aria-label={$_('tfeeds_sortvis_presets')}>
            {#each EXPR_PRESETS as preset (preset.id)}
              <button
                type="button"
                class="sortvis__window-pill"
                class:is-active={activePresetId === preset.id}
                title={preset.description}
                onclick={() => pickPreset(preset.id)}
              >
                {preset.label}
              </button>
            {/each}
            <button
              type="button"
              class="sortvis__window-pill"
              title={$_('tfeeds_sortvis_to_json')}
              aria-label={$_('tfeeds_sortvis_to_json')}
              onclick={openJsonMode}
            >
              {$_('tfeeds_sortvis_json_detail')}
            </button>
          </div>
        </div>
      {/if}

      <div class="sortvis__window">
        <span class="sortvis__window-label">{$_('tfeeds_sortvis_per_author')}</span>
        <div class="sortvis__window-pills" role="radiogroup" aria-label={$_('tfeeds_sortvis_per_author_group')}>
          {#each PER_AUTHOR_OPTIONS as o (o.label)}
            <button
              type="button"
              role="radio"
              aria-checked={feedBuilder.draft.maxPerAuthor === o.value}
              class="sortvis__window-pill"
              class:is-active={feedBuilder.draft.maxPerAuthor === o.value}
              onclick={() => feedBuilder.setMaxPerAuthor(o.value)}
            >
              {o.label}
            </button>
          {/each}
        </div>
        <p class="sortvis__per-author-hint">
          {$_('tfeeds_sortvis_per_author_hint')}
        </p>
      </div>
    {/snippet}
  </SectionCard>
{:else}
  <SectionCard
    label={$_('tfeeds_sortvis_vis_card')}
    icon={Eye}
    accent="cream"
    state={cardState}
    {open}
    {onToggle}
    error={diag ? { message: diag.message, suggestion: diag.suggestion } : undefined}
  >
    {#snippet summary()}
      {[
        feedBuilder.draft.visibility === 'private' ? $_('tfeeds_sortvis_vis_private') : $_('tfeeds_sortvis_vis_public'),
        ...(feedBuilder.draft.contentMode === 'video' ? [$_('tfeeds_sortvis_vis_video_mode')] : []),
        ...(feedBuilder.draft.pinnedPosts?.length
          ? [$_('tfeeds_sortvis_vis_pinned', { n: feedBuilder.draft.pinnedPosts.length })]
          : [])
      ].join($_('tfeeds_sep'))}
    {/snippet}
    {#snippet body()}
      <div class="sortvis__tiles" role="radiogroup" aria-label={$_('tfeeds_sortvis_vis_scope')}>
        <button
          type="button"
          class="sortvis__tile sortvis__tile--vis"
          class:is-active={feedBuilder.draft.visibility === 'private'}
          onclick={() => setVisibility('private')}
        >
          <Lock size={16} strokeWidth={1.9} />
          <span class="sortvis__tile-text">
            <span class="sortvis__tile-title">{$_('tfeeds_sortvis_vis_private')}</span>
            <span class="sortvis__tile-hint">{$_('tfeeds_sortvis_vis_private_hint')}</span>
          </span>
        </button>
        <button
          type="button"
          class="sortvis__tile sortvis__tile--vis"
          class:is-active={feedBuilder.draft.visibility === 'public'}
          onclick={() => setVisibility('public')}
        >
          <Globe size={16} strokeWidth={1.9} />
          <span class="sortvis__tile-text">
            <span class="sortvis__tile-title">{$_('tfeeds_sortvis_vis_public')}</span>
            <span class="sortvis__tile-hint">{$_('tfeeds_sortvis_vis_public_hint')}</span>
          </span>
        </button>
      </div>
      {#if feedBuilder.draft.visibility === 'public'}
        <label class="sortvis__unlisted">
          <input
            type="checkbox"
            checked={feedBuilder.draft.unlisted === true}
            onchange={(e) => feedBuilder.setUnlisted((e.currentTarget as HTMLInputElement).checked)}
          />
          <span>
            <span class="sortvis__unlisted-title">{$_('tfeeds_sortvis_unlisted')}</span>
            <span class="sortvis__unlisted-hint">{$_('tfeeds_sortvis_unlisted_hint')}</span>
          </span>
        </label>
      {/if}
      <DisplayOptions />
    {/snippet}
  </SectionCard>
{/if}

<style lang="postcss">
  .sortvis {
    &__unlisted {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: var(--space-2) var(--space-1);
      cursor: pointer;

      & > input {
        flex-shrink: 0;
        width: 16px;
        height: 16px;
        margin-top: 2px;
        accent-color: var(--primary-color);
      }

      & > span {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
    }

    &__unlisted-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--text-color-1);
    }

    &__unlisted-hint {
      font-size: 12px;
      line-height: 1.55;
      color: var(--text-color-3);
    }

    &__more {
      margin: var(--space-2) 0 0;
      padding-left: 1.1em;
      font-size: 12px;
      line-height: 1.6;
      color: var(--text-color-3);
    }

    &__tiles {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    &__tile {
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

      &:hover:not(.is-disabled) {
        background-color: var(--surface-hover);
        color: var(--text-color-1);
      }

      &.is-active {
        color: var(--text-color-1);
      }

      &.is-disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      &:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px var(--cyan-color-soft);
        border-color: color-mix(in srgb, var(--cyan-color) 40%, var(--border-color-1));
      }
    }

    &__tile--sort.is-active {
      background-color: var(--primary-color-soft);
      border-color: var(--primary-color);
      box-shadow: inset 0 0 0 1px var(--primary-color);
    }
    &__tile--sort.is-active > :global(svg) {
      color: var(--primary-color);
    }

    &__tile--vis.is-active {
      background-color: var(--primary-color-soft);
      border-color: var(--primary-color);
      box-shadow: inset 0 0 0 1px var(--primary-color);
    }
    &__tile--vis.is-active > :global(svg) {
      color: var(--primary-color);
    }

    &__tile > :global(svg) {
      flex-shrink: 0;
      color: var(--text-color-3);
      transition: color var(--duration-fast) var(--ease-out);
    }

    &__tile-text {
      display: flex;
      flex-direction: column;
      gap: 3px;
      min-width: 0;
    }

    &__tile-title {
      font-size: 14px;
      font-weight: 600;
      color: var(--text-color-1);
      letter-spacing: 0.01em;
    }

    &__tile-hint {
      font-size: 12px;
      color: var(--text-color-3);
      line-height: 1.55;
    }

    &__per-author-hint {
      margin: 0;
      font-size: 12px;
      line-height: 1.6;
      color: var(--text-color-3);
    }

    &__window {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-3);
      border-radius: var(--radius-3);
      background-color: var(--bg-color-2);
      border: 1px solid var(--border-color-2);
    }

    &__window-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--text-color-3);
    }

    &__window-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-self: flex-start;
      max-width: 100%;
    }

    &__window-pill {
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

    &__window-custom {
      display: flex;
      gap: 8px;
      align-items: stretch;
    }

    &__window-num {
      width: 5rem;
      padding: 6px var(--space-3);
      border: 1px solid var(--border-color-2);
      border-radius: var(--radius-2);
      background-color: var(--bg-color-1);
      color: var(--text-color-1);
      font: inherit;
      font-size: 15px;
      font-weight: 600;
      text-align: right;
      font-variant-numeric: tabular-nums;

      &::-webkit-outer-spin-button,
      &::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
      }
      appearance: textfield;

      &:focus {
        outline: none;
        border-color: color-mix(in srgb, var(--cyan-color) 55%, var(--border-color-1));
        box-shadow: 0 0 0 3px var(--cyan-color-soft);
      }
    }

    &__window-units {
      display: inline-flex;
      background-color: color-mix(in srgb, var(--text-color-1) 3.5%, transparent);
      padding: 3px;
      border-radius: var(--radius-pill);
      gap: 2px;
    }

    &__window-unit {
      all: unset;
      padding: 4px 14px;
      border-radius: var(--radius-pill);
      font-size: 13px;
      font-weight: 600;
      color: var(--text-color-3);
      cursor: pointer;
      transition:
        background-color var(--duration-fast) var(--ease-out),
        color var(--duration-fast) var(--ease-out);

      &:hover { color: var(--text-color-1); }

      &.is-active {
        background-color: var(--bg-color-1);
        color: var(--text-color-1);
        box-shadow: var(--shadow-1);
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
    }
  }
</style>
