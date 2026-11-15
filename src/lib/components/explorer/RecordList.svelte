<script lang="ts">
  import ArrowDownUp from '@lucide/svelte/icons/arrow-down-up';
  import ListChecks from '@lucide/svelte/icons/list-checks';
  import Plus from '@lucide/svelte/icons/plus';
  import Trash2 from '@lucide/svelte/icons/trash-2';
  import X from '@lucide/svelte/icons/x';
  import { onDestroy } from 'svelte';
  import { SvelteSet } from 'svelte/reactivity';
  import { _ } from 'tokimeki-i18n';
  import { goto } from '$app/navigation';
  import { toast } from 'svelte-sonner';
  import LoadingSpinner from '$lib/components/ui/LoadingSpinner.svelte';
  import RecordRow from './RecordRow.svelte';
  import { getOwnAgent, getRepoContext, rkeyOf, type RecordListState } from '$lib/explorer/explorerState.svelte';

  const ROW = 56;
  const OVERSCAN = 8;

  let { list, rkey = undefined, oncreate = undefined }: {
    list: RecordListState;
    rkey?: string;
    oncreate?: () => void;
  } = $props();

  const repo = getRepoContext();
  const ownAgent = getOwnAgent();

  let filter = $state('');
  let scrollTop = $state(0);
  let viewport = $state(600);
  let selecting = $state(false);
  const picked = new SvelteSet<string>();
  let deleting = $state(false);
  let confirming = $state(false);
  let anchor = -1;

  const needle = $derived(filter.trim().toLowerCase());
  const visible = $derived(
    needle
      ? list.records.filter((record) => record.uri.toLowerCase().includes(needle) || JSON.stringify(record.value).toLowerCase().includes(needle))
      : list.records,
  );
  const start = $derived(Math.max(0, Math.floor(scrollTop / ROW) - OVERSCAN));
  const end = $derived(Math.min(visible.length, Math.ceil((scrollTop + viewport) / ROW) + OVERSCAN));
  const slice = $derived(visible.slice(start, end));
  const total = $derived(repo.counts?.get(list.collection));
  const canWrite = $derived(!!ownAgent() && !repo.source?.local);

  onDestroy(() => list.dispose());

  function handleScroll(event: Event) {
    const el = event.currentTarget as HTMLElement;
    scrollTop = el.scrollTop;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < ROW * 12) list.loadMore();
  }

  function measure(node: HTMLElement) {
    const observer = new ResizeObserver(([entry]) => {
      viewport = entry.contentRect.height;
    });
    observer.observe(node);
    return () => observer.disconnect();
  }

  function open(event: MouseEvent, target: string) {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
    event.preventDefault();
    goto(repo.path(list.collection, target), { replaceState: !!rkey, noScroll: true, keepFocus: true });
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.target instanceof HTMLInputElement || selecting) return;
    const delta = event.key === 'ArrowDown' || event.key === 'j' ? 1 : event.key === 'ArrowUp' || event.key === 'k' ? -1 : 0;
    if (!delta || !visible.length) return;
    event.preventDefault();
    event.stopPropagation();
    const current = rkey ? visible.findIndex((record) => rkeyOf(record.uri) === rkey) : -1;
    const next = Math.min(visible.length - 1, Math.max(0, current + delta));
    if (next === current) return;
    const scroller = event.currentTarget as HTMLElement;
    const top = next * ROW;
    if (top < scroller.scrollTop) scroller.scrollTop = top;
    else if (top + ROW > scroller.scrollTop + scroller.clientHeight) scroller.scrollTop = top + ROW - scroller.clientHeight;
    goto(repo.path(list.collection, rkeyOf(visible[next].uri)), { replaceState: !!rkey, noScroll: true, keepFocus: true });
  }

  function toggle(event: MouseEvent, uri: string, index: number) {
    event.preventDefault();
    if (event.shiftKey && anchor >= 0) {
      const [from, to] = anchor < index ? [anchor, index] : [index, anchor];
      for (let i = from; i <= to; i++) picked.add(visible[i].uri);
    } else if (!picked.delete(uri)) {
      picked.add(uri);
    }
    anchor = index;
  }

  function stopSelecting() {
    selecting = false;
    confirming = false;
    picked.clear();
    anchor = -1;
  }

  async function deletePicked() {
    const agent = ownAgent();
    const uris = [...picked];
    if (!agent || !uris.length) return;
    deleting = true;
    try {
      for (let i = 0; i < uris.length; i += 200) {
        const chunk = uris.slice(i, i + 200);
        await agent.xrpc.post('com.atproto.repo.applyWrites', {
          repo: repo.did,
          writes: chunk.map((uri) => ({ $type: 'com.atproto.repo.applyWrites#delete', collection: list.collection, rkey: rkeyOf(uri) })),
        });
        list.remove(chunk);
      }
      toast.success($_('explorer_deleted'));
      if (rkey && uris.some((uri) => rkeyOf(uri) === rkey)) goto(repo.path(list.collection), { replaceState: true, noScroll: true });
      stopSelecting();
    } catch (e) {
      toast.error((e as Error)?.message || $_('explorer_error_write'));
      confirming = false;
    }
    deleting = false;
  }
</script>

<div class="record-list">
  <div class="record-list__head">
    {#if selecting && confirming}
      <span class="record-list__count record-list__count--danger">{$_('explorer_delete_confirm_many', { count: picked.size })}</span>
      <button class="explorer-chip" onclick={() => { confirming = false; }} disabled={deleting}>{$_('cancel')}</button>
      <button class="explorer-chip record-list__danger" onclick={deletePicked} disabled={deleting}>{$_('delete')}</button>
    {:else if selecting}
      <span class="record-list__count">{$_('explorer_selected_count', { count: picked.size })}</span>
      <button class="explorer-chip" onclick={() => { for (const record of visible) picked.add(record.uri); }}>{$_('explorer_select_all')}</button>
      <button class="explorer-icon-button explorer-icon-button--danger" onclick={() => { confirming = true; }} disabled={!picked.size} aria-label={$_('delete')}>
        <Trash2 size="18" />
      </button>
      <button class="explorer-icon-button" onclick={stopSelecting} aria-label={$_('close')}>
        <X size="18" />
      </button>
    {:else}
      <input class="explorer-filter" type="search" bind:value={filter} oninput={() => { scrollTop = 0; }} placeholder={$_('explorer_filter_records')} aria-label={$_('explorer_filter_records')} />
      <button class="explorer-icon-button" class:explorer-icon-button--on={repo.reverse} onclick={() => { repo.reverse = !repo.reverse; }} aria-label={$_('explorer_order_oldest')} aria-pressed={repo.reverse} title={$_('explorer_order_oldest')}>
        <ArrowDownUp size="18" />
      </button>
      {#if canWrite}
        <button class="explorer-icon-button" onclick={() => { selecting = true; }} aria-label={$_('explorer_select')} title={$_('explorer_select')}>
          <ListChecks size="18" />
        </button>
        <button class="explorer-icon-button" onclick={oncreate} aria-label={$_('explorer_new_record')} title={$_('explorer_new_record')}>
          <Plus size="18" />
        </button>
      {/if}
    {/if}
  </div>

  <div class="record-list__status">
    <span>
      {#if needle}
        {$_('explorer_count_filtered', { shown: visible.length, loaded: list.records.length })}
      {:else if total !== undefined}
        {$_('explorer_count_of_total', { loaded: list.records.length, total })}
      {:else}
        {$_('explorer_count_loaded', { loaded: list.records.length })}{list.done ? '' : '+'}
      {/if}
    </span>
    {#if !list.done}
      {#if list.loadingAll}
        <button class="record-list__link" onclick={() => list.stopLoadingAll()}>{$_('explorer_stop')}</button>
      {:else}
        <button class="record-list__link" onclick={() => list.loadAll()}>{$_('explorer_load_all')}</button>
      {/if}
    {/if}
  </div>

  <div class="record-list__scroll" tabindex="0" role="listbox" aria-label={list.collection} onscroll={handleScroll} onkeydown={handleKeydown} {@attach measure}>
    <div class="record-list__spacer" style:height="{visible.length * ROW}px">
      <div class="record-list__window" style:transform="translateY({start * ROW}px)">
        {#each slice as record, index (record.uri)}
          {@const key = rkeyOf(record.uri)}
          <RecordRow
            {record}
            rkey={key}
            href={repo.path(list.collection, key)}
            selected={key === rkey}
            checked={selecting ? picked.has(record.uri) : undefined}
            onopen={(event) => open(event, key)}
            oncheck={(event) => toggle(event, record.uri, start + index)}
          />
        {/each}
      </div>
    </div>

    {#if list.loading}
      <LoadingSpinner padding={20} />
    {:else if list.failed}
      <p class="explorer-empty">{$_('explorer_error_load')} <button class="record-list__link" onclick={() => list.loadMore()}>{$_('explorer_retry')}</button></p>
    {:else if !visible.length}
      <p class="explorer-empty">{$_(needle ? 'explorer_no_match' : 'explorer_no_records')}</p>
    {/if}
  </div>
</div>

<style lang="postcss">
  .record-list {
      display: grid;
      grid-template-rows: auto auto minmax(0, 1fr);
      height: 100%;
      min-height: 0;

      &__head {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 10px 10px 6px 14px;
          min-height: 52px;
      }

      &__count {
          flex: 1;
          font-size: 13px;
          font-weight: 600;
          line-height: 1.4;

          &--danger {
              font-size: 12px;
          }
      }

      &__danger {
          border-color: var(--danger-color);
          color: var(--danger-color);
      }

      &__status {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 0 14px 8px;
          font-size: 11px;
          color: var(--text-color-3);
          border-bottom: 1px solid var(--border-color-2);
      }

      &__link {
          color: var(--link-color, var(--primary-color));
          font-size: 11px;
      }

      &__scroll {
          overflow-y: auto;
          overscroll-behavior: contain;
          min-height: 0;
          outline-offset: -2px;
      }

      &__spacer {
          position: relative;
          overflow: hidden;
      }

      &__window {
      }
  }
</style>
