<script lang="ts">
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import X from '@lucide/svelte/icons/x';
    import Heart from '@lucide/svelte/icons/heart';
    import Ellipsis from '@lucide/svelte/icons/ellipsis';
    import Link from '@lucide/svelte/icons/link';
    import PaintRoller from '@lucide/svelte/icons/paint-roller';
    import { _ } from 'tokimeki-i18n';
    import { onDestroy } from 'svelte';
    import { page } from '$app/state';
    import { liveQuery } from 'dexie';
    import { toast } from 'svelte-sonner';
    import Menu from '$lib/components/ui/Menu.svelte';
    import Notice from '$lib/components/ui/Notice.svelte';
    import { agent, settings } from '$lib/stores';
    import { themesDb } from '$lib/db';
    import { THEME_COLLECTION } from '$lib/theme/format';
    import { installRemoteTheme, resolveThemeUri, ThemeFetchError } from '$lib/theme/atproto';
    import type { InstalledTheme } from '$lib/theme/installed';
    import { fetchStoreTheme, recordThemeInstall, setThemeLike, submitTheme, type StoreScreenshot, type StoreThemeDetail, type ThemeSubmission } from '$lib/theme/store';
    import { ensureBuilderLocale } from '$lib/theme/builder/i18n';
    import { builderHref } from '$lib/theme/builder/session';
    import { attachScreenshots } from '$lib/theme/builder/screenshots';

    const SHOT_ORDER = ['desktop-light', 'desktop-dark', 'mobile-light', 'mobile-dark'];

    let detail = $state<StoreThemeDetail | null>(null);
    let failure = $state<string | null>(null);
    let installing = $state(false);
    let liking = $state(false);
    let isMenuOpen = $state(false);
    let submission = $state<ThemeSubmission | null>(null);
    let submitting = $state(false);
    let installed = $state<InstalledTheme | undefined>();
    let shooting = $state(false);
    let shootFailed = $state(false);
    let watching: { unsubscribe(): void } | null = null;

    async function load(did: string, rkey: string) {
        try {
            const [{ uri }] = await Promise.all([resolveThemeUri(`at://${did}/${THEME_COLLECTION}/${rkey}`), ensureBuilderLocale()]);
            const item = await fetchStoreTheme($agent, uri);
            if (!item) throw new ThemeFetchError('not-found', 'theme not found');
            detail = item;
            watching = liveQuery(() => themesDb.themes.where('uri').equals(item.theme.uri).first()).subscribe((row) => (installed = row));
        } catch (e) {
            console.error(e);
            failure = e instanceof ThemeFetchError ? e.messageKey : 'theme_error_network';
        }
    }

    load(page.params.did as string, page.params.rkey as string);
    onDestroy(() => watching?.unsubscribe());

    const theme = $derived(detail?.theme);
    const record = $derived(theme?.record);
    const owner = $derived(!!theme && $agent?.did() === theme.did);
    const shots = $derived([...(detail?.screenshots ?? [])].sort((a, b) => SHOT_ORDER.indexOf(a.kind) - SHOT_ORDER.indexOf(b.kind)));
    const coverColor = $derived(record?.tokens.findLast((t) => t.name === '--base-bg-color' && /^#[0-9a-f]{3,8}$/i.test(t.value.trim()))?.value);
    const updated = $derived(record ? new Date(record.updatedAt ?? record.createdAt) : null);
    const link = $derived(theme ? `${location.origin}/theme-store/theme/${theme.did}/${theme.rkey}` : '');

    async function install() {
        if (!detail) return;
        installing = true;
        try {
            const { installed: row, replacedIds } = await installRemoteTheme(detail.theme, { channel: detail.approved ? 'approved' : 'latest' });
            if (replacedIds.includes($settings.design?.skin)) $settings.design.skin = row.id;
            recordThemeInstall($agent, row.id);
        } catch (e) {
            console.error(e);
            toast.error($_(e instanceof ThemeFetchError ? e.messageKey : 'theme_install_error'));
        } finally {
            installing = false;
        }
    }

    async function toggleLike() {
        if (!$agent || !detail || liking) return;
        const previous = detail.viewerLike;
        liking = true;
        detail.likeCount += previous ? -1 : 1;
        try {
            detail.viewerLike = await setThemeLike($agent, detail.theme, previous);
        } catch (e) {
            console.error(e);
            detail.likeCount += previous ? 1 : -1;
        } finally {
            liking = false;
        }
    }

    async function copyLink() {
        isMenuOpen = false;
        try {
            await navigator.clipboard.writeText(link);
            toast.success($_('success_copy_url'));
        } catch (e) {
            console.error(e);
        }
    }

    async function requestListing() {
        if (!$agent || !theme) return;
        submitting = true;
        try {
            submission = await submitTheme($agent, theme.uri);
        } catch (e) {
            console.error(e);
            toast.error($_('theme_submit_error'));
        } finally {
            submitting = false;
        }
    }

    async function takeScreenshots() {
        if (!$agent || !detail) return;
        const { theme: target } = detail;
        shooting = true;
        shootFailed = false;
        try {
            const result = await attachScreenshots($agent, {
                uri: target.uri,
                cid: target.cid,
                rkey: target.rkey,
                installed: { id: target.uri, uri: target.uri, cid: target.cid, did: target.did, record: target.record, installedAt: '' },
            });
            const record = result.published.installed.record;
            const cdn = (kind: string, cid: string) => `https://cdn.bsky.app/img/${kind}/plain/${target.did}/${cid}@webp`;
            detail.theme = { ...target, cid: result.published.cid, record };
            detail.screenshots = (record.screenshots ?? []).map((shot) => ({
                kind: shot.kind,
                thumb: cdn('feed_thumbnail', shot.image.ref.$link),
                fullsize: cdn('feed_fullsize', shot.image.ref.$link),
                aspectRatio: shot.aspectRatio,
            }));
        } catch (e) {
            console.error(e);
            shootFailed = true;
        } finally {
            shooting = false;
        }
    }

    const shotLabel = (shot: StoreScreenshot) => $_(`theme_page_shot_${shot.kind.replace('-', '_')}`);
</script>

<svelte:head>
  <title>{record?.name ?? $_('theme_store')} - TOKIMEKI</title>
</svelte:head>

<div class="settings-modal">
  <div class="settings-modal-content theme-page" role="dialog" aria-label={record?.name ?? $_('theme_store')}>
    <div class="theme-page__cover" style:background-color={coverColor}>
      {#if detail?.cover}
        <img src={detail.cover} alt="">
      {/if}
      <button class="theme-page__overlay-button theme-page__overlay-button--left" aria-label={$_('theme_page_back')} onclick={() => history.back()}>
        <ArrowLeft size={20} color="currentColor"></ArrowLeft>
      </button>
      <a class="theme-page__overlay-button theme-page__overlay-button--right" aria-label={$_('theme_page_close')} href="/">
        <X size={20} color="currentColor"></X>
      </a>
    </div>

    {#if failure}
      <p class="theme-page__failure" role="alert">{$_(failure)}</p>
    {:else if detail && theme && record}
      <div class="theme-page__body">
        <header class="theme-page__header">
          {#if theme.thumbnailUrl}
            <img class="theme-page__icon" src={theme.thumbnailUrl} alt="">
          {:else}
            <span class="theme-page__icon theme-page__icon--empty" style:background-color={coverColor}></span>
          {/if}
          <div class="theme-page__title">
            <h1>{record.name}</h1>
            <a href="/profile/{theme.handle ?? theme.did}">@{theme.handle ?? theme.did}</a>
          </div>
          <div class="theme-page__actions">
            <button class="theme-page__pill" aria-label={$_('theme_like')} aria-pressed={!!detail.viewerLike} onclick={toggleLike} disabled={!$agent || liking}>
              <Heart size={18} color="currentColor" fill={detail.viewerLike ? 'currentColor' : 'none'}></Heart>
              {detail.likeCount}
            </button>
            {#if !installed}
              <button class="button button--sm theme-page__primary" onclick={install} disabled={installing}>{$_('theme_install')}</button>
            {:else if installed.cid !== theme.cid}
              <button class="button button--sm theme-page__primary" onclick={install} disabled={installing}>{$_('theme_update')}</button>
            {:else if $settings.design?.skin === installed.id}
              <button class="button button--sm theme-page__primary" disabled>{$_('theme_current')}</button>
            {:else}
              <button class="button button--sm theme-page__primary" onclick={() => { if (installed) $settings.design.skin = installed.id; }}>{$_('theme_activate')}</button>
            {/if}
            <Menu bind:isMenuOpen buttonClassName="theme-page__pill theme-page__pill--icon">
              {#snippet ref()}
                <Ellipsis size={18} color="var(--text-color-1)" aria-label={$_('theme_page_more')}></Ellipsis>
              {/snippet}
              {#snippet content()}
                <ul class="timeline-menu-list">
                  <li class="timeline-menu-list__item">
                    <button class="timeline-menu-list__button" onclick={copyLink}>
                      <Link size={20} color="var(--text-color-1)"></Link>
                      <span>{$_('theme_page_copy_link')}</span>
                    </button>
                  </li>
                  {#if owner || installed}
                    <li class="timeline-menu-list__item">
                      <a class="timeline-menu-list__button" href={owner ? builderHref({ kind: 'own', uri: theme.uri }) : builderHref({ kind: 'installed', id: installed!.id })}>
                        <PaintRoller size={20} color="var(--text-color-1)"></PaintRoller>
                        <span>{$_(owner ? 'theme_page_edit' : 'theme_page_remix')}</span>
                      </a>
                    </li>
                  {/if}
                </ul>
              {/snippet}
            </Menu>
          </div>
        </header>

        {#if !detail.approved}
          <Notice text={$_('theme_unreviewed_notice')}></Notice>
        {/if}

        {#if record.description}
          <p class="theme-page__description">{record.description}</p>
        {/if}

        {#if owner && !shots.length}
          <section class="theme-page__section">
            <h2>{$_('theme_page_screenshots')}</h2>
            {#if shooting}
              <p class="theme-page__note" role="status">{$_('builder_shots_working')}</p>
            {:else}
              {#if shootFailed}
                <p class="theme-page__note" role="alert">{$_('builder_shots_failed')}</p>
              {/if}
              <button class="button button--sm theme-page__shoot" onclick={takeScreenshots}>{$_('theme_page_take_shots')}</button>
            {/if}
          </section>
        {:else if shots.length}
          <section class="theme-page__section">
            <h2>{$_('theme_page_screenshots')}</h2>
            <ul class="theme-page__shots">
              {#each shots as shot (shot.kind)}
                <li>
                  <figure>
                    <img src={shot.thumb} alt={shotLabel(shot)} loading="lazy" style:aspect-ratio="{shot.aspectRatio.width} / {shot.aspectRatio.height}">
                    <figcaption>{shotLabel(shot)}</figcaption>
                  </figure>
                </li>
              {/each}
            </ul>
          </section>
        {/if}

        <div class="theme-page__columns">
          {#if record.variants?.length}
            <section class="theme-page__section">
              <h2>{$_('theme_page_colors')}</h2>
              <ul class="theme-page__swatches">
                {#each record.variants as variant (variant.key)}
                  <li><span style:background={variant.swatch}></span>{variant.name}</li>
                {/each}
              </ul>
            </section>
          {/if}
          <section class="theme-page__section">
            <h2>{$_('theme_page_info')}</h2>
            <dl class="theme-page__info">
              <dt>{$_('theme_version')}</dt>
              <dd>{record.version}</dd>
              {#if updated && !Number.isNaN(updated.getTime())}
                <dt>{$_('theme_page_updated')}</dt>
                <dd>{updated.toLocaleDateString()}</dd>
              {/if}
              <dt>{$_('theme_page_listing')}</dt>
              <dd>{$_(detail.approved ? 'theme_page_listed' : 'theme_page_unlisted')}</dd>
              <dt>{$_('theme_page_modes')}</dt>
              <dd>{record.dark?.length ? $_('theme_page_light_dark') : $_('theme_page_light')}</dd>
            </dl>
            {#if owner && !detail.approved}
              {#if submission}
                <p class="theme-page__note">{$_(`theme_submission_${submission.status}`)}{submission.rejectReason ? `: ${submission.rejectReason}` : ''}</p>
              {:else}
                <button class="button button--sm" onclick={requestListing} disabled={submitting}>{$_('theme_submit')}</button>
              {/if}
            {/if}
          </section>
        </div>
      </div>
    {/if}
  </div>

  <a class="modal-background-close" aria-hidden="true" href="/"></a>
</div>

<style lang="postcss">
  .theme-page {
      width: 960px;
      height: auto;
      max-height: calc(100vh - 100px);
      overflow-y: auto;
      display: flex;
      flex-direction: column;

      @media (max-width: 767px) {
          width: 100%;
          height: 100%;
          max-height: none;
          border: 0;
          border-radius: 0;
      }
  }

  .theme-page__cover {
      position: relative;
      flex-shrink: 0;
      aspect-ratio: 3 / 1;
      background-color: var(--bg-color-2);

      & img {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
      }
  }

  .theme-page__overlay-button {
      position: absolute;
      top: 16px;
      width: 40px;
      height: 40px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      background: rgba(0, 0, 0, .35);
      color: #fff;
  }

  .theme-page__overlay-button--left {
      left: 16px;
  }

  .theme-page__overlay-button--right {
      right: 16px;
  }

  .theme-page__failure {
      padding: 32px 40px;
      color: var(--text-color-3);
  }

  .theme-page__body {
      display: flex;
      flex-direction: column;
      gap: 28px;
      padding: 0 40px 32px;

      @media (max-width: 767px) {
          gap: 24px;
          padding: 0 16px 32px;
      }
  }

  .theme-page__header {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: flex-end;
      gap: 20px;
      margin-top: -44px;

      @media (max-width: 767px) {
          flex-wrap: wrap;
          gap: 12px;
          margin-top: -36px;
      }
  }

  .theme-page__icon {
      width: 104px;
      height: 104px;
      flex-shrink: 0;
      object-fit: cover;
      border-radius: 24px;
      border: 4px solid var(--surface-overlay, var(--bg-color-1));
      background: var(--bg-color-2);

      @media (max-width: 767px) {
          width: 80px;
          height: 80px;
          border-radius: 20px;
      }
  }

  .theme-page__title {
      flex-grow: 1;
      min-width: 0;
      padding-bottom: 4px;

      & h1 {
          margin: 0;
          font-size: 26px;
          line-height: 1.25;
          color: var(--text-color-1);
          overflow-wrap: anywhere;
      }

      & a {
          font-size: 14px;
          color: var(--text-color-3);
      }

      @media (max-width: 767px) {
          flex-basis: 100%;

          & h1 {
              font-size: 22px;
          }
      }
  }

  .theme-page__actions {
      display: flex;
      align-items: center;
      gap: 8px;
      padding-bottom: 4px;

      @media (max-width: 767px) {
          flex-basis: 100%;
      }
  }

  .theme-page__actions :global(.theme-page__pill) {
      height: 40px;
      min-width: 40px;
      padding: 0 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      border: 1px solid var(--border-color-1);
      border-radius: 20px;
      color: var(--text-color-1);
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
  }

  .theme-page__actions :global(.theme-page__pill[aria-pressed='true']) {
      color: var(--timeline-reaction-liked-icon-color, var(--primary-color));
  }

  .theme-page__actions :global(.theme-page__pill--icon) {
      padding: 0;
  }

  .theme-page__primary {
      white-space: nowrap;

      @media (max-width: 767px) {
          flex-grow: 1;
      }
  }

  .theme-page__description {
      margin: 0;
      max-width: 640px;
      line-height: 1.8;
      color: var(--text-color-1);
      white-space: pre-wrap;
  }

  .theme-page__section {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 0;

      & h2 {
          margin: 0;
          font-size: 15px;
          color: var(--text-color-1);
      }
  }

  .theme-page__shots {
      display: flex;
      gap: 16px;
      margin: 0 -40px;
      padding: 0 40px 4px;
      list-style: none;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      scroll-padding: 0 40px;

      @media (max-width: 767px) {
          margin: 0 -16px;
          padding: 0 16px 4px;
          scroll-padding: 0 16px;
      }

      & li {
          flex-shrink: 0;
          scroll-snap-align: start;
      }

      & figure {
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 6px;
      }

      & img {
          display: block;
          height: 220px;
          width: auto;
          border-radius: 10px;
          border: 1px solid var(--border-color-1);
          background: var(--bg-color-2);
      }

      & figcaption {
          font-size: 12px;
          color: var(--text-color-3);
      }
  }

  .theme-page__columns {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 32px;

      @media (max-width: 767px) {
          grid-template-columns: minmax(0, 1fr);
          gap: 24px;
      }
  }

  .theme-page__swatches {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 0;
      padding: 0;
      list-style: none;

      & li {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px 6px 6px;
          border: 1px solid var(--border-color-1);
          border-radius: 20px;
          font-size: 14px;
          color: var(--text-color-1);
      }

      & span {
          width: 22px;
          height: 22px;
          border-radius: 50%;
      }
  }

  .theme-page__info {
      display: grid;
      grid-template-columns: 96px 1fr;
      row-gap: 8px;
      margin: 0;
      font-size: 13px;

      & dt {
          color: var(--text-color-3);
      }

      & dd {
          margin: 0;
          color: var(--text-color-1);
      }
  }

  .theme-page__shoot {
      align-self: flex-start;
  }

  .theme-page__note {
      margin: 0;
      font-size: 13px;
      color: var(--text-color-3);
  }
</style>
