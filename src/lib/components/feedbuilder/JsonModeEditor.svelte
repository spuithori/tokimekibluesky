<script lang="ts">
  import { _ } from 'tokimeki-i18n';
  import { feedBuilder } from '$lib/feedbuilder/feedBuilder.svelte';
  import { FEEDS_SITE_URL } from '$lib/feedbuilder/api';

  const text = $derived(feedBuilder.jsonText);
  const err = $derived(feedBuilder.jsonError);

  function onInput(e: Event) {
    feedBuilder.setJsonText((e.target as HTMLTextAreaElement).value);
  }

  function onBlur() {
    feedBuilder.scheduleValidate();
  }
</script>

<div class="json-mode">
  <p class="json-mode__note">
    {$_('tfeeds_sortvis_json_note')}
    {#if feedBuilder.locked}
      <a class="json-mode__site" href={FEEDS_SITE_URL} target="_blank" rel="noopener noreferrer">{$_('tfeeds_sortvis_open_in_site')}</a>
    {/if}
  </p>
  <textarea
    class="json-mode__textarea"
    rows="24"
    spellcheck="false"
    value={text}
    oninput={onInput}
    onblur={onBlur}
  ></textarea>
  {#if err}
    <p class="json-mode__error">{err}</p>
  {/if}
  {#if feedBuilder.diagnostics.length > 0}
    {#each feedBuilder.diagnostics as d (d.message)}
      <p class="json-mode__error">
        {d.message}
        {#if d.astPath}<span class="json-mode__path">({d.astPath})</span>{/if}
      </p>
    {/each}
  {/if}
</div>

<style lang="postcss">
  .json-mode {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);

    &__note {
      margin: 0;
      color: var(--text-color-3);
      font-size: 0.8rem;
    }

    &__site {
      color: var(--primary-color);
      font-weight: 600;
    }

    &__textarea {
      width: 100%;
      padding: var(--space-3);
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-3);
      font-family: var(--code-font);
      font-size: 0.82rem;
      line-height: 1.55;
      background: var(--bg-color-2);
      color: var(--text-color-1);
      resize: vertical;
      box-sizing: border-box;
      min-height: 300px;
      transition:
        border-color var(--duration-fast) var(--ease-out),
        box-shadow var(--duration-fast) var(--ease-out);

      &:focus {
        outline: none;
        border-color: var(--primary-color);
        background: var(--bg-color-1);
        box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary-color) 18%, transparent);
      }
    }

    &__error {
      margin: 0;
      padding: var(--space-2) var(--space-3);
      background: color-mix(in srgb, var(--danger-color) 10%, var(--bg-color-1));
      color: var(--danger-color);
      border-radius: var(--radius-2);
      font-size: 0.82rem;
    }

    &__path {
      color: var(--text-color-3);
      font-size: 0.75rem;
      font-family: var(--code-font);
      margin-left: var(--space-2);
    }
  }
</style>
