<script lang="ts">
  import { untrack } from 'svelte';
  import { _ } from 'tokimeki-i18n';
  import type { Agent } from '$lib/agent';
  import {
    MAX_TITLE_LENGTH,
    formatLinkUrl,
    truncateTitle,
    validateLinkInput,
    type LinkInputError,
    type ProfileLink,
  } from '$lib/profileLinks/rules';
  import { resolveNewLink } from '$lib/profileLinks/repo';

  interface Props {
    link: ProfileLink | null;
    otherUrls: string[];
    _agent: Agent;
    onsave: (link: ProfileLink) => void;
    onremove?: () => void;
  }

  let { link, otherUrls, _agent, onsave, onremove }: Props = $props();

  const initial = untrack(() => link);
  const startingInput = initial ? formatLinkUrl(initial.url) : '';
  let input = $state(startingInput);
  let title = $state(initial?.title ?? '');
  let error: LinkInputError | undefined = $state();
  let isBusy = $state(false);

  const errorKeys: Record<LinkInputError, string> = {
    invalid: 'profile_link_error_invalid',
    insecure: 'profile_link_error_insecure',
    shortener: 'profile_link_error_shortener',
    blocked: 'profile_link_error_blocked',
    duplicate: 'profile_link_error_duplicate',
  };

  async function save(e: SubmitEvent) {
    e.preventDefault();
    if (isBusy) return;

    const isSameDestination = !!initial && input.trim() === startingInput;
    const validation = isSameDestination ? { url: initial!.url } : validateLinkInput(input, otherUrls);
    if (validation.error || !validation.url) {
      error = validation.error ?? 'invalid';
      return;
    }

    const typedTitle = truncateTitle(title.trim());
    const saved: ProfileLink = { url: validation.url };
    if (initial?.uri) saved.uri = initial.uri;

    if (isSameDestination) {
      if (initial!.icon) saved.icon = initial!.icon;
      if (initial!.iconUrl) saved.iconUrl = initial!.iconUrl;
      if (typedTitle) saved.title = typedTitle;
      onsave(saved);
      return;
    }

    isBusy = true;
    const resolved = await resolveNewLink(_agent, validation.url, !typedTitle);
    isBusy = false;
    if (resolved.blocked) {
      error = 'blocked';
      return;
    }
    if (resolved.icon) saved.icon = resolved.icon;
    if (resolved.iconUrl) saved.iconUrl = resolved.iconUrl;
    const nextTitle = typedTitle || resolved.title;
    if (nextTitle) saved.title = nextTitle;
    onsave(saved);
  }
</script>

<form class="link-form" onsubmit={save}>
  <dl class="input-group">
    <dt class="input-group__name input-group__name--show">
      <label for="profile_link_url">{$_('profile_link_url')}</label>
    </dt>

    <dd class="input-group__content">
      <input
        class="input-group__input"
        type="text"
        inputmode="url"
        autocomplete="url"
        autocapitalize="none"
        spellcheck="false"
        id="profile_link_url"
        placeholder="example.com"
        bind:value={input}
        oninput={() => { error = undefined; }}
        aria-invalid={!!error}
        aria-describedby={error ? 'profile_link_error' : undefined}
        required
      >
      {#if error}
        <p class="link-form__error" id="profile_link_error">{$_(errorKeys[error])}</p>
      {/if}
    </dd>
  </dl>

  <dl class="input-group">
    <dt class="input-group__name input-group__name--show">
      <label for="profile_link_title">{$_('profile_link_title')}</label>
    </dt>

    <dd class="input-group__content">
      <input class="input-group__input" type="text" id="profile_link_title" maxlength={MAX_TITLE_LENGTH} bind:value={title}>
    </dd>
  </dl>

  <div class="link-form__buttons">
    <button class="button" type="submit" disabled={isBusy || !input.trim()}>{$_(initial ? 'save_button' : 'profile_link_add')}</button>
    {#if onremove}
      <button class="button button--border" type="button" onclick={onremove} disabled={isBusy}>{$_('profile_link_remove')}</button>
    {/if}
  </div>
</form>

<style lang="postcss">
  .input-group {
      input {
          border: 1px solid var(--border-color-1);
          color: var(--text-color-1);
          background-color: var(--bg-color-1);
      }
  }

  .link-form {
      &__error {
          margin-top: 6px;
          font-size: 14px;
          color: var(--danger-color);
      }

      &__buttons {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          margin-top: 32px;
      }
  }
</style>
