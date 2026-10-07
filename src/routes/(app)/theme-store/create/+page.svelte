<script lang="ts">
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import X from '@lucide/svelte/icons/x';
    import ChevronRight from '@lucide/svelte/icons/chevron-right';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import { toast } from 'svelte-sonner';
    import { _, t } from 'tokimeki-i18n';
    import { agent } from '$lib/stores';
    import { themesDb } from '$lib/db';
    import { previewSrc } from '$lib/theme/preview';
    import type { InstalledTheme } from '$lib/theme/installed';
    import { fetchAuthorThemes, type AuthorTheme } from '$lib/theme/store';
    import { ensureBuilderLocale } from '$lib/theme/builder/i18n';
    import { deleteDraft, listDrafts, saveDraft } from '$lib/theme/builder/storage';
    import { builderHref } from '$lib/theme/builder/session';
    import type { Draft } from '$lib/theme/builder/draft';

    let ready = $state(false);
    let drafts: Draft[] = $state([]);
    let installed: InstalledTheme[] = $state([]);
    let mine: AuthorTheme[] = $state([]);

    const timeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });

    async function load() {
        await ensureBuilderLocale();
        ready = true;
        [drafts, installed] = await Promise.all([listDrafts(), themesDb.themes.toArray()]);
        if ($agent) mine = await fetchAuthorThemes($agent).catch((e) => {
            console.error(e);
            return [];
        });
    }

    async function remove(draft: Draft) {
        drafts = drafts.filter((item) => item.id !== draft.id);
        try {
            await deleteDraft(draft.id);
        } catch (e) {
            console.error(e);
            drafts = await listDrafts();
            return;
        }
        toast.success(t('builder_draft_deleted', { name: draft.name }), {
            action: {
                label: t('builder_undo'),
                onClick: () => {
                    saveDraft(draft)
                        .then(listDrafts)
                        .then((list) => (drafts = list))
                        .catch((e) => console.error(e));
                },
            },
        });
    }

    function status(item: AuthorTheme): string {
        if (item.approved) return t('builder_status_listed');
        if (item.submission?.status === 'pending') return t('builder_status_pending');
        if (item.submission?.status === 'rejected') return t('builder_status_rejected');
        return t('builder_status_personal');
    }

    load().catch((e) => console.error(e));
</script>

<svelte:head>
  <title>{ready ? $_('builder_create') : ''} - TOKIMEKI</title>
</svelte:head>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" onclick={() => history.back()}>
        <ArrowLeft color="var(--text-color-1)" />
      </button>
    </div>
    <h1 class="column-heading__title">{ready ? $_('builder_create') : ''}</h1>
    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <X color="var(--text-color-1)" />
      </a>
    </div>
  </div>

  {#if ready}
    <div class="settings-wrap create">
      {#if drafts.length}
        <section class="create__section">
          <h2 class="create__heading">{$_('builder_resume')}</h2>
          {#each drafts as draft (draft.id)}
            <div class="create__row">
              <a class="create__item" href={builderHref({ kind: 'draft', id: draft.id })}>
                <span class="create__body"><strong>{draft.name}</strong><span class="create__meta">{timeFormat.format(new Date(draft.updatedAt))}</span></span>
                <ChevronRight size={18} color="currentColor"></ChevronRight>
              </a>
              <button class="create__delete" aria-label={$_('builder_delete_draft', { name: draft.name })} onclick={() => remove(draft)}>
                <Trash2 size={18} color="currentColor"></Trash2>
              </button>
            </div>
          {/each}
        </section>
      {/if}

      <section class="create__section">
        <h2 class="create__heading">{$_('builder_new')}</h2>
        <a class="create__item" href={builderHref({ kind: 'default' })}>
          <span class="create__body"><strong>{$_('builder_from_default')}</strong></span>
          <ChevronRight size={18} color="currentColor"></ChevronRight>
        </a>
      </section>

      {#if installed.length}
        <section class="create__section">
          <h2 class="create__heading">{$_('builder_from_installed')}</h2>
          {#each installed as theme (theme.id)}
            <a class="create__item" href={builderHref({ kind: 'installed', id: theme.id })}>
              {#if theme.thumbnail || theme.previewUrl}
                <img class="create__thumbnail" {@attach previewSrc(theme.thumbnail, theme.previewUrl)} alt="">
              {/if}
              <span class="create__body"><strong>{theme.record.name}</strong><span class="create__meta">{theme.handle ?? theme.author ?? ''}</span></span>
              <ChevronRight size={18} color="currentColor"></ChevronRight>
            </a>
          {/each}
        </section>
      {/if}

      {#if mine.length}
        <section class="create__section">
          <h2 class="create__heading">{$_('builder_edit_mine')}</h2>
          {#each mine as item (item.theme.uri)}
            <a class="create__item" href={builderHref({ kind: 'own', uri: item.theme.uri })}>
              {#if item.theme.thumbnailUrl}
                <img class="create__thumbnail" src={item.theme.thumbnailUrl} alt="">
              {/if}
              <span class="create__body"><strong>{item.theme.record.name}</strong><span class="create__meta">{status(item)}</span></span>
              <ChevronRight size={18} color="currentColor"></ChevronRight>
            </a>
          {/each}
        </section>
      {/if}
    </div>
  {/if}
</div>

<style lang="postcss">
  .create {
      display: flex;
      flex-direction: column;
      gap: 24px;
  }

  .create__section {
      display: flex;
      flex-direction: column;
      gap: 8px;
  }

  .create__heading {
      margin: 0;
      font-size: 13px;
      font-weight: 600;
      color: var(--text-color-2);
  }

  .create__item {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      padding: 12px 16px;
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-card, var(--border-radius-4));
      color: var(--text-color-1);
      text-align: left;
      text-decoration: none;
      background: var(--bg-color-1);

      &:hover {
          background: var(--state-hover, var(--bg-color-2));
      }
  }

  .create__row {
      display: flex;
      align-items: stretch;
      gap: 8px;

      & .create__item {
          flex: 1;
          min-width: 0;
      }
  }

  .create__delete {
      flex-shrink: 0;
      width: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-card, var(--border-radius-4));
      color: var(--text-color-2);
      background: var(--bg-color-1);

      &:hover {
          color: var(--danger-color);
          background: var(--state-hover, var(--bg-color-2));
      }
  }

  .create__thumbnail {
      width: 56px;
      height: 36px;
      flex-shrink: 0;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid var(--border-color-1);
  }

  .create__body {
      flex-grow: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 2px;
  }

  .create__meta {
      font-size: 12px;
      color: var(--text-color-2);
  }
</style>
