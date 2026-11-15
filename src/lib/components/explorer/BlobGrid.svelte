<script lang="ts">
  import { onDestroy } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { _ } from 'tokimeki-i18n';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import { getRepoContext } from '$lib/explorer/explorerState.svelte';
  import { listBlobs } from '$lib/explorer/pds';

  const repo = getRepoContext();
  const controller = new AbortController();
  onDestroy(() => controller.abort());

  let cids = $state.raw<string[]>([]);
  let cursor: string | undefined;
  let loading = $state(true);
  let done = $state(false);
  let failed = $state(false);
  const broken = new SvelteSet<string>();

  async function load() {
    if (!repo.pds) {
      loading = false;
      done = true;
      return;
    }
    loading = true;
    try {
      const page = await listBlobs(repo.pds, { did: repo.did, cursor, limit: 120 }, controller.signal);
      cids = [...cids, ...page.cids];
      cursor = page.cursor;
      done = !page.cursor || !page.cids.length;
    } catch {
      failed = !controller.signal.aborted;
    }
    loading = false;
  }

  void load();
</script>

<div class="blob-grid">
  <p class="blob-grid__count">{$_('explorer_count_loaded', { loaded: cids.length })}{done ? '' : '+'}</p>

  <ul class="blob-grid__list">
    {#each cids as cid (cid)}
      <li>
        <a class="blob-grid__item" href={repo.blobUrl(cid)} target="_blank" rel="noopener noreferrer" title={cid}>
          {#if broken.has(cid)}
            <span class="blob-grid__cid">{cid}</span>
          {:else}
            <img src="https://cdn.bsky.app/img/feed_thumbnail/plain/{repo.did}/{cid}@jpeg" alt="" loading="lazy" decoding="async" onerror={() => broken.add(cid)} />
          {/if}
        </a>
      </li>
    {/each}
  </ul>

  {#if loading}
    <LoadingSpinner padding={20} />
  {:else if failed}
    <p class="explorer-empty">{$_('explorer_error_load')}</p>
  {:else if !cids.length}
    <p class="explorer-empty">{$_('explorer_blobs_empty')}</p>
  {:else if !done}
    <button class="explorer-chip" onclick={load}>{$_('explorer_load_more')}</button>
  {/if}
</div>

<style lang="postcss">
  .blob-grid {
      &__count {
          font-size: 12px;
          color: var(--text-color-3);
          margin-bottom: 12px;
      }

      &__list {
          list-style: none;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(112px, 1fr));
          gap: 6px;
          margin-bottom: 16px;
      }

      &__item {
          display: block;
          aspect-ratio: 1;
          overflow: hidden;
          border-radius: var(--radius-media, 6px);
          background-color: var(--bg-color-3);
          content-visibility: auto;
          contain-intrinsic-size: 112px;

          img {
              width: 100%;
              height: 100%;
              object-fit: cover;
              display: block;
          }
      }

      &__cid {
          display: block;
          padding: 8px;
          font-family: var(--code-font);
          font-size: 10px;
          line-height: 1.5;
          color: var(--text-color-3);
          overflow-wrap: anywhere;
      }
  }
</style>
