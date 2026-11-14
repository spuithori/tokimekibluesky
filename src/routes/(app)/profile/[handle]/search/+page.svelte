<script lang="ts">
  import { page } from '$app/state';
  import { _ } from 'tokimeki-i18n';
  import type { LayoutData } from '../$types';
  import SearchResults from './SearchResults.svelte';

  interface Props {
    data: LayoutData;
  }

  let { data }: Props = $props();

  const query = $derived((page.url.searchParams.get('q') ?? '').trim());
</script>

<svelte:head>
  <title>{data.params.handle} {$_('search')} - TOKIMEKI</title>
</svelte:head>

{#if query}
  {#key query}
    <SearchResults handle={data.params.handle} {query}></SearchResults>
  {/key}
{/if}
