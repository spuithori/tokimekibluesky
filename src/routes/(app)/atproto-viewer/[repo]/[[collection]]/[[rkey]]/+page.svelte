<script lang="ts">
  import { _ } from 'tokimeki-i18n';
  import { page } from '$app/state';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import ExplorerBar from '$lib/components/explorer/ExplorerBar.svelte';
  import RepoExplorer from '$lib/components/explorer/RepoExplorer.svelte';
  import { ExplorerError, type Identity } from '$lib/explorer/identity';
  import { lexiconPath, pdsPath } from '$lib/explorer/input';
  import { explorerPath, isNsid, toAtUri } from '$lib/explorer/values';
  import type { PageData } from './$types';

  let { data }: { data: PageData } = $props();

  const repoParam = $derived(decodeURIComponent(page.params.repo ?? ''));
  const collection = $derived(page.params.collection || undefined);
  const rkey = $derived(page.params.rkey || undefined);
  const view = $derived(page.url.searchParams.get('view') ?? undefined);
  const mode = $derived(page.url.searchParams.has('new') ? 'new' : page.url.searchParams.has('edit') ? 'edit' : undefined);

  function crumbs(identity?: Identity) {
    const repo = identity?.did ?? repoParam;
    const list = [{ label: identity?.handle ? '@' + identity.handle : repoParam, href: explorerPath({ repo }), mono: !identity?.handle }];
    if (collection) list.push({ label: collection, href: explorerPath({ repo, collection }), mono: true });
    if (collection && rkey) list.push({ label: rkey, href: explorerPath({ repo, collection, rkey }), mono: true });
    return list;
  }

  function errorKey(error: unknown): string {
    const code = error instanceof ExplorerError ? error.code : 'network';
    return 'explorer_error_' + code.replace(/-/g, '_');
  }
</script>

<svelte:head>
  <title>{rkey ?? collection ?? repoParam} - {$_('viewer')} - TOKIMEKI</title>
</svelte:head>

<div class="explorer">
  {#await data.identity}
    <ExplorerBar crumbs={crumbs()} query={toAtUri({ repo: repoParam, collection, rkey })} />
    <LoadingSpinner padding={48} />
  {:then identity}
    <ExplorerBar crumbs={crumbs(identity)} query={toAtUri({ repo: identity.did, collection, rkey })} />
    {#key identity.did}
      <RepoExplorer {identity} {collection} {rkey} {view} {mode} />
    {/key}
  {:catch error}
    <ExplorerBar crumbs={crumbs()} query={repoParam} />
    <div class="explorer-message">
      <p class="explorer-message__title">{$_(errorKey(error))}</p>
      <p class="explorer-message__sub">{repoParam}</p>
      <div class="explorer-message__actions">
        {#if isNsid(repoParam)}
          <a class="explorer-chip" href={lexiconPath(repoParam)}>{$_('explorer_open_as_lexicon')}</a>
        {/if}
        {#if repoParam.includes('.') && !repoParam.startsWith('did:')}
          <a class="explorer-chip" href={pdsPath(repoParam)}>{$_('explorer_open_as_pds')}</a>
        {/if}
      </div>
    </div>
  {/await}
</div>
