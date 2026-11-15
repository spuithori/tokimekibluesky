<script lang="ts">
  import { _ } from 'tokimeki-i18n';
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import ExplorerBar from '$lib/components/explorer/ExplorerBar.svelte';
  import LiveStream from '$lib/components/explorer/LiveStream.svelte';

  const split = (value: string | null) => (value ?? '').split(/[\s,]+/).filter(Boolean);

  const collections = $derived(split(page.url.searchParams.get('collections')));
  const dids = $derived(split(page.url.searchParams.get('dids')));

  let collectionsInput = $state(page.url.searchParams.get('collections') ?? '');
  let didsInput = $state(page.url.searchParams.get('dids') ?? '');

  function apply(event: SubmitEvent) {
    event.preventDefault();
    const query = new URLSearchParams();
    if (collectionsInput.trim()) query.set('collections', split(collectionsInput).join(','));
    if (didsInput.trim()) query.set('dids', split(didsInput).join(','));
    const qs = query.toString();
    goto('/atproto-viewer/stream' + (qs ? '?' + qs : ''), { replaceState: true, keepFocus: true });
  }
</script>

<svelte:head>
  <title>{$_('explorer_view_live')} - {$_('viewer')} - TOKIMEKI</title>
</svelte:head>

<div class="explorer">
  <ExplorerBar crumbs={[{ label: $_('explorer_view_live') }]} />

  <div class="explorer-page">
    <div class="explorer-pane__padded">
      <form class="stream-form" onsubmit={apply}>
        <label class="stream-form__field">
          <span>{$_('explorer_collections')}</span>
          <input class="explorer-filter" type="text" bind:value={collectionsInput} placeholder="app.bsky.feed.post, sh.tangled.*" autocapitalize="off" spellcheck="false" />
        </label>
        <label class="stream-form__field">
          <span>DID</span>
          <input class="explorer-filter" type="text" bind:value={didsInput} placeholder="did:plc:…" autocapitalize="off" spellcheck="false" />
        </label>
        <button class="button button--sm">{$_('explorer_live_apply')}</button>
      </form>

      {#key page.url.search}
        <LiveStream {collections} {dids} />
      {/key}
    </div>
  </div>
</div>

<style lang="postcss">
  .stream-form {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      gap: 10px;
      margin-bottom: 20px;

      &__field {
          flex: 1 1 220px;
          display: grid;
          gap: 4px;
          font-size: 11px;
          color: var(--text-color-3);
      }
  }
</style>
