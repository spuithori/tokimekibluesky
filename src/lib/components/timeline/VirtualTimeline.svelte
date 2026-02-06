<script lang="ts">
  import {onDestroy} from "svelte";
  import {_} from "svelte-i18n";
  import {settings} from '$lib/stores';
  import TimelineItem from "../../../routes/(app)/TimelineItem.svelte";
  import MoreDivider from "$lib/components/post/MoreDivider.svelte";
  import VirtualList from "$lib/components/virtual/VirtualList.svelte";
  import type {ScrollState} from "$lib/components/virtual/types";
  import {resolveScrollContainer} from "$lib/components/virtual/scroll-helpers";
  import {isReasonPin} from "@atproto/api/dist/client/types/app/bsky/feed/defs";
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
  import {Annoyed} from "lucide-svelte";
  import {getColumnState} from "$lib/classes/columnState.svelte";

  let {
    column,
    _agent,
    isJunk = false,
    unique,
    handleLoadMore,
    handleDividerClick,
    handleDividerUp,
    onScrollStateSave,
    onScrollStateClear,
  }: {
    column: any;
    _agent: any;
    isJunk?: boolean;
    unique: any;
    handleLoadMore: any;
    handleDividerClick: any;
    handleDividerUp: any;
    onScrollStateSave?: (state: ScrollState) => void;
    onScrollStateClear?: () => void;
  } = $props();

  const columnState = getColumnState(isJunk);
  let parent = $state<HTMLElement | undefined>();
  let virtualList: ReturnType<typeof VirtualList> | undefined = $state();

  let initialScrollState = $state<ScrollState | null>(
    column.data?.scrollState ?? column.data?._pendingScrollRestore ?? null
  );
  if (initialScrollState && (!initialScrollState.heights || initialScrollState.heights.length === 0) && column.data?._heightCache?.length > 0) {
    initialScrollState = { ...initialScrollState, heights: column.data._heightCache };
  }
  if (column.data?.scrollState || column.data?._pendingScrollRestore) onScrollStateClear?.();

  let isLoading = $state(false);
  let isComplete = $state(false);
  let retryCount = $state(0);
  let isRetryLimit = $derived(retryCount >= 5);
  let lastUnique = $state(unique);

  let isSingleColumnMode = $derived($settings.design?.layout !== 'decks');
  let topMargin = $derived((isSingleColumnMode || isJunk) ? 52 : 0);
  let refreshToTop = $derived(!!column.settings?.refreshToTop);

  let scrollSaveTimer: ReturnType<typeof setTimeout> | null = null;

  function saveScrollStateThrottled() {
    if (scrollSaveTimer) return;
    scrollSaveTimer = setTimeout(() => {
      scrollSaveTimer = null;
      if (virtualList) {
        const state = virtualList.getScrollStateLightweight();
        if (state) {
          onScrollStateSave?.(state);
        }
      }
    }, 300);
  }

  $effect(() => {
    if (unique !== lastUnique) {
      isComplete = false;
      retryCount = 0;
      isLoading = false;
      initialScrollState = null;
      lastUnique = unique;
      onScrollStateClear?.();
      queueMicrotask(() => {
        if (columnState.getFeed(column.id).length === 0 && !isLoading && !isComplete) {
          triggerLoad();
        }
      });
    }
  });

  let scrollContainer = $derived.by(() => {
    return resolveScrollContainer(parent, isSingleColumnMode, isJunk, column.scrollElement)
      ?? parent?.closest('.deck-column-content') as HTMLElement | null;
  });

  function getKey(data: any, index: number): string {
    const uri = data?.post?.uri || `index-${index}`;
    const reasonIndexedAt = data?.reason?.indexedAt || '';
    return `${uri}|${reasonIndexedAt}`;
  }

  async function triggerLoad() {
    if (isLoading || isComplete || isRetryLimit) {
      return;
    }

    isLoading = true;

    try {
      await handleLoadMore(loaded, complete);
    } catch (e) {
      console.error('Load error:', e);
    } finally {
      isLoading = false;
    }
  }

  function loaded() {
    retryCount = retryCount + 1;
  }

  function complete() {
    isComplete = true;
  }

  function handleResetLimit() {
    retryCount = 0;
    isLoading = false;
  }

  function handleVirtualScroll() {
    saveScrollStateThrottled();
    checkLoadMore();
  }

  function checkLoadMore() {
    if (!virtualList) return;
    const info = virtualList.getScrollInfo();

    if (info.distanceFromBottom >= 500) {
      if (isRetryLimit) {
        retryCount = 0;
      }
      return;
    }
    if (isLoading || isComplete || isRetryLimit) return;
    triggerLoad();
  }

  $effect(() => {
    const feedLength = columnState.getFeed(column.id).length;
    if (feedLength === 0 && scrollContainer && !isLoading && !isComplete) {
      triggerLoad();
    }
  });

  onDestroy(() => {
    if (scrollSaveTimer) {
      clearTimeout(scrollSaveTimer);
      scrollSaveTimer = null;
    }

    if (virtualList) {
      if (column.data) {
        column.data._heightCache = virtualList.getHeightEntries();
      }

      if (!column.data?.scrollState) {
        const state = virtualList.getScrollStateLightweight();
        if (state) {
          onScrollStateSave?.(state);
        }
      }
    }
  });

  export function getScrollState(): ScrollState | null {
    return virtualList?.getScrollState() ?? null;
  }

  export function restoreScrollState(state: ScrollState): void {
    virtualList?.restoreScrollState(state);
  }

  export function scrollToIndex(index: number, options?: { align?: 'start' | 'center' | 'end'; offset?: number }): void {
    virtualList?.scrollToIndex(index, options);
  }
</script>

<div class="timeline timeline--default virtual-timeline" bind:this={parent}>
  <VirtualList
    items={columnState.getFeed(column.id)}
    {getKey}
    {scrollContainer}
    {topMargin}
    {initialScrollState}
    {refreshToTop}
    buffer={10}
    onScroll={handleVirtualScroll}
    onRangeChange={checkLoadMore}
    bind:this={virtualList}
  >
    {#snippet children(item, index)}
      {#if item?.post?.author?.did}
        <svelte:boundary>
          <TimelineItem
            data={item}
            {index}
            {column}
            {_agent}
            feed={columnState.getFeed(column.id)}
            isReplyExpanded={column.algorithm.type === 'author' && !item.isRootHide}
            isPinned={isReasonPin(item?.reason)}
          ></TimelineItem>

          {#snippet failed(error, reset)}
            <p style="padding: 16px;">post load error!!</p>
          {/snippet}
        </svelte:boundary>
      {/if}

      {#if item?.isDivider}
        <MoreDivider
          onDividerClick={(pos) => {handleDividerClick(index, item.memoryCursor, pos)}}
          onDividerUp={(dividerEl) => {handleDividerUp(index, item.memoryCursor, dividerEl)}}
        ></MoreDivider>
      {/if}
    {/snippet}
  </VirtualList>

  <div class="infinite-loading">
    {#if isLoading}
      <LoadingSpinner padding={0}></LoadingSpinner>
    {/if}

    {#if isComplete}
      <p class="infinite-nomore"><span>{$_('no_more')}</span></p>
    {/if}

    {#if isRetryLimit}
      <button onclick={handleResetLimit}>
        <Annoyed color="var(--danger-color)"></Annoyed>
      </button>
    {/if}
  </div>
</div>

<style lang="postcss">
  .virtual-timeline {
    min-height: 100%;
  }

  .infinite-loading {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 56px;
  }
</style>
