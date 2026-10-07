<script lang="ts">
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Heart from '@lucide/svelte/icons/heart';
  import Download from '@lucide/svelte/icons/download';
  import {themesDb} from "$lib/db";
  import {liveQuery} from "dexie";
  import {settings, agent} from "$lib/stores";
  import {_} from "tokimeki-i18n";
  import Menu from "$lib/components/ui/Menu.svelte";
  import { toast } from "svelte-sonner";
  import type { InstalledTheme } from "$lib/theme/installed";
  import { installRemoteTheme, ThemeFetchError, type RemoteTheme } from "$lib/theme/atproto";
  import { previewSrc } from "$lib/theme/preview";
  import { recordThemeInstall } from "$lib/theme/store";

  interface Props {
    installed?: InstalledTheme;
    remote?: RemoteTheme;
    likeCount?: number;
    installCount?: number;
    liked?: boolean;
    onlike?: () => void;
    channel?: InstalledTheme['channel'];
  }

  let { installed, remote, likeCount, installCount, liked = false, onlike, channel = 'approved' }: Props = $props();

  let isMenuOpen = $state(false);
  let installing = $state(false);

  const record = $derived(remote?.record ?? installed?.record);
  const pageHref = $derived.by(() => {
      const uri = remote?.uri ?? installed?.uri;
      const match = uri ? /^at:\/\/([^/]+)\/[^/]+\/([^/]+)$/.exec(uri) : null;
      return match ? `/theme-store/theme/${match[1]}/${match[2]}` : null;
  });
  const author = $derived(remote?.handle ?? installed?.handle ?? installed?.author ?? remote?.did ?? installed?.did);

  const mine = liveQuery(async () => {
      if (installed && !installed.builtIn) return await themesDb.themes.get(installed.id);
      if (remote) return await themesDb.themes.where('uri').equals(remote.uri).first();
      return undefined;
  });

  const targetId = $derived($mine?.id ?? (installed?.builtIn ? installed.id : undefined));

  async function install() {
      if (!remote) return;
      installing = true;
      try {
          const { installed: row, replacedIds } = await installRemoteTheme(remote, { channel });
          if (replacedIds.includes($settings.design?.skin)) {
              $settings.design.skin = row.id;
          }
          recordThemeInstall($agent, row.id);
      } catch (e) {
          console.error(e);
          toast.error($_(e instanceof ThemeFetchError ? e.messageKey : 'theme_install_error'));
      } finally {
          installing = false;
      }
  }

  function activate() {
      if (targetId) $settings.design.skin = targetId;
  }

  async function uninstall() {
      try {
          if ($mine) await themesDb.themes.delete($mine.id);
          toast.success($_('theme_uninstall_success'));
      } catch (e) {
          console.error(e);
      }

      isMenuOpen = false;
  }
</script>

{#if record}
<section class="theme-item">
  <div class="theme-item__thumbnail">
    {#if remote?.thumbnailUrl}
      <img src={remote.thumbnailUrl} alt="">
    {:else if installed?.thumbnail || installed?.previewUrl}
      <img {@attach previewSrc(installed.thumbnail, installed.previewUrl)} alt="">
    {/if}
  </div>

  <div class="theme-item__content">
    <h2 class="theme-item__title">
      {#if pageHref}
        <a href={pageHref}>{record.name}</a>
      {:else}
        {record.name}
      {/if}
    </h2>
    {#if record.description}
      <p class="theme-item__text">{record.description}</p>
    {/if}

    <dl class="theme-item-meta">
      {#if author}
        <div class="theme-item-meta__item">
          <dt class="theme-item-meta__name">{$_('theme_author')}:</dt>
          <dd class="theme-item-meta__content">{author}</dd>
        </div>
      {/if}

      <div class="theme-item-meta__item">
        <dt class="theme-item-meta__name">{$_('theme_version')}:</dt>
        <dd class="theme-item-meta__content">{record.version}</dd>
      </div>

      {#if record.variants?.length}
        <div class="theme-item-meta__item">
          <dt class="theme-item-meta__name">{$_('theme_feature')}:</dt>
          <dd class="theme-item-meta__content">{$_('theme_custom_color')}</dd>
        </div>
      {/if}
    </dl>

    <div class="theme-item__buttons">
      {#if likeCount !== undefined || installCount !== undefined}
        <div class="theme-item__stats">
          {#if likeCount !== undefined}
            <button
              class="theme-item__stat theme-item__stat--like"
              class:theme-item__stat--liked={liked}
              onclick={onlike}
              disabled={!onlike}
              aria-pressed={liked}
              aria-label={$_('theme_like')}
            >
              <Heart size={16} color="currentColor" fill={liked ? 'currentColor' : 'none'}></Heart>{likeCount}
            </button>
          {/if}
          {#if installCount !== undefined}
            <span class="theme-item__stat" aria-label={$_('theme_install_count')}>
              <Download size={16} color="currentColor"></Download>{installCount}
            </span>
          {/if}
        </div>
      {/if}

      {#if remote}
        {#if !$mine}
          <button class="button button--ss" onclick={install} disabled={installing}>{$_('theme_install')}</button>
        {:else if $mine.cid !== remote.cid}
          <button class="text-button" onclick={install} disabled={installing}>{$_('theme_update')}</button>
        {/if}
      {/if}

      {#if targetId && $settings.design?.skin === targetId}
        <button class="button button--ss" disabled>{$_('theme_current')}</button>
      {:else if targetId}
        <button class="button button--ss" onclick={activate}>{$_('theme_activate')}</button>
      {/if}
    </div>
  </div>

  {#if $mine && $settings.design?.skin !== $mine.id}
    <Menu bind:isMenuOpen={isMenuOpen}>
      {#snippet content()}
        <ul class="timeline-menu-list">
          <li class="timeline-menu-list__item">
            <button class="timeline-menu-list__button" onclick={uninstall}>
              <Trash2 size={20} color="var(--danger-color)" />
              <span>{$_('theme_uninstall')}</span>
            </button>
          </li>
        </ul>
      {/snippet}
    </Menu>
  {/if}
</section>
{/if}

<style lang="postcss">
  .theme-item {
      padding: 16px;
      box-shadow: var(--elevation-1, 0 0 10px var(--box-shadow-color-1));
      margin-bottom: 16px;
      border-radius: var(--radius-card, var(--border-radius-3));
      display: grid;
      align-items: flex-start;
      grid-template-columns: 60px 1fr;
      gap: 8px;
      position: relative;

      img {
          width: 100%;
          height: auto;
      }

      &__thumbnail {
          border-radius: var(--border-radius-3);
          overflow: hidden;
      }

      &__title {
          color: var(--text-color-1);
          font-size: 16px;
          margin-bottom: 4px;

          & a {
              color: inherit;
          }
      }

      &__text {
          color: var(--text-color-3);
          font-size: 14px;
      }

      &__buttons {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 16px;
      }

      &__stats {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-right: auto;
      }

      &__stat {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: var(--text-color-3);
          font-size: 13px;
          font-variant-numeric: tabular-nums;

          &--like:not(:disabled) {
              cursor: pointer;
          }

          &--liked {
              color: var(--timeline-reaction-liked-icon-color, var(--primary-color));
          }
      }
  }

  .theme-item-meta {
      color: var(--text-color-3);
      font-size: 14px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 4px;

      &__item {
          display: flex;
          gap: 4px;
      }
  }
</style>
