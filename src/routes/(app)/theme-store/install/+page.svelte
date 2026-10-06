<script lang="ts">
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import X from '@lucide/svelte/icons/x';
    import { _ } from 'tokimeki-i18n';
    import { page } from '$app/state';
    import Notice from '$lib/components/ui/Notice.svelte';
    import ThemeItem from '../ThemeItem.svelte';
    import { fetchRemoteTheme, listApprovedThemes, ThemeFetchError, type RemoteTheme } from '$lib/theme/atproto';
    import { submitTheme, type ThemeSubmission } from '$lib/theme/store';
    import { agent } from '$lib/stores';

    const initial = page.url.searchParams.get('uri') ?? '';
    let value = $state(initial);
    let result: Promise<{ theme: RemoteTheme; approved: boolean }> | null = $state(initial ? load(initial) : null);

    async function load(input: string) {
        const [theme, approvedList] = await Promise.all([
            fetchRemoteTheme(input),
            listApprovedThemes().catch(() => []),
        ]);
        const approved = approvedList.some((item) => item.theme.uri === theme.uri && item.theme.cid === theme.cid);
        return { theme, approved };
    }

    let submission: ThemeSubmission | null = $state(null);
    let submitting = $state(false);
    let submitFailed = $state(false);

    async function requestListing(theme: RemoteTheme) {
        if (!$agent) return;
        submitting = true;
        submitFailed = false;
        try {
            submission = await submitTheme($agent, theme.uri);
        } catch (e) {
            console.error(e);
            submitFailed = true;
        } finally {
            submitting = false;
        }
    }

    function submit(event: SubmitEvent) {
        event.preventDefault();
        if (value.trim()) {
            submission = null;
            result = load(value);
        }
    }
</script>

<svelte:head>
  <title>{$_('theme_store')} - TOKIMEKI</title>
</svelte:head>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" onclick={() => {history.back()}}>
        <ArrowLeft color="var(--text-color-1)" />
      </button>
    </div>

    <h1 class="column-heading__title">{$_('theme_install_from_link')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <X color="var(--text-color-1)" />
      </a>
    </div>
  </div>

  <div class="settings-wrap">
    <section class="theme-store-section">
      <form onsubmit={submit} class="input-with-button">
        <input class="input-with-button__input" type="text" bind:value={value} placeholder="at://…/tech.tokimeki.theme.theme/…">
        <button class="input-with-button__button button button--sm">{$_('theme_code_execute')}</button>
      </form>
    </section>

    {#if result}
      {#await result then { theme, approved }}
        <section class="theme-store-section">
          {#if !approved}
            <Notice text={$_('theme_unreviewed_notice')}></Notice>
          {/if}
          <ThemeItem remote={theme} channel={approved ? 'approved' : 'latest'}></ThemeItem>

          {#if !approved && $agent?.did() === theme.did}
            {#if submission}
              <p class="settings-description">{$_(`theme_submission_${submission.status}`)}{submission.rejectReason ? `: ${submission.rejectReason}` : ''}</p>
            {:else}
              <button class="button button--sm" onclick={() => requestListing(theme)} disabled={submitting}>{$_('theme_submit')}</button>
              {#if submitFailed}
                <p class="settings-description">{$_('theme_submit_error')}</p>
              {/if}
            {/if}
          {/if}
        </section>
      {:catch error}
        <p class="settings-description">{$_(error instanceof ThemeFetchError ? error.messageKey : 'theme_install_error')}</p>
      {/await}
    {/if}
  </div>
</div>
