<script lang="ts">
  import FileArchive from '@lucide/svelte/icons/file-archive';
  import { onDestroy } from 'svelte';
  import { _ } from 'tokimeki-i18n';
  import { page } from '$app/state';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import ExplorerBar from '$lib/components/explorer/ExplorerBar.svelte';
  import RepoExplorer from '$lib/components/explorer/RepoExplorer.svelte';
  import { CarRepo } from '$lib/explorer/carClient';
  import { carSource, type RepoSource } from '$lib/explorer/explorerState.svelte';
  import type { Identity } from '$lib/explorer/identity';

  let opened = $state.raw<{ identity: Identity; source: RepoSource; name: string }>();
  let phase = $state<'idle' | 'parsing' | 'failed'>('idle');
  let dragging = $state(false);
  let current: CarRepo | undefined;

  const collection = $derived(page.url.searchParams.get('c') ?? undefined);
  const rkey = $derived(page.url.searchParams.get('r') ?? undefined);
  const view = $derived(page.url.searchParams.get('view') ?? undefined);

  onDestroy(() => current?.close());

  async function open(file: File | undefined | null) {
    if (!file) return;
    phase = 'parsing';
    try {
      const car = await CarRepo.open(await file.arrayBuffer());
      current?.close();
      current = car;
      opened = { identity: { did: car.summary.did, doc: { id: car.summary.did } }, source: carSource(car), name: file.name };
      phase = 'idle';
    } catch {
      phase = 'failed';
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragging = false;
    void open(event.dataTransfer?.files[0]);
  }
</script>

<svelte:head>
  <title>{$_('explorer_car_open')} - {$_('viewer')} - TOKIMEKI</title>
</svelte:head>

<div class="explorer">
  <ExplorerBar crumbs={[{ label: 'CAR', href: '/atproto-viewer/car' }, ...(opened ? [{ label: opened.name, mono: true }] : [])]} />

  {#if opened}
    {#key opened}
      <RepoExplorer identity={opened.identity} source={opened.source} base="/atproto-viewer/car" {collection} {rkey} {view} />
    {/key}
  {:else}
    <div class="explorer-page">
      <label
        class="car-drop"
        class:car-drop--active={dragging}
        ondragover={(event) => { event.preventDefault(); dragging = true; }}
        ondragleave={() => { dragging = false; }}
        ondrop={handleDrop}
      >
        {#if phase === 'parsing'}
          <LoadingSpinner padding={0} />
        {:else}
          <FileArchive size="32" color="var(--text-color-3)" />
        {/if}
        <span class="car-drop__label">{$_(phase === 'failed' ? 'explorer_car_failed' : 'explorer_car_choose')}</span>
        <input type="file" accept=".car,application/vnd.ipld.car" onchange={(event) => open(event.currentTarget.files?.[0])} hidden />
      </label>
    </div>
  {/if}
</div>

<style lang="postcss">
  .car-drop {
      display: grid;
      place-content: center;
      justify-items: center;
      gap: 12px;
      margin: 24px;
      min-height: 280px;
      border: 2px dashed var(--border-color-1);
      border-radius: var(--radius-card, 12px);
      cursor: pointer;

      &--active {
          border-color: var(--primary-color);
          background-color: color-mix(in oklab, var(--primary-color) 6%, transparent);
      }

      &__label {
          font-size: 14px;
      }
  }
</style>
