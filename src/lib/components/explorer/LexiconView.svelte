<script lang="ts">
  import { _ } from 'tokimeki-i18n';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import LexiconSchema from './LexiconSchema.svelte';
  import { explorerPath } from '$lib/explorer/values';
  import type { ResolvedLexicon } from '$lib/explorer/lexicon';

  let { nsid, lexicon }: { nsid: string; lexicon: Promise<ResolvedLexicon | undefined> } = $props();
</script>

{#await lexicon}
  <LoadingSpinner padding={24} />
{:then resolved}
  {#if resolved}
    <div class="lexicon-view">
      {#if resolved.doc.description}
        <p class="lexicon-view__description">{resolved.doc.description}</p>
      {/if}
      <p class="lexicon-view__source">
        {$_('explorer_schema_published_by')}
        <a href={explorerPath({ repo: resolved.authority, collection: 'com.atproto.lexicon.schema', rkey: nsid })}>{resolved.authority}</a>
      </p>
      {#each Object.entries(resolved.doc.defs) as [name, def] (name)}
        <section class="lexicon-view__def" id={name}>
          <h3 class="lexicon-view__name">{name === 'main' ? nsid : '#' + name}</h3>
          <LexiconSchema schema={def} base={nsid} />
        </section>
      {/each}
    </div>
  {:else}
    <p class="explorer-empty">{$_('explorer_schema_unpublished')}</p>
  {/if}
{/await}

<style lang="postcss">
  .lexicon-view {
      &__description {
          font-size: 14px;
          line-height: 1.7;
          margin-bottom: 8px;
      }

      &__source {
          font-size: 12px;
          color: var(--text-color-3);
          margin-bottom: 16px;

          a {
              font-family: var(--code-font);
              color: var(--link-color, var(--primary-color));
          }
      }

      &__def {
          padding: 14px 16px;
          margin-bottom: 12px;
          border: 1px solid var(--border-color-2);
          border-radius: var(--radius-card, 10px);
      }

      &__name {
          font-family: var(--code-font);
          font-size: 14px;
          margin-bottom: 4px;
          overflow-wrap: anywhere;
      }
  }
</style>
