<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { toast } from 'svelte-sonner';
    import { agent } from '$lib/stores';
    import { untrack } from 'svelte';
    import { submitTheme, type ThemeSubmission } from '../store';
    import { previewSrc } from '../preview';
    import type { Published } from './publish';
    import { attachScreenshots, type ScreenshotPreview } from './screenshots';

    let { published, thumbnailUrl, oncontinue, onupdate }: { published: Published; thumbnailUrl: string | null; oncontinue: () => void; onupdate: (published: Published) => void } = $props();

    let current = untrack(() => published);
    let shooting = $state(true);
    let shotsFailed = $state(false);
    let previews: ScreenshotPreview[] = $state([]);

    async function shoot() {
        if (!$agent) return;
        shooting = true;
        shotsFailed = false;
        try {
            const result = await attachScreenshots($agent, current);
            current = result.published;
            previews = result.previews.filter((shot) => shot.kind.endsWith('-light'));
            onupdate(result.published);
        } catch (e) {
            console.error(e);
            shotsFailed = true;
        } finally {
            shooting = false;
        }
    }

    shoot();

    const link = $derived(`${location.origin}/theme-store/theme/${published.installed.did}/${published.rkey}`);
    let submission: ThemeSubmission | null = $state(null);
    let submitting = $state(false);
    let submitFailed = $state(false);

    async function copy() {
        try {
            await navigator.clipboard.writeText(link);
            toast.success($_('success_copy_url'));
        } catch (e) {
            console.error(e);
        }
    }

    async function submit() {
        if (!$agent) return;
        submitting = true;
        submitFailed = false;
        try {
            submission = await submitTheme($agent, current.uri);
        } catch (e) {
            console.error(e);
            submitFailed = true;
        } finally {
            submitting = false;
        }
    }
</script>

<div class="published">
  <p class="published__done" role="status">{$_('builder_published')}</p>

  {#if thumbnailUrl}
    <img class="published__thumbnail" src={thumbnailUrl} alt="">
  {/if}

  <section class="published__shots" aria-label={$_('builder_shots')}>
    {#if shooting}
      <p class="published__note" role="status">{$_('builder_shots_working')}</p>
    {:else if shotsFailed}
      <p class="published__error" role="alert">{$_('builder_shots_failed')}</p>
      <button class="published__retry" onclick={shoot}>{$_('builder_shots_retry')}</button>
    {:else}
      <div class="published__shot-row">
        {#each previews as shot (shot.kind)}
          <img class="published__shot published__shot--{shot.kind.split('-')[0]}" {@attach previewSrc(shot.blob)} alt="">
        {/each}
      </div>
    {/if}
  </section>

  <label class="published__field">
    <span>{$_('builder_link')}</span>
    <span class="published__link">
      <input readonly value={link}>
      <button onclick={copy}>{$_('builder_copy')}</button>
    </span>
  </label>
</div>

<footer class="published__footer">
  {#if submission}
    <p class="published__status">{$_(`theme_submission_${submission.status}`)}{submission.rejectReason ? `: ${submission.rejectReason}` : ''}</p>
  {:else}
    {#if submitFailed}
      <p class="published__error" role="alert">{$_('theme_submit_error')}</p>
    {/if}
    <button class="published__primary" onclick={submit} disabled={submitting || shooting}>{$_('theme_submit')}</button>
  {/if}
  <button class="published__secondary" onclick={oncontinue}>{$_('builder_continue')}</button>
</footer>

<style lang="postcss">
  .published {
      flex: 1 1 0;
      min-height: 0;
      display: flex;
      flex-direction: column;
      gap: 20px;
      padding: 24px 20px;
      overflow: auto;
  }

  .published__done {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
      color: #1b7f4b;
      font-weight: 600;
  }

  .published__thumbnail {
      width: 96px;
      height: 96px;
      object-fit: cover;
      border-radius: 22px;
      border: 1px solid var(--builder-line);
  }

  .published__shots {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
  }

  .published__note {
      margin: 0;
      font-size: 13px;
      color: var(--builder-muted);
  }

  .published__retry {
      height: 34px;
      padding: 0 12px;
      border: 1px solid #dfe2e6;
      border-radius: 9px;
      font-size: 13px;
      color: var(--builder-text);
  }

  .published__shot-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
  }

  .published__shot {
      height: 160px;
      border-radius: 8px;
      border: 1px solid var(--builder-line);
      object-fit: cover;
  }

  .published__shot--desktop {
      aspect-ratio: 1440 / 900;
  }

  .published__shot--mobile {
      aspect-ratio: 390 / 844;
  }

  .published__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 13px;
      color: var(--builder-muted);
  }

  .published__link {
      display: flex;
      gap: 8px;

      & input {
          flex-grow: 1;
          min-width: 0;
          height: 40px;
          padding: 0 10px;
          border: 1px solid #dfe2e6;
          border-radius: 10px;
          font: inherit;
          font-size: 12px;
          color: var(--builder-muted);
          background: #fafbfc;
      }

      & button {
          height: 40px;
          padding: 0 14px;
          white-space: nowrap;
          border: 1px solid #dfe2e6;
          border-radius: 10px;
          color: var(--builder-text);
      }
  }

  .published__footer {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid var(--builder-line);
  }

  .published__status {
      margin: 0;
      font-size: 13px;
  }

  .published__error {
      margin: 0;
      font-size: 12px;
      color: var(--builder-danger);
  }

  .published__primary {
      height: 44px;
      border-radius: 10px;
      background: var(--builder-text);
      color: #fff;
      font-weight: 600;
  }

  .published__secondary {
      height: 40px;
      border-radius: 10px;
      color: var(--builder-text);
  }
</style>
