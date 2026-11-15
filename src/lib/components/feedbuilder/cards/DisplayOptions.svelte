<script lang="ts">
  import Pin from '@lucide/svelte/icons/pin';
  import X from '@lucide/svelte/icons/x';
  import Film from '@lucide/svelte/icons/film';
  import Rows3 from '@lucide/svelte/icons/rows-3';
  import Eye from '@lucide/svelte/icons/eye';
  import EyeOff from '@lucide/svelte/icons/eye-off';
  import { _ } from 'tokimeki-i18n';
  import { feedBuilder, isOrGroup, isNegated, PINNED_MAX } from '$lib/feedbuilder/feedBuilder.svelte';
  import { hydratePosts } from '$lib/feedbuilder/api';
  import { toPostAtUri } from '$lib/feedbuilder/postUri';
  import { CUSTOM_FEED_DEFS } from '$lib/feedbuilder/types';
  import type { PostView } from '$lib/feedbuilder/types';

  const pinned = $derived(feedBuilder.draft.pinnedPosts ?? []);
  const videoMode = $derived(feedBuilder.draft.contentMode === 'video');
  const hideSeen = $derived(feedBuilder.draft.hideSeen === true);
  const hasVideoFilter = $derived(
    feedBuilder.draft.predicates.some(
      (p) =>
        !isOrGroup(p) && !isNegated(p) && p.$type === CUSTOM_FEED_DEFS.predicateHasVideo && p.value === true
    )
  );

  let input = $state('');
  let error = $state<string | null>(null);
  let adding = $state(false);
  let posts = $state<Map<string, PostView>>(new Map());

  $effect(() => {
    const missing = pinned.filter((u) => !posts.has(u));
    if (missing.length === 0) return;
    hydratePosts(missing)
      .then((m) => {
        const next = new Map(posts);
        for (const [k, v] of m) next.set(k, v);
        posts = next;
      })
      .catch(() => {});
  });

  async function add() {
    if (!input.trim() || adding) return;
    error = null;
    adding = true;
    try {
      const uri = await toPostAtUri(input);
      if (pinned.includes(uri)) throw new Error($_('tfeeds_sortvis_pin_already'));
      if (!feedBuilder.togglePin(uri)) throw new Error($_('tfeeds_sortvis_pin_max', { max: PINNED_MAX }));
      input = '';
    } catch (e) {
      error = e instanceof Error ? e.message : $_('tfeeds_sortvis_pin_add_failed');
    } finally {
      adding = false;
    }
  }

  function snippet(uri: string): string {
    const p = posts.get(uri);
    if (!p) return uri.replace(/^at:\/\//, '').slice(0, 48) + '…';
    const text = (p.record.text ?? '').replace(/\s+/g, ' ').trim();
    return `@${p.author.handle}: ${text || $_('tfeeds_sortvis_pin_no_text')}`;
  }
</script>

<div class="display-opts">
  <h4 class="display-opts__heading">{$_('tfeeds_sortvis_display_heading')}</h4>

  <div class="display-opts__modes" role="radiogroup" aria-label={$_('tfeeds_sortvis_display_mode')}>
    <button
      type="button"
      role="radio"
      aria-checked={!videoMode}
      class="display-opts__mode"
      class:is-active={!videoMode}
      onclick={() => feedBuilder.setContentMode('default')}
    >
      <Rows3 size={15} strokeWidth={1.9} />
      <span>{$_('tfeeds_sortvis_mode_default')}</span>
    </button>
    <button
      type="button"
      role="radio"
      aria-checked={videoMode}
      class="display-opts__mode"
      class:is-active={videoMode}
      onclick={() => feedBuilder.setContentMode('video')}
    >
      <Film size={15} strokeWidth={1.9} />
      <span>{$_('tfeeds_sortvis_mode_video')}</span>
    </button>
  </div>
  <p class="display-opts__hint">
    {$_('tfeeds_sortvis_video_hint')}
    {#if videoMode && !hasVideoFilter}
      <strong>{$_('tfeeds_sortvis_video_recommend')}</strong>
    {/if}
  </p>

  <div class="display-opts__modes" role="radiogroup" aria-label={$_('tfeeds_sortvis_seen_group')}>
    <button
      type="button"
      role="radio"
      aria-checked={!hideSeen}
      class="display-opts__mode"
      class:is-active={!hideSeen}
      onclick={() => feedBuilder.setHideSeen(false)}
    >
      <Eye size={15} strokeWidth={1.9} />
      <span>{$_('tfeeds_sortvis_seen_show')}</span>
    </button>
    <button
      type="button"
      role="radio"
      aria-checked={hideSeen}
      class="display-opts__mode"
      class:is-active={hideSeen}
      onclick={() => feedBuilder.setHideSeen(true)}
    >
      <EyeOff size={15} strokeWidth={1.9} />
      <span>{$_('tfeeds_sortvis_seen_hide')}</span>
    </button>
  </div>
  <p class="display-opts__hint">{$_('tfeeds_sortvis_seen_hint')}</p>

  <div class="display-opts__pins">
    <span class="display-opts__label">
      <Pin size={13} strokeWidth={2} />
      {$_('tfeeds_sortvis_pin_label', { n: pinned.length, max: PINNED_MAX })}
    </span>
    {#if pinned.length > 0}
      <ul class="display-opts__pin-list">
        {#each pinned as uri (uri)}
          <li class="display-opts__pin">
            <span class="display-opts__pin-text" title={uri}>{snippet(uri)}</span>
            <button
              type="button"
              class="display-opts__pin-remove"
              aria-label={$_('tfeeds_sortvis_pin_remove')}
              onclick={() => feedBuilder.togglePin(uri)}
            >
              <X size={14} strokeWidth={2} />
            </button>
          </li>
        {/each}
      </ul>
    {/if}
    {#if pinned.length < PINNED_MAX}
      <form
        class="display-opts__pin-form"
        onsubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input
          class="display-opts__input"
          type="text"
          placeholder={$_('tfeeds_sortvis_pin_placeholder')}
          bind:value={input}
          aria-label={$_('tfeeds_sortvis_pin_input')}
        />
        <button type="submit" class="display-opts__add" disabled={!input.trim() || adding}>
          {$_('tfeeds_sortvis_pin_submit')}
        </button>
      </form>
    {/if}
    {#if error}
      <p class="display-opts__error">{error}</p>
    {/if}
    <p class="display-opts__hint">{$_('tfeeds_sortvis_pin_hint')}</p>
  </div>
</div>

<style lang="postcss">
  .display-opts {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    margin-top: var(--space-4);
    padding-top: var(--space-4);
    border-top: 1px solid var(--border-color-2);

    &__heading {
      margin: 0;
      font-size: 13px;
      font-weight: 700;
      color: var(--text-color-1);
    }

    &__modes {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-self: flex-start;
      max-width: 100%;
    }

    &__mode {
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

    &__pins {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-top: var(--space-2);
    }

    &__label {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-color-2);
    }

    &__pin-list {
      list-style: none;
      margin: 0;
      padding: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    &__pin {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 6px 6px 6px var(--space-3);
      border: 1px solid var(--border-color-2);
      border-radius: var(--radius-3);
      background: var(--bg-color-1);
    }

    &__pin-text {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 13px;
      color: var(--text-color-1);
    }

    &__pin-remove {
      all: unset;
      display: flex;
      padding: 4px;
      border-radius: var(--radius-2, 6px);
      color: var(--text-color-3);
      cursor: pointer;

      &:hover {
        background: var(--surface-hover);
        color: var(--danger-color);
      }

      &:focus-visible {
        outline: 2px solid var(--primary-color);
      }
    }

    &__pin-form {
      display: flex;
      gap: 6px;
    }

    &__input {
      flex: 1;
      min-width: 0;
      padding: 8px var(--space-3);
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-3);
      background: var(--bg-color-1);
      font: inherit;
      font-size: 13px;
      color: var(--text-color-1);

      &:focus {
        outline: 2px solid var(--primary-color);
        outline-offset: -1px;
      }
    }

    &__add {
      all: unset;
      padding: 0 var(--space-3);
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-3);
      background: var(--bg-color-1);
      font-size: 13px;
      font-weight: 600;
      color: var(--text-color-2);
      cursor: pointer;

      &:hover:not(:disabled) {
        background: var(--surface-hover);
        color: var(--primary-color);
      }

      &:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
    }

    &__hint {
      margin: 0;
      font-size: 12px;
      line-height: 1.6;
      color: var(--text-color-3);

      strong {
        color: var(--text-color-2);
      }
    }

    &__error {
      margin: 0;
      font-size: 12px;
      color: var(--danger-color);
    }
  }
</style>
