<script lang="ts">
  import { _ } from 'tokimeki-i18n';
  import LexiconView from './LexiconView.svelte';
  import { getRepoContext } from '$lib/explorer/explorerState.svelte';
  import { fetchCollectionStats } from '$lib/explorer/pds';
  import { lexiconPath } from '$lib/explorer/input';

  let { collection }: { collection: string } = $props();

  const repo = getRepoContext();
  const lexicon = $derived(repo.lexicon(collection));
  const stats = $derived(fetchCollectionStats(collection, repo.signal));
</script>

<div class="collection-info">
  <h2 class="collection-info__title">{collection}</h2>
  <a class="collection-info__link" href={lexiconPath(collection)}>{$_('explorer_open_lexicon')}</a>

  {#await stats then value}
    {#if value && (value.creates || value.dids_estimate)}
      <section class="collection-info__section">
        <h3 class="explorer-section-title">{$_('explorer_network_usage')}</h3>
        <dl class="collection-info__stats">
          <div><dt>{$_('explorer_stats_creates')}</dt><dd>{value.creates.toLocaleString()}</dd></div>
          <div><dt>{$_('explorer_stats_accounts')}</dt><dd>{value.dids_estimate.toLocaleString()}</dd></div>
        </dl>
      </section>
    {/if}
  {/await}

  <section class="collection-info__section">
    <h3 class="explorer-section-title">{$_('explorer_tab_schema')}</h3>
    <LexiconView nsid={collection} {lexicon} />
  </section>
</div>

<style lang="postcss">
  .collection-info {
      padding: 20px 20px 32px;

      &__title {
          font-family: var(--code-font);
          font-size: 17px;
          overflow-wrap: anywhere;
      }

      &__link {
          display: inline-block;
          margin-top: 4px;
          font-size: 12px;
          color: var(--link-color, var(--primary-color));
      }

      &__section {
          margin-top: 24px;
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
  }
</style>
