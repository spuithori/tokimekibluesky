<script lang="ts">
  import { toast } from 'svelte-sonner';
  import ArrowDown from '@lucide/svelte/icons/arrow-down';
  import { _ } from 'tokimeki-i18n';
  import { prefersReducedMotion } from '$lib/feedbuilder/motion';
  import {
    feedBuilder,
    draftSummary,
    DESCRIPTION_MAX,
    type BuilderCardId,
    type BuilderMode
  } from '$lib/feedbuilder/feedBuilder.svelte';
  import { easySupport } from '$lib/feedbuilder/easyMode';
  import EasyEditor from './EasyEditor.svelte';
  import AvatarPicker from './AvatarPicker.svelte';
  import SourceCard from './cards/SourceCard.svelte';
  import FilterCard from './cards/FilterCard.svelte';
  import SortVisibilityCard from './cards/SortVisibilityCard.svelte';
  import PreviewPanel from './PreviewPanel.svelte';
  import JsonModeEditor from './JsonModeEditor.svelte';
  import HistoryModal from './HistoryModal.svelte';

  interface Props {
    onCancel?: () => void;
    onSaved?: (uri: string) => void;
  }
  let { onCancel, onSaved }: Props = $props();

  let openMap = $state<Record<BuilderCardId, boolean>>({
    name: true,
    source: true,
    filter: true,
    sort: false,
    visibility: false
  });

  function toggleCard(id: BuilderCardId) {
    openMap = { ...openMap, [id]: !openMap[id] };
    if (openMap[id]) feedBuilder.setActiveCard(id);
  }

  const summarySentence = $derived(draftSummary(feedBuilder.draft));

  const MODES: { id: BuilderMode; label: string }[] = [
    { id: 'easy', get label() { return $_('tfeeds_main_mode_easy'); } },
    { id: 'card', get label() { return $_('tfeeds_main_mode_card'); } },
    { id: 'json', label: 'JSON' }
  ];
  const modeIndex = $derived(MODES.findIndex((m) => m.id === feedBuilder.mode));
  const easy = $derived(feedBuilder.mode === 'json' ? null : easySupport(feedBuilder.draft));
  const easyBlocked = $derived(easy !== null && !easy.ok ? easy.reason : null);

  let tabEls: HTMLButtonElement[] = [];

  function switchMode(next: BuilderMode) {
    const err = feedBuilder.setMode(next);
    if (err) toast.error(err);
  }

  function onTabKey(e: KeyboardEvent, i: number) {
    let next = i;
    if (e.key === 'ArrowRight') next = (i + 1) % MODES.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + MODES.length) % MODES.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = MODES.length - 1;
    else return;
    e.preventDefault();
    tabEls[next]?.focus();
    switchMode(MODES[next].id);
  }

  async function save() {
    try {
      const entry = await feedBuilder.save();
      if (entry) onSaved?.(entry.uri);
    } catch (e) {
      console.error('[FeedBuilder] save failed', e);
    }
  }

  const statusText = $derived(
    feedBuilder.saving
      ? $_('tfeeds_main_saving')
      : feedBuilder.canSave
        ? feedBuilder.originalUri
          ? $_('tfeeds_main_can_save')
          : $_('tfeeds_main_can_save_new')
        : (feedBuilder.saveBlockedReason ?? '')
  );

  let historyOpen = $state(false);

  let previewVisible = $state(false);
  $effect(() => {
    const el = document.getElementById('fb-preview');
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((entries) => {
      previewVisible = entries.some((e) => e.isIntersecting);
    });
    io.observe(el);
    return () => io.disconnect();
  });

  function jumpToPreview() {
    const el = document.getElementById('fb-preview');
    if (!el) return;
    el.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
    el.focus({ preventScroll: true });
  }
</script>

<div class="fb">
  <header class="fb__bar">
    <div class="fb__modes" role="tablist" aria-label={$_('tfeeds_main_modes_aria')} style="--i: {modeIndex}">
      <span class="fb__modes-indicator" aria-hidden="true"></span>
      {#each MODES as m, i (m.id)}
        {@const selected = feedBuilder.mode === m.id}
        {@const blocked = m.id === 'easy' && !selected && easyBlocked !== null}
        <button
          type="button"
          role="tab"
          id="fb-tab-{m.id}"
          aria-selected={selected}
          aria-controls="fb-panel"
          aria-disabled={blocked || undefined}
          tabindex={selected ? 0 : -1}
          class="fb__mode"
          class:is-json={m.id === 'json'}
          class:is-blocked={blocked}
          title={blocked ? $_('tfeeds_easy_unsupported', { reason: easyBlocked }) : undefined}
          bind:this={tabEls[i]}
          onclick={() => switchMode(m.id)}
          onkeydown={(e) => onTabKey(e, i)}>{m.label}</button
        >
      {/each}
    </div>
    <span class="fb__status" id="fb-status" aria-live="polite">{statusText}</span>
    <div class="fb__actions">
      {#if feedBuilder.originalUri}
        <button type="button" class="fb__secondary" onclick={() => (historyOpen = true)}>{$_('tfeeds_main_history')}</button>
      {/if}
      {#if onCancel}
        <button type="button" class="fb__secondary" onclick={onCancel}>{$_('tfeeds_main_close')}</button>
      {/if}
      <button
        type="button"
        class="fb__primary"
        onclick={save}
        disabled={!feedBuilder.canSave}
        aria-describedby="fb-status"
      >
        {feedBuilder.saving ? $_('tfeeds_main_saving') : $_('tfeeds_main_save')}
      </button>
    </div>
  </header>

  {#if feedBuilder.globalError}
    <div class="fb__banner" role="alert">
      <span class="fb__banner-message">{feedBuilder.globalError.message}</span>
      {#if feedBuilder.globalError.suggestion}
        <span class="fb__banner-suggestion">{feedBuilder.globalError.suggestion}</span>
      {/if}
      {#if feedBuilder.globalError.astPath}
        <code class="fb__banner-path">{feedBuilder.globalError.astPath}</code>
      {/if}
    </div>
  {/if}

  <div class="fb__body">
    <div class="fb__editor" id="fb-panel" role="tabpanel" aria-labelledby="fb-tab-{feedBuilder.mode}">
      {#if feedBuilder.mode !== 'json'}
        <div class="fb__identity">
        <AvatarPicker />
        <div class="fb__name">
          <label for="fb-name" class="fb__label">{$_('tfeeds_main_name')}</label>
          <input
            id="fb-name"
            class="fb__name-input"
            type="text"
            placeholder={$_('tfeeds_main_name_placeholder')}
            value={feedBuilder.draft.name}
            oninput={(e) => feedBuilder.setName(e.currentTarget.value)}
            autocomplete="off"
          />
        </div>
        </div>
        <div class="fb__desc">
          <div class="fb__desc-head">
            <label for="fb-desc" class="fb__label">{$_('tfeeds_main_desc')}</label>
            <span class="fb__desc-count" class:fb__desc-count--over={feedBuilder.descriptionTooLong}>
              {feedBuilder.descriptionLength}/{DESCRIPTION_MAX}
            </span>
          </div>
          <textarea
            id="fb-desc"
            class="fb__desc-input"
            rows="2"
            placeholder={$_('tfeeds_main_desc_placeholder')}
            value={feedBuilder.draft.description ?? ''}
            oninput={(e) => feedBuilder.setDescription(e.currentTarget.value)}
            aria-invalid={feedBuilder.descriptionTooLong}
          ></textarea>
        </div>
      {/if}

      {#key feedBuilder.mode}
        <div class="fb__mode-body">
          {#if feedBuilder.mode === 'easy'}
            <EasyEditor />
          {:else if feedBuilder.mode === 'card'}
            <p class="fb__summary" aria-live="polite">{summarySentence}</p>
            <div class="fb__cards">
              <SourceCard open={openMap.source} onToggle={() => toggleCard('source')} />
              <FilterCard open={openMap.filter} onToggle={() => toggleCard('filter')} />
              <SortVisibilityCard which="sort" open={openMap.sort} onToggle={() => toggleCard('sort')} />
              <SortVisibilityCard
                which="visibility"
                open={openMap.visibility}
                onToggle={() => toggleCard('visibility')}
              />
            </div>
          {:else}
            <JsonModeEditor />
          {/if}
        </div>
      {/key}
    </div>

    <div class="fb__preview" id="fb-preview" tabindex="-1">
      <PreviewPanel />
    </div>
  </div>

  {#if !previewVisible}
  <button type="button" class="fb__jump" onclick={jumpToPreview}>
    <span>{$_('tfeeds_main_preview')}</span>
    <span class="fb__jump-meta">
      {#if feedBuilder.preview.loading}
        {$_('tfeeds_main_loading')}
      {:else if feedBuilder.preview.error}
        {$_('tfeeds_main_error')}
      {:else if feedBuilder.preview.ranAt}
        {$_('tfeeds_main_count_n', { n: feedBuilder.preview.feed.length })}
      {/if}
    </span>
    <ArrowDown size={16} strokeWidth={2} aria-hidden="true" />
  </button>
  {/if}
</div>

{#if historyOpen && feedBuilder.originalUri}
  <HistoryModal uri={feedBuilder.originalUri} onclose={() => (historyOpen = false)} />
{/if}

<style lang="postcss">
  .fb {
    display: flex;
    flex-direction: column;

    &__bar {
      position: sticky;
      top: var(--app-bar-height);
      z-index: var(--z-sticky);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2) var(--space-4);
      padding: var(--space-2) 0;
      background: var(--base-bg-color);
      border-bottom: 1px solid var(--hairline);
    }

    &__modes {
      position: relative;
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      border: var(--line-strong);
      border-radius: var(--radius-2);
    }

    &__modes-indicator {
      position: absolute;
      inset: 0 auto 0 0;
      width: calc(100% / 3);
      background: var(--ink);
      transform: translateX(calc(var(--i) * 100%));
      transition: transform var(--duration-slow) var(--ease-out);
    }

    &__mode {
      position: relative;
      z-index: 1;
      min-height: 36px;
      padding: 0 14px;
      border: 0;
      background: transparent;
      color: var(--text-color-1);
      font: 500 13px var(--font-body);
      white-space: nowrap;
      cursor: pointer;
      transition: color var(--duration-mid) var(--ease-out);

      &[aria-selected='true'] {
        color: var(--base-bg-color);
        font-weight: 600;
      }

      &.is-json { font-family: var(--code-font); }

      &.is-blocked {
        color: var(--text-color-3);
        text-decoration: line-through;
        text-decoration-thickness: 1px;
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
    }

    &__status {
      flex: 1 1 12rem;
      min-width: 0;
      font-family: var(--code-font);
      font-size: 12px;
      color: var(--text-color-2);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__actions {
      display: flex;
      gap: var(--space-2);
      margin-left: auto;
    }

    &__secondary,
    &__primary {
      min-height: 40px;
      padding: 0 var(--space-4);
      border-radius: var(--radius-2);
      font: 500 14px var(--font-body);
      cursor: pointer;
      transition:
        background-color var(--duration-fast) var(--ease-out),
        color var(--duration-fast) var(--ease-out);

      &:focus-visible {
        outline: 2px solid var(--primary-color);
        outline-offset: 2px;
      }
    }

    &__secondary {
      border: 1px solid var(--border-color-1);
      background: var(--bg-color-1);
      color: var(--text-color-1);

      &:hover { border-color: var(--ink); }
    }

    &__primary {
      border: 1px solid var(--primary-color);
      background: var(--primary-color);
      color: var(--on-primary);
      font-weight: 600;
      padding: 0 var(--space-5);

      &:hover:not(:disabled) { background: var(--primary-color-hover); }

      &:disabled {
        border-color: var(--border-color-1);
        background: var(--bg-color-3);
        color: var(--text-color-2);
        cursor: not-allowed;
      }
    }

    &__banner {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      margin-top: var(--space-3);
      padding: var(--space-3) var(--space-4);
      background: var(--bg-color-1);
      border: 1px solid var(--danger-color);
      border-left-width: 4px;
      border-radius: var(--radius-2);
    }

    &__banner-message {
      color: var(--danger-color);
      font-size: 14px;
      font-weight: 600;
    }

    &__banner-suggestion {
      color: var(--text-color-2);
      font-size: 13px;
    }

    &__banner-path {
      align-self: flex-start;
      padding: 2px var(--space-2);
      background: var(--bg-color-2);
      font-family: var(--code-font);
      font-size: 12px;
      color: var(--text-color-2);
    }

    &__body {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      padding-top: var(--space-6);
    }

    @media (min-width: 1100px) {
      flex: 1;
      min-height: 0;

      &__bar {
        position: static;
      }

      &__body {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr);
        grid-template-rows: minmax(0, 1fr);
        gap: 0;
        padding-top: 0;
      }

      &__editor,
      &__preview {
        min-height: 0;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-gutter: stable;
        scrollbar-width: thin;
      }

      &__editor {
        margin-left: -8px;
        padding: var(--space-6) var(--space-6) var(--space-12) 8px;
      }

      &__preview {
        padding: 0 var(--space-3) var(--space-12) var(--space-6);
        border-left: 1px solid var(--hairline);

        :global(.preview-panel__header) {
          position: sticky;
          top: 0;
          z-index: 2;
          padding: var(--space-6) 0 var(--space-3);
          background: var(--base-bg-color);
        }
      }
    }

    &__preview {
      scroll-margin-top: calc(var(--app-bar-height) + 72px);

      &:focus { outline: 0; }

      :global(.explain) {
        scroll-margin-top: calc(var(--app-bar-height) + 128px + var(--space-3));

        @media (min-width: 1100px) {
          scroll-margin-top: calc(var(--space-6) + var(--space-3) * 2 + 48px);
        }
      }
    }

    &__jump {
      position: sticky;
      bottom: calc(var(--space-3) + var(--safe-bottom));
      z-index: var(--z-sticky);
      align-self: center;
      display: inline-flex;
      align-items: center;
      gap: var(--space-3);
      min-height: 44px;
      margin-top: var(--space-6);
      padding: 0 var(--space-4);
      border: var(--line-strong);
      border-radius: var(--radius-2);
      background: var(--bg-color-1);
      color: var(--text-color-1);
      font: 600 14px var(--font-body);
      box-shadow: var(--shadow-3);
      cursor: pointer;
      animation: rise-in var(--duration-slow) var(--ease-out);

      &:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }

      @media (min-width: 1100px) {
        display: none;
      }
    }

    &__jump-meta {
      font: 400 12px var(--code-font);
      color: var(--text-color-2);
    }

    &__editor {
      display: flex;
      flex-direction: column;
      gap: var(--space-6);
      min-width: 0;
    }

    &__mode-body {
      display: flex;
      flex-direction: column;
      gap: var(--space-4);
      animation: fade-in var(--duration-mid) var(--ease-out);
    }

    &__label {
      font-family: var(--code-font);
      font-size: 11px;
      letter-spacing: 0.1em;
      color: var(--text-color-3);
    }

    &__identity {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: var(--space-4) var(--space-6);
    }

    &__name {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      flex: 1 1 280px;
      max-width: 480px;
    }

    &__name-input {
      width: 100%;
      padding: 6px 0;
      border: 0;
      border-bottom: 1px solid var(--border-color-1);
      border-radius: 0;
      background: transparent;
      color: var(--text-color-1);
      font: 600 20px var(--font-body);
      transition: border-color var(--duration-fast) var(--ease-out);

      &::placeholder { color: var(--text-color-3); font-weight: 500; }
      &:hover { border-bottom-color: var(--text-color-2); }
      &:focus-visible {
        outline: 0;
        border-bottom: 2px solid var(--primary-color);
        margin-bottom: -1px;
      }
    }

    &__desc {
      display: flex;
      flex-direction: column;
      gap: var(--space-1);
      max-width: 640px;
    }

    &__desc-head {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }

    &__desc-count {
      font-family: var(--code-font);
      font-size: 11px;
      color: var(--text-color-3);
      font-variant-numeric: tabular-nums;

      &--over { color: var(--danger-color); }
    }

    &__desc-input {
      width: 100%;
      padding: 6px 0;
      border: 0;
      border-bottom: 1px solid var(--border-color-1);
      border-radius: 0;
      background: transparent;
      color: var(--text-color-1);
      font: 400 15px/1.6 var(--font-body);
      resize: vertical;
      field-sizing: content;
      min-height: calc(2lh + 12px);
      transition: border-color var(--duration-fast) var(--ease-out);

      &::placeholder { color: var(--text-color-3); }
      &:hover { border-bottom-color: var(--text-color-2); }
      &:focus-visible {
        outline: 0;
        border-bottom: 2px solid var(--primary-color);
        margin-bottom: -1px;
      }
    }

    &__summary {
      margin: 0;
      padding: var(--space-3) 0;
      border-top: var(--line-strong);
      font-size: 15px;
      line-height: 1.6;
      color: var(--text-color-1);
    }

    &__cards {
      display: flex;
      flex-direction: column;
      counter-reset: stage;
      border-top: var(--line-strong);
    }
  }
</style>
