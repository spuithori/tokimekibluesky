<script lang="ts">
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import X from '@lucide/svelte/icons/x';
    import { _ } from 'tokimeki-i18n';
    import { onDestroy } from 'svelte';
    import { toast } from 'svelte-sonner';
    import { agent, theme } from '$lib/stores';
    import ThemeItem from '../ThemeItem.svelte';
    import { OFFICIAL_THEME_DID } from '$lib/theme/format';
    import { validateThemeRecord } from '$lib/theme/validate';
    import { previewRemoteTheme, type RemoteTheme } from '$lib/theme/atproto';
    import { approveTheme, getSubmissions, rejectTheme, unlistTheme, type ThemeSubmission } from '$lib/theme/store';

    const STATUSES: ThemeSubmission['status'][] = ['pending', 'rejected', 'approved'];

    let status: ThemeSubmission['status'] = $state('pending');
    let submissions: ThemeSubmission[] = $state([]);
    let busy = $state(false);
    let reasons: Record<string, string> = $state({});
    let previewing: string | null = $state(null);
    const original = $theme;

    const isOfficial = $derived($agent?.did() === OFFICIAL_THEME_DID);

    function review(submission: ThemeSubmission) {
        const strict = validateThemeRecord(submission.record);
        const loose = validateThemeRecord(submission.record, { strict: false });
        const remote: RemoteTheme | null = loose.ok
            ? { uri: submission.uri, cid: submission.cid, did: submission.did, rkey: submission.rkey, handle: submission.handle, pds: submission.pds.replace(/\/$/, ''), record: loose.record, thumbnailUrl: submission.thumbnail }
            : null;
        return { remote, errors: strict.ok ? [] : strict.errors };
    }

    async function load() {
        if (!$agent || !isOfficial) return;
        busy = true;
        try {
            submissions = await getSubmissions($agent, status);
        } catch (e) {
            console.error(e);
            toast.error($_('theme_review_error'));
        } finally {
            busy = false;
        }
    }

    function changeStatus(next: ThemeSubmission['status']) {
        status = next;
        load();
    }

    async function run(action: () => Promise<unknown>) {
        busy = true;
        try {
            await action();
            await load();
        } catch (e) {
            console.error(e);
            toast.error($_('theme_review_error'));
        } finally {
            busy = false;
        }
    }

    async function tryOn(remote: RemoteTheme) {
        $theme = await previewRemoteTheme(remote);
        previewing = remote.uri;
    }

    function stopPreview() {
        $theme = original;
        previewing = null;
    }

    onDestroy(() => {
        if (previewing) $theme = original;
    });

    load();
</script>

<svelte:head>
  <title>{$_('theme_review')} - TOKIMEKI</title>
</svelte:head>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" onclick={() => {history.back()}}>
        <ArrowLeft color="var(--text-color-1)" />
      </button>
    </div>

    <h1 class="column-heading__title">{$_('theme_review')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <X color="var(--text-color-1)" />
      </a>
    </div>
  </div>

  <div class="settings-wrap">
    {#if isOfficial}
      <div class="theme-review-tabs" role="group" aria-label={$_('theme_review')}>
        {#each STATUSES as value (value)}
          <button
            class="theme-review-tabs__button"
            class:theme-review-tabs__button--active={status === value}
            aria-pressed={status === value}
            onclick={() => changeStatus(value)}
          >{$_(`theme_review_${value}`)}</button>
        {/each}
      </div>

      {#each submissions as submission (submission.uri)}
        {@const { remote, errors } = review(submission)}
        <section class="theme-review">
          {#if remote}
            <ThemeItem {remote}></ThemeItem>
          {/if}

          {#if submission.approvedCid && submission.approvedCid !== submission.cid}
            <p class="theme-review__note">{$_('theme_review_updated')}</p>
          {/if}
          {#if submission.rejectReason}
            <p class="theme-review__note">{submission.rejectReason}</p>
          {/if}
          {#if errors.length}
            <ul class="theme-review__errors">
              {#each errors as error, i (i)}
                <li>{error}</li>
              {/each}
            </ul>
          {/if}

          <div class="theme-review__actions">
            {#if remote}
              {#if previewing === remote.uri}
                <button class="text-button" onclick={stopPreview}>{$_('theme_review_stop_preview')}</button>
              {:else}
                <button class="text-button" onclick={() => tryOn(remote)} disabled={busy}>{$_('theme_review_preview')}</button>
              {/if}
            {/if}
            {#if status === 'approved' && submission.approvalUri}
              <button class="text-button" onclick={() => run(() => unlistTheme($agent, submission.approvalUri!))} disabled={busy}>{$_('theme_review_unlist')}</button>
            {:else if status === 'pending'}
              <input class="theme-review__reason" type="text" bind:value={reasons[submission.uri]} placeholder={$_('theme_review_reason')}>
              <button class="text-button" onclick={() => run(() => rejectTheme($agent, submission.uri, reasons[submission.uri] ?? ''))} disabled={busy}>{$_('theme_review_reject')}</button>
            {/if}
            {#if submission.status !== 'approved'}
              <button class="button button--ss" onclick={() => run(() => approveTheme($agent, submission))} disabled={busy || errors.length > 0}>{$_('theme_review_approve')}</button>
            {/if}
          </div>
        </section>
      {:else}
        {#if !busy}
          <p class="settings-description">{$_('theme_review_empty')}</p>
        {/if}
      {/each}
    {:else}
      <p class="settings-description">{$_('theme_review_official_only')}</p>
    {/if}
  </div>
</div>

<style lang="postcss">
    .theme-review-tabs {
        display: flex;
        gap: 4px;
        margin-bottom: 16px;

        &__button {
            display: flex;
            align-items: center;
            padding: 0 12px;
            border: 1px solid var(--primary-color);
            height: 28px;
            border-radius: 14px;
            font-size: 13px;
            color: var(--primary-color);
            white-space: nowrap;

            &--active {
                background-color: var(--primary-color);
                color: var(--on-accent, var(--bg-color-1));
            }
        }
    }

    .theme-review {
        margin-bottom: 24px;

        &__note {
            color: var(--text-color-3);
            font-size: 14px;
            margin-bottom: 8px;
        }

        &__errors {
            color: var(--danger-color);
            font-size: 13px;
            margin: 0 0 8px 16px;
        }

        &__actions {
            display: flex;
            align-items: center;
            justify-content: flex-end;
            flex-wrap: wrap;
            gap: 8px;
        }

        &__reason {
            flex: 1;
            min-width: 120px;
            height: 32px;
            padding: 0 8px;
            border: 1px solid var(--border-color-1);
            border-radius: var(--radius-control, var(--border-radius-2));
            background: var(--bg-color-1);
            color: var(--text-color-1);
        }
    }
</style>
