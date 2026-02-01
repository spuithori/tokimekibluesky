<script lang="ts">
  import {onDestroy} from "svelte";
  import {_} from "svelte-i18n";
  import {settings} from '$lib/stores';
  import TimelineItem from "../../../routes/(app)/TimelineItem.svelte";
  import MoreDivider from "$lib/components/post/MoreDivider.svelte";
  import VirtualList from "$lib/components/virtual/VirtualList.svelte";
  import type {ScrollState} from "$lib/components/virtual/types";
  import {isReasonPin} from "@atproto/api/dist/client/types/app/bsky/feed/defs";
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
  import {Annoyed} from "lucide-svelte";

  let {
    column,
    _agent,
    isJunk = false,
    unique,
    handleLoadMore,
    handleDividerClick,
    handleDividerUp
  }: {
    column: any;
    _agent: any;
    isJunk?: boolean;
    unique: any;
    handleLoadMore: any;
    handleDividerClick: any;
    handleDividerUp: any;
  } = $props();

  let parent = $state<HTMLElement | undefined>();
  let virtualList: ReturnType<typeof VirtualList> | undefined = $state();

  let initialScrollState = $state<ScrollState | null>(
    column.data?.scrollState ?? null
  );
  if (column.data?.scrollState) {
    column.data.scrollState = null;
  }

  $effect(() => {
    const pending = column.data?._pendingScrollRestore;
    if (pending && !initialScrollState) {
      initialScrollState = pending;
      column.data._pendingScrollRestore = null;
    }
  });

  let isLoading = $state(false);
  let isComplete = $state(false);
  let retryCount = $state(0);
  let isRetryLimit = $derived(retryCount >= 5);
  let lastUnique = $state(unique);

  let isSingleColumnMode = $derived($settings.design?.layout !== 'decks');
  let topMargin = $derived((isSingleColumnMode || isJunk) ? 52 : 0);

  let scrollSaveTimer: ReturnType<typeof setTimeout> | null = null;

  function saveScrollStateThrottled() {
    if (scrollSaveTimer) return;
    scrollSaveTimer = setTimeout(() => {
      scrollSaveTimer = null;
      if (virtualList && column.data) {
        const state = virtualList.getScrollStateLightweight();
        if (state) {
          column.data.scrollState = state;
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
      if (column.data) {
        column.data.scrollState = null;
      }
      queueMicrotask(() => {
        if (column.data.feed.length === 0 && !isLoading && !isComplete) {
          triggerLoad();
        }
      });
    }
  });

  let scrollContainer = $derived.by(() => {
    if (!parent) return null;
    if (isJunk) {
      return parent.closest('.modal-page-content') as HTMLElement | null;
    }
    if (isSingleColumnMode) {
      return document.documentElement;
    }

    if (column.scrollElement) {
      return column.scrollElement;
    }

    return parent.closest('.deck-column-content') as HTMLElement | null;
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
    const distanceFromBottom = info.totalHeight - info.scrollTop - info.viewportHeight;

    let physicalDistance = distanceFromBottom;
    if (scrollContainer) {
      const sh = scrollContainer === document.documentElement
        ? document.documentElement.scrollHeight
        : scrollContainer.scrollHeight;
      const st = scrollContainer === document.documentElement
        ? window.scrollY
        : scrollContainer.scrollTop;
      const ch = scrollContainer === document.documentElement
        ? window.innerHeight
        : scrollContainer.clientHeight;
      physicalDistance = sh - st - ch;
    }
    const effectiveDistance = Math.min(distanceFromBottom, physicalDistance);

    if (effectiveDistance >= 500) {
      if (isRetryLimit) {
        retryCount = 0;
      }
      return;
    }
    if (isLoading || isComplete || isRetryLimit) return;
    triggerLoad();
  }

  $effect(() => {
    const feedLength = column.data.feed.length;
    if (feedLength === 0 && scrollContainer && !isLoading && !isComplete) {
      triggerLoad();
    }
  });

  onDestroy(() => {
    if (scrollSaveTimer) {
      clearTimeout(scrollSaveTimer);
      scrollSaveTimer = null;
    }

    if (virtualList && column.data && !column.data.scrollState) {
      const state = virtualList.getScrollStateLightweight();
      if (state) {
        column.data.scrollState = state;
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
    items={column.data.feed}
    {getKey}
    {scrollContainer}
    {topMargin}
    {initialScrollState}
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
