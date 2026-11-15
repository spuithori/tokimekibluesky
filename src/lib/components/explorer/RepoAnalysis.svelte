<script lang="ts">
  import Download from '@lucide/svelte/icons/download';
  import { _ } from 'tokimeki-i18n';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import RecordRow from './RecordRow.svelte';
  import { getRepoContext, rkeyOf } from '$lib/explorer/explorerState.svelte';
  import { CarRepo, downloadRepo, type CarSearchResult } from '$lib/explorer/carClient';
  import { formatBytes, parseAtUri, xrpcUrlFor } from '$lib/explorer/values';
  import { goto } from '$app/navigation';

  const repo = getRepoContext();

  let phase = $state<'idle' | 'downloading' | 'parsing' | 'failed'>('idle');
  let received = $state(0);
  let query = $state('');
  let searching = $state(false);
  let result = $state.raw<CarSearchResult>();

  const summary = $derived(repo.car?.summary);
  const ranked = $derived(summary ? summary.collections.toSorted((a, b) => b.count - a.count) : []);
  const max = $derived(ranked[0]?.count ?? 1);

  async function analyze() {
    if (!repo.pds) return;
    phase = 'downloading';
    received = 0;
    try {
      const bytes = await downloadRepo(repo.pds, repo.did, (size) => { received = size; }, repo.signal);
      phase = 'parsing';
      const car = await CarRepo.open(bytes);
      repo.car = car;
      repo.counts = new Map(car.summary.collections.map((item) => [item.nsid, item.count]));
      phase = 'idle';
    } catch {
      phase = repo.signal.aborted ? 'idle' : 'failed';
    }
  }

  async function search(event: SubmitEvent) {
    event.preventDefault();
    const term = query.trim();
    if (!repo.car || !term) return;
    searching = true;
    try {
      result = await repo.car.search(term);
    } catch {
      result = undefined;
    }
    searching = false;
  }

  function open(event: MouseEvent, uri: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    const target = parseAtUri(uri);
    if (target) goto(repo.path(target.collection, target.rkey));
  }
</script>

<div class="analysis">
  {#if !summary}
    <p class="analysis__lead">{$_('explorer_analyze_lead')}</p>
    <div class="analysis__actions">
      <button class="button button--sm" onclick={analyze} disabled={phase === 'downloading' || phase === 'parsing' || !repo.pds}>{$_('explorer_analyze_start')}</button>
      {#if repo.pds}
        <a class="explorer-chip" href={xrpcUrlFor(repo.pds, 'com.atproto.sync.getRepo', repo.did)} download="{repo.did}.car"><Download size="14" />{$_('explorer_export_car')}</a>
      {/if}
    </div>
    {#if phase === 'downloading'}
      <p class="analysis__progress">{$_('explorer_analyze_downloading', { size: formatBytes(received) })}</p>
    {:else if phase === 'parsing'}
      <p class="analysis__progress">{$_('explorer_analyze_parsing')}</p>
    {:else if phase === 'failed'}
      <p class="analysis__progress analysis__progress--failed">{$_('explorer_error_load')}</p>
    {/if}
  {:else}
    <dl class="analysis__stats">
      <div><dt>{$_('explorer_analyze_records')}</dt><dd>{summary.total.toLocaleString()}</dd></div>
      <div><dt>{$_('explorer_analyze_collections')}</dt><dd>{summary.collections.length.toLocaleString()}</dd></div>
      <div><dt>{$_('explorer_info_size')}</dt><dd>{formatBytes(summary.bytes)}</dd></div>
      <div><dt>Rev</dt><dd class="analysis__mono">{summary.rev}</dd></div>
    </dl>

    <form class="analysis__search" onsubmit={search}>
      <input class="explorer-filter" type="search" bind:value={query} placeholder={$_('explorer_search_repo')} aria-label={$_('explorer_search_repo')} />
      <button class="button button--sm" disabled={searching || !query.trim()}>{$_('search')}</button>
    </form>

    {#if searching}
      <LoadingSpinner padding={20} />
    {:else if result}
      <p class="analysis__progress">
        {$_(result.truncated ? 'explorer_search_truncated' : 'explorer_search_count', { count: result.records.length.toLocaleString(), scanned: result.scanned.toLocaleString() })}
      </p>
      <div class="analysis__results">
        {#each result.records as record (record.uri)}
          {@const target = parseAtUri(record.uri)}
          <RecordRow {record} rkey={`${target?.collection}/${rkeyOf(record.uri)}`} href={repo.path(target?.collection, target?.rkey)} onopen={(event) => open(event, record.uri)} />
        {/each}
      </div>
    {:else}
      <h3 class="explorer-section-title">{$_('explorer_analyze_breakdown')}</h3>
      <ul class="analysis__bars">
        {#each ranked as item (item.nsid)}
          <li>
            <a class="analysis__bar" href={repo.path(item.nsid)} style:--ratio={item.count / max}>
              <span class="analysis__nsid">{item.nsid}</span>
              <span class="analysis__count">{item.count.toLocaleString()}</span>
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

<style lang="postcss">
  .analysis {
      &__lead {
          font-size: 13px;
          line-height: 1.7;
          margin-bottom: 14px;
      }

      &__actions {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 10px;
      }

      &__progress {
          margin: 12px 0;
          font-size: 12px;
          color: var(--text-color-3);

          &--failed {
              color: var(--danger-color);
          }
      }

      &__stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 12px;
          margin-bottom: 20px;

          dt {
              font-size: 11px;
              color: var(--text-color-3);
          }

          dd {
              font-size: 20px;
              font-weight: 600;
              font-variant-numeric: tabular-nums;
          }
      }

      &__mono {
          font-family: var(--code-font);
          font-size: 13px !important;
          line-height: 30px;
      }

      &__search {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
      }

      &__results {
          border-top: 1px solid var(--border-color-2);
          margin: 0 -20px;
      }

      &__bars {
          list-style: none;
          display: grid;
          gap: 2px;
      }

      &__bar {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 6px 8px;
          font-size: 12px;
          color: var(--text-color-1);
          border-radius: var(--border-radius-2);
          background: linear-gradient(to right, color-mix(in oklab, var(--primary-color) 16%, transparent) calc(var(--ratio) * 100%), transparent 0);

          @media (hover: hover) {
              &:hover {
                  background-color: var(--state-hover, var(--bg-color-2));
              }
          }
      }

      &__nsid {
          font-family: var(--code-font);
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
      }

      &__count {
          font-variant-numeric: tabular-nums;
          color: var(--text-color-3);
      }
  }
</style>
