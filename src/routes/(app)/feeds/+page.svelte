<script module lang="ts">
  let builderOwner = $state<string | null>(null);
</script>

<script lang="ts">
  import { untrack } from 'svelte';
  import { _ } from 'tokimeki-i18n';
  import { toast } from 'svelte-sonner';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import Copy from '@lucide/svelte/icons/copy';
  import CopyPlus from '@lucide/svelte/icons/copy-plus';
  import ChartColumn from '@lucide/svelte/icons/chart-column';
  import RefreshCw from '@lucide/svelte/icons/refresh-cw';
  import Ellipsis from '@lucide/svelte/icons/ellipsis';
  import Newspaper from '@lucide/svelte/icons/newspaper';
  import Columns3 from '@lucide/svelte/icons/columns-3';
  import ArrowLeft from '@lucide/svelte/icons/arrow-left';
  import X from '@lucide/svelte/icons/x';
  import {
    customFeeds,
    generatorUri,
    type CustomFeedEntry
  } from '$lib/feedbuilder/customFeeds.svelte';
  import { session } from '$lib/feedbuilder/session.svelte';
  import { feedBuilder } from '$lib/feedbuilder/feedBuilder.svelte';
  import { DEFAULT_FEED_AVATAR_URL, FEEDS_SITE_URL } from '$lib/feedbuilder/api';
  import { avatarUrl } from '$lib/feedbuilder/avatar';
  import { sourceMeta } from '$lib/components/feedbuilder/sourceMeta';
  import FeedBuilder from '$lib/components/feedbuilder/FeedBuilder.svelte';
  import TemplateCarousel from '$lib/components/feedbuilder/TemplateCarousel.svelte';
  import FeedStatsModal from '$lib/components/feedbuilder/FeedStatsModal.svelte';
  import Modal from '$lib/components/ui/Modal.svelte';
  import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
  import Menu from '$lib/components/ui/Menu.svelte';
  import { getColumnState } from '$lib/classes/columnState.svelte';
  import { addColumnWithIcon } from '$lib/addColumnWithIcon';
  import { makeColumn } from '$lib/components/column/catalog/columnCatalog';

  const columnState = getColumnState();

  let templateModalOpen = $state(false);
  let confirmRemove = $state<CustomFeedEntry | null>(null);
  let statsEntry = $state<CustomFeedEntry | null>(null);
  let busyUri = $state<string | null>(null);
  let menuUri = $state<string | null>(null);

  const view = $derived(builderOwner !== null && builderOwner === session.did ? 'builder' : 'list');

  $effect(() => {
    const did = session.did;
    if (!did) return;
    untrack(() => {
      if (customFeeds.owner !== did) {
        customFeeds.reset();
      }
      customFeeds.load().catch(() => {});
    });
  });

  async function run(entry: CustomFeedEntry, action: () => Promise<unknown>) {
    if (busyUri) return;
    busyUri = entry.uri;
    try {
      await action();
    } catch {
    } finally {
      busyUri = null;
    }
  }

  function addColumn(entry: CustomFeedEntry) {
    const agent = session.agent;
    if (!agent) return;
    const did = agent.did();
    const avatar = avatarUrl(did, entry.record.avatar ?? entry.generatorAvatar) ?? undefined;
    addColumnWithIcon(
      columnState,
      makeColumn(did, agent.handle() ?? '', {
        type: 'custom',
        algorithm: generatorUri(did, entry.rkey),
        name: entry.record.name,
        avatar
      }),
      entry.record.description
    );
    toast.success($_('column_added'));
  }

  function publish(entry: CustomFeedEntry) {
    return run(entry, () =>
      customFeeds.publish(entry.uri, {
        action: { label: $_('tfeeds_page_add_column'), onClick: () => addColumn(entry) }
      })
    );
  }

  function togglePublish(entry: CustomFeedEntry) {
    return entry.published ? run(entry, () => customFeeds.unpublish(entry.uri)) : publish(entry);
  }

  function openNew() {
    feedBuilder.reset();
    templateModalOpen = true;
  }

  function pickTemplate(id: string) {
    feedBuilder.loadFromTemplate(id);
    templateModalOpen = false;
    builderOwner = session.did;
  }

  function startBlank() {
    feedBuilder.reset();
    feedBuilder.scheduleValidate();
    templateModalOpen = false;
    builderOwner = session.did;
  }

  function edit(entry: CustomFeedEntry) {
    feedBuilder.loadFromEntry(entry);
    builderOwner = session.did;
  }

  function backToList() {
    builderOwner = null;
  }

  async function copySkeletonUrl(entry: CustomFeedEntry) {
    const feed = generatorUri(session.did ?? '', entry.rkey);
    const url = `${FEEDS_SITE_URL}/xrpc/app.bsky.feed.getFeedSkeleton?feed=${encodeURIComponent(feed)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success($_('tfeeds_page_skeleton_copied'));
    } catch {
      toast.error($_('tfeeds_page_copy_failed'));
    }
  }

  function doRemove() {
    const target = confirmRemove;
    confirmRemove = null;
    if (target) customFeeds.remove(target.uri).catch(() => {});
  }
</script>

<svelte:head>
  <title>{$_('tfeeds_page_title')} - TOKIMEKI</title>
</svelte:head>

{#if view === 'list'}
  <div class="feeds-page">
    <header class="feeds-head">
      <h1 class="feeds-head__title">{$_('tfeeds_page_title')}</h1>
      <span class="feeds-head__beta">Beta</span>
      <a class="feeds-icon-button" href="/" aria-label={$_('close')}>
        <X size={20} aria-hidden="true" />
      </a>
    </header>

    <div class="feeds-page__intro">
      <p class="feeds-page__lead">{$_('tfeeds_page_description')}</p>
      <button type="button" class="button button--sm" onclick={openNew}>{$_('tfeeds_page_new')}</button>
    </div>

    {#if customFeeds.loading && !customFeeds.loaded}
      <p class="feeds-page__status">{$_('tfeeds_page_loading')}</p>
    {:else if customFeeds.items.length === 0}
      <p class="feeds-page__status">
        {$_('tfeeds_page_empty_1')}<br />
        {$_('tfeeds_page_empty_2')}
      </p>
    {:else}
      <ul class="feeds-page__list">
        {#each customFeeds.items as entry (entry.uri)}
          {@const meta = sourceMeta(entry.record.source)}
          {@const busy = busyUri === entry.uri}
          <li class="my-feed">
            <button type="button" class="my-feed__main" onclick={() => edit(entry)}>
              <img
                class="my-feed__avatar"
                src={avatarUrl(session.did, entry.record.avatar ?? entry.generatorAvatar) ?? DEFAULT_FEED_AVATAR_URL}
                alt=""
                width="40"
                height="40"
                loading="lazy"
              />
              <span class="my-feed__text">
                <span class="my-feed__name">{entry.record.name}</span>
                <span class="my-feed__meta">
                  <span class="my-feed__state" class:my-feed__state--live={entry.published}>
                    {entry.published ? $_('tfeeds_page_live') : $_('tfeeds_page_not_live')}
                  </span>
                  <span>{meta.label}</span>
                  <span>
                    {entry.record.visibility === 'public' ? $_('tfeeds_page_public') : $_('tfeeds_page_private')}
                  </span>
                </span>
              </span>
            </button>

            <div class="my-feed__actions">
              {#if entry.published && entry.outdated}
                <button
                  type="button"
                  class="my-feed__publish my-feed__publish--primary"
                  disabled={busy}
                  title={$_('tfeeds_page_republish_title')}
                  onclick={() => publish(entry)}
                >
                  <RefreshCw size={14} aria-hidden="true" />
                  {$_('tfeeds_page_republish')}
                </button>
              {/if}
              <button
                type="button"
                class="my-feed__publish"
                class:my-feed__publish--primary={!entry.published}
                disabled={busy}
                onclick={() => togglePublish(entry)}
              >
                {entry.published ? $_('tfeeds_page_unpublish') : $_('tfeeds_page_publish')}
              </button>
              {#if entry.published && session.did}
                <button
                  type="button"
                  class="feeds-icon-button"
                  aria-label={$_('tfeeds_page_stats')}
                  title={$_('tfeeds_page_stats')}
                  onclick={() => (statsEntry = entry)}
                >
                  <ChartColumn size={18} aria-hidden="true" />
                </button>
                <a
                  class="feeds-icon-button"
                  href="/profile/{session.did}/feed/{entry.rkey}"
                  aria-label={$_('tfeeds_page_open_feed')}
                  title={$_('tfeeds_page_open_feed')}
                >
                  <Newspaper size={18} aria-hidden="true" />
                </a>
              {/if}
              <Menu
                buttonClassName="feeds-icon-button"
                bind:isMenuOpen={() => menuUri === entry.uri, (open) => (menuUri = open ? entry.uri : null)}
              >
                {#snippet ref()}
                  <Ellipsis size={18} aria-label={$_('tfeeds_page_more')} />
                {/snippet}
                {#snippet content()}
                    <ul class="timeline-menu-list">
                      {#if entry.published && session.did}
                        <li class="timeline-menu-list__item">
                          <button
                            class="timeline-menu-list__button"
                            onclick={() => {
                              menuUri = null;
                              addColumn(entry);
                            }}
                          >
                            <Columns3 size={18} color="var(--text-color-1)" />
                            <span>{$_('tfeeds_page_add_column')}</span>
                          </button>
                        </li>
                      {/if}
                      <li class="timeline-menu-list__item">
                        <button
                          class="timeline-menu-list__button"
                          disabled={busy}
                          onclick={() => {
                            menuUri = null;
                            void run(entry, () => customFeeds.duplicate(entry.uri));
                          }}
                        >
                          <CopyPlus size={18} color="var(--text-color-1)" />
                          <span>{$_('tfeeds_page_duplicate')}</span>
                        </button>
                      </li>
                      <li class="timeline-menu-list__item">
                        <button
                          class="timeline-menu-list__button"
                          onclick={() => {
                            menuUri = null;
                            void copySkeletonUrl(entry);
                          }}
                        >
                          <Copy size={18} color="var(--text-color-1)" />
                          <span>{$_('tfeeds_page_copy_skeleton')}</span>
                        </button>
                      </li>
                      <li class="timeline-menu-list__item">
                        <button
                          class="timeline-menu-list__button"
                          onclick={() => {
                            menuUri = null;
                            confirmRemove = entry;
                          }}
                        >
                          <Trash2 size={18} color="var(--danger-color)" />
                          <span class="text-danger">{$_('tfeeds_page_remove')}</span>
                        </button>
                      </li>
                    </ul>
                {/snippet}
              </Menu>
            </div>
          </li>
        {/each}
      </ul>

      <p class="feeds-page__note">
        {$_('tfeeds_page_ad_note_before')}<a href="{FEEDS_SITE_URL}/terms" target="_blank" rel="noopener noreferrer"
          >{$_('tfeeds_page_terms')}</a
        >{$_('tfeeds_page_ad_note_after')}
      </p>
    {/if}
  </div>
{:else}
  <div class="feeds-page feeds-page--builder">
    <header class="feeds-head">
      <button type="button" class="feeds-icon-button" onclick={backToList} aria-label={$_('tfeeds_page_back')}>
        <ArrowLeft size={20} aria-hidden="true" />
      </button>
      <h1 class="feeds-head__title">
        {feedBuilder.originalUri ? $_('tfeeds_page_edit_title') : $_('tfeeds_page_new_title')}
      </h1>
      <span class="feeds-head__beta">Beta</span>
      <a class="feeds-icon-button" href="/" aria-label={$_('close')}>
        <X size={20} aria-hidden="true" />
      </a>
    </header>

    <FeedBuilder onCancel={backToList} onSaved={backToList} />
  </div>
{/if}

{#if statsEntry && session.did}
  <FeedStatsModal
    did={session.did}
    rkey={statsEntry.rkey}
    name={statsEntry.record.name}
    onclose={() => (statsEntry = null)}
  />
{/if}

{#if templateModalOpen}
  <Modal title={$_('tfeeds_page_pick_template')} onclose={() => (templateModalOpen = false)}>
    <TemplateCarousel onPick={pickTemplate} onBlank={startBlank} />
  </Modal>
{/if}

{#if confirmRemove}
  <ConfirmModal
    yesText={$_('delete')}
    cancelText={$_('cancel')}
    onok={doRemove}
    oncancel={() => (confirmRemove = null)}
  >
    <p class="feeds-page__confirm">
      {$_('tfeeds_page_remove_confirm_1', { name: confirmRemove.record.name })}<br />
      {$_('tfeeds_page_remove_confirm_2')}
    </p>
  </ConfirmModal>
{/if}

<style lang="postcss">
  .feeds-page {
    padding: 20px 24px 32px;

    @media (max-width: 767px) {
      padding: 12px 16px 24px;
    }

    &__intro {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px 16px;
      flex-wrap: wrap;
      margin-bottom: 20px;
    }

    &__lead {
      flex: 1 1 280px;
      min-width: 0;
      color: var(--text-color-2);
      font-size: 14px;
      line-height: 1.6;
    }

    &__status {
      padding: 40px 0;
      color: var(--text-color-3);
      font-size: 14px;
      line-height: 1.7;
      text-align: center;
    }

    &__list {
      list-style: none;
      border-top: 1px solid var(--border-color-2);
    }

    &__note {
      margin-top: 16px;
      color: var(--text-color-3);
      font-size: 12px;
      line-height: 1.6;

      a {
        color: var(--link-color);
      }
    }

    &__confirm {
      margin-bottom: 16px;
    }

    &--builder {
      padding-bottom: 24px;

      @media (min-width: 1100px) {
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        height: 100%;
        padding-bottom: 0;
        overflow: hidden;
      }
    }
  }

  .feeds-head {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 36px;
    margin-bottom: 12px;

    &__title {
      min-width: 0;
      font-size: 20px;
      letter-spacing: .025em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    & > :global(.feeds-icon-button:first-child) {
      margin-left: -8px;
    }

    &__beta {
      flex: none;
      display: inline-flex;
      align-items: center;
      height: 20px;
      padding: 0 8px;
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-round, 10px);
      color: var(--text-color-2);
      font-size: 11px;
      font-weight: bold;
      letter-spacing: .04em;
    }

    & > :global(.feeds-icon-button:last-child) {
      margin-left: auto;
      margin-right: -8px;
    }
  }

  :global(.feeds-icon-button) {
    flex: none;
    display: grid;
    place-content: center;
    width: 36px;
    height: 36px;
    border-radius: var(--radius-control, 6px);
    color: var(--text-color-2);

    @media (hover: hover) {
      &:hover {
        background-color: var(--state-hover, var(--bg-color-2));
        color: var(--text-color-1);
      }
    }

    @media (max-width: 767px) {
      width: 40px;
      height: 40px;
    }
  }

  .my-feed {
    display: flex;
    align-items: center;
    gap: 8px 12px;
    padding: 6px 0;
    border-bottom: 1px solid var(--border-color-2);

    @media (max-width: 640px) {
      flex-wrap: wrap;
    }

    &__main {
      flex: 1 1 auto;
      min-width: 0;
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px;
      margin-left: -8px;
      border-radius: var(--radius-control, 6px);
      color: var(--text-color-1);
      text-align: left;

      @media (hover: hover) {
        &:hover {
          background-color: var(--state-hover, var(--bg-color-2));
        }
      }

      @media (max-width: 640px) {
        flex-basis: 100%;
      }
    }

    &__avatar {
      flex: none;
      width: 40px;
      height: 40px;
      object-fit: cover;
      border-radius: var(--feed-avatar-border-radius, 10px);
      background-color: var(--bg-color-2);
    }

    &__text {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    &__name {
      font-size: 15px;
      font-weight: bold;
      letter-spacing: .025em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    &__meta {
      display: flex;
      flex-wrap: wrap;
      gap: 0 8px;
      font-size: 12px;
      color: var(--text-color-3);

      & > span:not(:last-child)::after {
        content: '·';
        margin-left: 8px;
      }
    }

    &__state--live {
      color: var(--primary-color);
      font-weight: bold;
    }

    &__actions {
      flex: none;
      display: flex;
      align-items: center;
      gap: 4px;

      @media (max-width: 640px) {
        margin-left: auto;
      }
    }

    &__publish {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      margin-right: 4px;
      padding: 0 14px;
      border: 1px solid var(--border-color-1);
      border-radius: var(--radius-round, 16px);
      color: var(--text-color-1);
      font-size: 13px;
      white-space: nowrap;

      @media (hover: hover) {
        &:hover:not(:disabled) {
          background-color: var(--state-hover, var(--bg-color-2));
        }
      }

      &--primary {
        border-color: var(--primary-color);
        color: var(--primary-color);
        font-weight: bold;
      }

      &:disabled {
        opacity: .5;
      }
    }
  }
</style>
