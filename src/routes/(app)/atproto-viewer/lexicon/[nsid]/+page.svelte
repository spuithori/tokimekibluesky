<script lang="ts">
  import { onDestroy } from 'svelte';
  import { _ } from 'tokimeki-i18n';
  import { page } from '$app/state';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import ExplorerBar from '$lib/components/explorer/ExplorerBar.svelte';
  import LexiconView from '$lib/components/explorer/LexiconView.svelte';
  import { resolveLexicon } from '$lib/explorer/lexicon';
  import { fetchCollectionStats, listReposByCollection } from '$lib/explorer/pds';
  import { explorerPath } from '$lib/explorer/values';

  const nsid = page.params.nsid ?? '';
  const controller = new AbortController();
  onDestroy(() => controller.abort());

  const lexicon = resolveLexicon(nsid, controller.signal);
  const stats = fetchCollectionStats(nsid, controller.signal);

  let repos = $state.raw<string[]>();
  let cursor = $state<string>();
  let loading = $state(false);

  async function loadRepos() {
    loading = true;
    try {
      const result = await listReposByCollection(nsid, cursor, controller.signal);
      repos = [...(repos ?? []), ...result.repos.map((repo) => repo.did)];
      cursor = result.cursor;
    } catch {
      repos ??= [];
      cursor = undefined;
    }
    loading = false;
  }

  void loadRepos();
</script>

<svelte:head>
  <title>{nsid} - {$_('viewer')} - TOKIMEKI</title>
</svelte:head>

<div class="explorer">
  <ExplorerBar crumbs={[{ label: $_('explorer_kind_lexicon') }, { label: nsid, mono: true }]} query={'lex:' + nsid} />

  <div class="explorer-page">
    <div class="explorer-pane__padded">
      <h2 class="explorer-pane__title lexicon-page__title">{nsid}</h2>

      {#await stats then value}
        {#if value && (value.creates || value.dids_estimate)}
          <section class="lexicon-page__section">
            <h3 class="explorer-section-title">{$_('explorer_network_usage')}</h3>
            <dl class="lexicon-page__stats">
              <div><dt>{$_('explorer_stats_creates')}</dt><dd>{value.creates.toLocaleString()}</dd></div>
              <div><dt>{$_('explorer_stats_accounts')}</dt><dd>{value.dids_estimate.toLocaleString()}</dd></div>
            </dl>
          </section>
        {/if}
      {/await}

      <section class="lexicon-page__section">
        <h3 class="explorer-section-title">{$_('explorer_tab_schema')}</h3>
        <LexiconView {nsid} {lexicon} />
      </section>

      {#if repos?.length}
        <section class="lexicon-page__section">
          <h3 class="explorer-section-title">{$_('explorer_lexicon_repos')}</h3>
          <ul class="lexicon-page__repos">
            {#each repos as did (did)}
              <li><a href={explorerPath({ repo: did, collection: nsid })}>{did}</a></li>
            {/each}
          </ul>
          {#if loading}
            <LoadingSpinner padding={12} size={18} />
          {:else if cursor}
            <button class="explorer-chip" onclick={loadRepos}>{$_('explorer_load_more')}</button>
          {/if}
        </section>
      {/if}
    </div>
  </div>
</div>

<style lang="postcss">
  .lexicon-page {
      &__title {
          font-family: var(--code-font);
          overflow-wrap: anywhere;
      }

      &__section {
          margin-bottom: 28px;
      }

      &__stats {
          display: flex;
          flex-wrap: wrap;
          gap: 12px 32px;

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

      &__repos {
          list-style: none;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 2px 16px;
          margin-bottom: 12px;

          a {
              display: block;
              padding: 5px 0;
              font-family: var(--code-font);
              font-size: 12px;
              color: var(--link-color, var(--primary-color));
              overflow: hidden;
              text-overflow: ellipsis;
              white-space: nowrap;
          }
      }
  }
</style>
