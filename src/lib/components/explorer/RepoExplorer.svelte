<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import { _ } from 'tokimeki-i18n';
  import { goto } from '$app/navigation';
  import { agent, agentsByDid } from '$lib/stores';
  import RepoSidebar from './RepoSidebar.svelte';
  import RepoOverview from './RepoOverview.svelte';
  import RecordList from './RecordList.svelte';
  import RecordDetail from './RecordDetail.svelte';
  import RecordEditor from './RecordEditor.svelte';
  import CollectionInfo from './CollectionInfo.svelte';
  import BlobGrid from './BlobGrid.svelte';
  import Backlinks from './Backlinks.svelte';
  import LiveStream from './LiveStream.svelte';
  import RepoAnalysis from './RepoAnalysis.svelte';
  import { RecordListState, RepoContext, pdsSource, rkeyOf, setOwnAgent, setRepoContext, type RepoSource } from '$lib/explorer/explorerState.svelte';
  import type { Identity } from '$lib/explorer/identity';
  import type { RepoRecord } from '$lib/explorer/pds';

  let { identity, collection = undefined, rkey = undefined, view = undefined, mode = undefined, source = undefined, base = undefined }: {
    identity: Identity;
    collection?: string;
    rkey?: string;
    view?: string;
    mode?: 'new' | 'edit';
    source?: RepoSource;
    base?: string;
  } = $props();

  const repo = untrack(() => new RepoContext(identity, source ?? (identity.pds ? pdsSource(identity.pds, identity.did) : undefined), base, $agent?.xrpc));
  setRepoContext(repo);
  setOwnAgent(() => $agentsByDid.get(repo.did));
  onDestroy(() => repo.dispose());

  let profile = $state.raw<{ displayName?: string; avatar?: string; labels?: Array<{ src: string; val: string; cts?: string }> }>();
  let paneWidth = $state(1200);

  const list = $derived(collection && repo.source ? new RecordListState(repo.source, collection, repo.reverse) : undefined);
  const selected = $derived(rkey && list ? list.find(rkey) : undefined);
  const wide = $derived(paneWidth >= 720);
  const pane = $derived(collection ? (mode || rkey ? 'detail' : 'list') : view || mode ? 'main' : 'side');
  const section = $derived(view ?? (repo.source?.local ? 'analyze' : 'overview'));
  const titles: Record<string, string> = {
    overview: 'explorer_view_overview',
    blobs: 'explorer_view_blobs',
    backlinks: 'explorer_tab_backlinks',
    live: 'explorer_view_live',
    analyze: 'explorer_view_analyze',
  };

  if (!repo.source?.local) {
    $agent?.xrpc.get('app.bsky.actor.getProfile', { actor: repo.did }, { signal: repo.signal }).then((result) => {
      profile = result;
    }, () => {});
  }

  function measure(node: HTMLElement) {
    const observer = new ResizeObserver(([entry]) => {
      paneWidth = entry.contentRect.width;
    });
    observer.observe(node);
    return () => observer.disconnect();
  }

  function handleSaved(record: RepoRecord, target: string) {
    if (target === collection) list?.upsert(record);
    else if (!repo.collections.includes(target)) repo.collections = [...repo.collections, target].sort();
    goto(repo.path(target, rkeyOf(record.uri)), { replaceState: true, noScroll: true });
  }

  function handleDeleted(record: RepoRecord) {
    list?.remove([record.uri]);
    goto(repo.path(collection), { replaceState: true, noScroll: true });
  }
</script>

<div class="explorer-panes" data-pane={pane} data-split={collection ? 'records' : 'main'} {@attach measure}>
  <aside class="explorer-pane explorer-pane--side">
    <RepoSidebar {collection} {view} {profile} {wide} />
  </aside>

  {#if collection}
    <section class="explorer-pane explorer-pane--list">
      {#if list}
        {#key list}
          <RecordList {list} {rkey} oncreate={() => goto(repo.path(collection) + '?new=1', { noScroll: true })} />
        {/key}
      {/if}
    </section>

    <section class="explorer-pane explorer-pane--detail">
      {#if mode === 'new'}
        <div class="explorer-pane__padded explorer-pane__padded--fill">
          {#key collection}
            <RecordEditor {collection} onsaved={handleSaved} oncancel={() => history.back()} />
          {/key}
        </div>
      {:else if rkey}
        {#key collection + '/' + rkey + (mode ?? '')}
          {#if mode === 'edit' && selected}
            <div class="explorer-pane__padded explorer-pane__padded--fill">
              <RecordEditor {collection} record={selected} onsaved={handleSaved} oncancel={() => history.back()} />
            </div>
          {:else}
            <RecordDetail
              {collection}
              {rkey}
              initial={selected}
              onedit={(record) => { list?.upsert(record); goto(repo.path(collection, rkey) + '?edit=1', { noScroll: true }); }}
              ondeleted={handleDeleted}
            />
          {/if}
        {/key}
      {:else}
        <CollectionInfo {collection} />
      {/if}
    </section>
  {:else if mode === 'new'}
    <section class="explorer-pane explorer-pane--main">
      <div class="explorer-pane__padded explorer-pane__padded--fill">
        <RecordEditor onsaved={handleSaved} oncancel={() => history.back()} />
      </div>
    </section>
  {:else}
    <section class="explorer-pane explorer-pane--main">
      <div class="explorer-pane__padded">
        <h2 class="explorer-pane__title">{$_(titles[section] ?? titles.overview)}</h2>
        {#if section === 'blobs'}
          <BlobGrid />
        {:else if section === 'backlinks'}
          <Backlinks target={repo.did} />
        {:else if section === 'live'}
          <LiveStream dids={[repo.did]} showDid={false} />
        {:else if section === 'analyze'}
          <RepoAnalysis />
        {:else}
          <RepoOverview labels={profile?.labels} />
        {/if}
      </div>
    </section>
  {/if}
</div>
