<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { _ } from 'tokimeki-i18n';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import { fetchBacklinkSources, fetchBacklinks, type BacklinkRecord, type BacklinkSource } from '$lib/explorer/backlinks';
  import { explorerPath } from '$lib/explorer/values';
  import { tidToDate } from '$lib/explorer/tid';
  import { formatDate } from '$lib/dateFormat';
  import { getRepoContext } from '$lib/explorer/explorerState.svelte';
  import { settingsStore } from '$lib/settings/settings.svelte';

  let { target }: { target: string } = $props();

  const repo = getRepoContext();
  const resolver = $derived(settingsStore.explorer.visual ? repo.resolver : undefined);
  const controller = new AbortController();
  onDestroy(() => controller.abort());

  let sources = $state.raw<BacklinkSource[]>();
  let failed = $state(false);
  let opened = $state.raw<BacklinkSource>();
  let records = $state.raw<BacklinkRecord[]>([]);
  let cursor = $state<string>();
  let loading = $state(false);

  function start(subject: string) {
    fetchBacklinkSources(subject, controller.signal).then((result) => {
      sources = result;
    }, () => {
      failed = !controller.signal.aborted;
    });
  }

  async function loadMore() {
    const source = opened;
    if (!source || loading) return;
    loading = true;
    try {
      const page = await fetchBacklinks({ target, collection: source.collection, path: source.path, cursor }, controller.signal);
      if (opened !== source) return;
      records = [...records, ...page.records];
      cursor = page.cursor;
    } catch {
      cursor = undefined;
    } finally {
      if (opened === source) loading = false;
    }
  }

  function toggle(source: BacklinkSource) {
    const closing = opened === source;
    opened = closing ? undefined : source;
    records = [];
    cursor = undefined;
    loading = false;
    if (!closing) void loadMore();
  }

  start(untrack(() => target));
</script>

<div class="backlinks">
  {#if failed}
    <p class="explorer-empty">{$_('explorer_error_load')}</p>
  {:else if !sources}
    <LoadingSpinner padding={24} />
  {:else if !sources.length}
    <p class="explorer-empty">{$_('explorer_backlinks_empty')}</p>
  {:else}
    <ul class="backlinks__list">
      {#each sources as source (source.collection + source.path)}
        {@const isOpen = opened === source}
        <li class="backlinks__source">
          <button class="backlinks__head" aria-expanded={isOpen} onclick={() => toggle(source)}>
            <span class="backlinks__name">
              <span class="backlinks__collection">{source.collection}</span>
              <span class="backlinks__path">{source.path}</span>
            </span>
            <span class="backlinks__counts">{$_('explorer_backlinks_counts', { records: source.records.toLocaleString(), repos: source.distinctDids.toLocaleString() })}</span>
          </button>

          {#if isOpen}
            <ul class="backlinks__records">
              {#each records as record (record.did + record.collection + record.rkey)}
                {@const date = tidToDate(record.rkey)}
                {@const resolved = resolver?.get(record.did)}
                <li>
                  <a class="backlinks__record" href={explorerPath({ repo: record.did, collection: record.collection, rkey: record.rkey })} {@attach resolver ? () => resolver.request(record.did) : undefined}>
                    {#if resolved?.kind === 'actor'}
                      {#if resolved.avatar}
                        <img class="backlinks__avatar" src={resolved.avatar.replace('/img/avatar/plain/', '/img/avatar_thumbnail/plain/')} alt="" width="18" height="18" loading="lazy" decoding="async" />
                      {:else}
                        <span class="backlinks__avatar"></span>
                      {/if}
                      <span class="backlinks__name">{resolved.displayName || '@' + resolved.handle}</span>
                      {#if resolved.displayName}
                        <span class="backlinks__handle">@{resolved.handle}</span>
                      {/if}
                    {:else}
                      <span class="backlinks__did">{record.did}</span>
                    {/if}
                    <span class="backlinks__rkey">{record.rkey}</span>
                    {#if date}<time class="backlinks__time">{formatDate(date, 'yyyy/MM/dd HH:mm')}</time>{/if}
                  </a>
                </li>
              {/each}
            </ul>
            {#if loading}
              <LoadingSpinner padding={12} size={18} />
            {:else if cursor}
              <button class="explorer-chip backlinks__more" onclick={loadMore}>{$_('explorer_load_more')}</button>
            {/if}
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
  <p class="backlinks__credit">{$_('explorer_backlinks_credit')}</p>
</div>

<style lang="postcss">
  .backlinks {
      &__list,
      &__records {
          list-style: none;
      }

      &__source {
          border-bottom: 1px solid var(--border-color-2);
      }

      &__head {
          width: 100%;
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          justify-content: space-between;
          gap: 2px 12px;
          padding: 12px 4px;
          text-align: left;
          color: var(--text-color-1);

          @media (hover: hover) {
              &:hover {
                  background-color: var(--state-hover, var(--bg-color-2));
              }
          }
      }

      &__name {
          display: grid;
          gap: 2px;
          min-width: 0;
      }

      &__collection {
          font-family: var(--code-font);
          font-size: 13px;
          overflow-wrap: anywhere;
      }

      &__path {
          font-family: var(--code-font);
          font-size: 11px;
          color: var(--text-color-3);
      }

      &__counts {
          font-size: 12px;
          color: var(--text-color-3);
          white-space: nowrap;
      }

      &__records {
          padding-bottom: 8px;
      }

      &__record {
          display: flex;
          gap: 12px;
          align-items: baseline;
          padding: 6px 4px 6px 16px;
          font-family: var(--code-font);
          font-size: 12px;
          color: var(--text-color-1);
          border-radius: var(--border-radius-2);

          @media (hover: hover) {
              &:hover {
                  background-color: var(--state-hover, var(--bg-color-2));
              }
          }
      }

      &__did {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: var(--link-color, var(--primary-color));
      }

      &__avatar {
          flex: none;
          align-self: center;
          width: 18px;
          height: 18px;
          margin-right: -4px;
          border-radius: var(--avatar-border-radius, 50%);
          background-color: var(--bg-color-3);
          object-fit: cover;
      }

      &__name {
          flex: 0 1 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: var(--font-body);
          font-size: 13px;
          font-weight: 600;
      }

      &__handle {
          flex: 0 2 auto;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-family: var(--font-body);
          color: var(--text-color-3);
      }

      &__rkey {
          color: var(--text-color-3);
      }

      &__time {
          margin-left: auto;
          font-family: var(--ui-font);
          font-size: 11px;
          color: var(--text-color-3);
          white-space: nowrap;
      }

      &__more {
          margin: 0 0 12px 16px;
      }

      &__credit {
          margin-top: 16px;
          font-size: 11px;
          color: var(--text-color-3);
      }
  }
</style>
