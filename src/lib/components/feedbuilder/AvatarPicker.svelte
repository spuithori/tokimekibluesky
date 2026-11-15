<script lang="ts">
  import { _ } from 'tokimeki-i18n';
  import { feedBuilder } from '$lib/feedbuilder/feedBuilder.svelte';
  import { session } from '$lib/feedbuilder/session.svelte';
  import { avatarUrl } from '$lib/feedbuilder/avatar';
  import { DEFAULT_FEED_AVATAR_URL } from '$lib/feedbuilder/api';

  let busy = $state(false);
  let error = $state<string | null>(null);

  const a = $derived(feedBuilder.draft.avatar);
  const src = $derived(
    a?.kind === 'new'
      ? a.url
      : a?.kind === 'stored'
        ? (avatarUrl(session.did, a.blob) ?? DEFAULT_FEED_AVATAR_URL)
        : DEFAULT_FEED_AVATAR_URL
  );
  const hint = $derived(
    !session.did
      ? $_('tfeeds_sortvis_avatar_login')
      : a?.kind === 'new'
        ? $_('tfeeds_sortvis_avatar_on_save')
        : a
          ? $_('tfeeds_sortvis_avatar_published')
          : $_('tfeeds_sortvis_avatar_default')
  );

  async function pick(e: Event & { currentTarget: HTMLInputElement }) {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    error = null;
    if (!/^image\/(png|jpeg|webp|gif)$/.test(file.type)) {
      error = $_('tfeeds_sortvis_avatar_bad_type');
      return;
    }
    busy = true;
    try {
      await feedBuilder.setAvatar(file);
    } catch (err) {
      error = err instanceof Error ? err.message : $_('tfeeds_sortvis_avatar_read_failed');
    } finally {
      busy = false;
    }
  }
</script>

<div class="avatar-pick">
  <img class="avatar-pick__img" {src} alt={$_('tfeeds_sortvis_avatar_alt')} width="64" height="64" />
  <div class="avatar-pick__body">
    <span class="avatar-pick__label" id="avatar-pick-label">{$_('tfeeds_sortvis_avatar_label')}</span>
    <div class="avatar-pick__row">
      <label class="avatar-pick__btn" class:is-disabled={!session.did || busy}>
        {busy ? $_('tfeeds_sortvis_loading') : $_('tfeeds_sortvis_avatar_pick')}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          aria-describedby="avatar-pick-hint"
          disabled={!session.did || busy}
          onchange={pick}
        />
      </label>
      {#if a}
        <button type="button" class="avatar-pick__btn avatar-pick__btn--ghost" onclick={() => feedBuilder.clearAvatar()}>{$_('tfeeds_sortvis_avatar_remove')}</button>
      {/if}
    </div>
    <span class="avatar-pick__hint" id="avatar-pick-hint" aria-live="polite">{error ?? hint}</span>
  </div>
</div>

<style lang="postcss">
  .avatar-pick {
    display: flex;
    align-items: center;
    gap: var(--space-3);

    &__img {
      width: 64px;
      height: 64px;
      flex-shrink: 0;
      object-fit: cover;
      border-radius: 12px;
      border: 1px solid var(--hairline);
      background: var(--bg-color-1);
    }

    &__body {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    &__label {
      font-family: var(--code-font);
      font-size: 11px;
      letter-spacing: 0.1em;
      color: var(--text-color-3);
    }

    &__row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    &__btn {
      position: relative;
      display: inline-flex;
      align-items: center;
      min-height: 32px;
      padding: 0 12px;
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-2);
      background: var(--bg-color-1);
      color: var(--text-color-1);
      font: 500 13px var(--font-body);
      cursor: pointer;

      &:hover:not(.is-disabled) { border-color: var(--ink); }
      &:focus-within, &:focus-visible { outline: 2px solid var(--primary-color); outline-offset: 2px; }
      &.is-disabled { opacity: 0.5; cursor: not-allowed; }

      input {
        position: absolute;
        inset: 0;
        opacity: 0;
        width: 100%;
        cursor: inherit;
      }
    }

    &__btn--ghost {
      border-color: transparent;
      color: var(--text-color-2);
      &:hover { color: var(--danger-color); }
    }

    &__hint {
      font-size: 12px;
      color: var(--text-color-2);
    }
  }
</style>
