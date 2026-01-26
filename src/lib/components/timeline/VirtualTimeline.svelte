<script lang="ts">
  import {onDestroy} from "svelte";
  import {_} from "svelte-i18n";
  import {beforeNavigate, afterNavigate} from '$app/navigation';
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
  let loadingEl = $state<HTMLElement | undefined>();
  let virtualList: ReturnType<typeof VirtualList> | undefined = $state();
  let initialScrollState = $state<ScrollState | null>(column.data?.scrollState ?? null);

  let isLoading = $state(false);
  let isComplete = $state(false);
  let retryCount = $state(0);
  let isRetryLimit = $derived(retryCount >= 5);
  let lastUnique = $state(unique);

  let isSingleColumnMode = $derived($settings.design?.layout !== 'decks');
  let topMargin = $derived(isSingleColumnMode ? 52 : 0);
  let isPaused = $state(false);


  function shouldPauseLoading(): boolean {
    return isPaused && isSingleColumnMode && !isJunk;
  }

  beforeNavigate(({ from, to }) => {
    if (!isSingleColumnMode || isJunk) return;
    if (from?.url.pathname === '/' && to?.url.pathname !== '/') {
      isPaused = true;
    }
  });

  afterNavigate(({ to }) => {
    if (!isSingleColumnMode || isJunk) return;
    if (to?.url.pathname === '/') {
      isPaused = false;
      if (isRetryLimit) {
        retryCount = 0;
      }
    }
  });

  $effect(() => {
    if (unique !== lastUnique) {
      isComplete = false;
      retryCount = 0;
      isLoading = false;
      initialScrollState = null;
      lastUnique = unique;
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
    if (isLoading || isComplete || isRetryLimit || shouldPauseLoading()) {
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

  function handleScroll() {
    if (isLoading || isComplete || isRetryLimit || shouldPauseLoading()) {
      return;
    }

    if (!loadingEl || !scrollContainer) return;

    const scrollTop = isSingleColumnMode
      ? window.scrollY
      : (scrollContainer as HTMLElement).scrollTop;
    const viewportHeight = isSingleColumnMode
      ? window.innerHeight
      : (scrollContainer as HTMLElement).clientHeight;
    const scrollHeight = isSingleColumnMode
      ? document.documentElement.scrollHeight
      : (scrollContainer as HTMLElement).scrollHeight;

    const distanceFromBottom = scrollHeight - scrollTop - viewportHeight;

    if (distanceFromBottom < 500) {
      triggerLoad();
    }
  }

  $effect(() => {
    if (!scrollContainer || shouldPauseLoading()) return;

    const target = isSingleColumnMode ? window : scrollContainer;
    target.addEventListener('scroll', handleScroll, { passive: true });

    handleScroll();

    return () => {
      target.removeEventListener('scroll', handleScroll);
    };
  });

  $effect(() => {
    const feedLength = column.data.feed.length;
    if (feedLength === 0 && scrollContainer && !isLoading && !isComplete && !shouldPauseLoading()) {
      triggerLoad();
    }
  });

  onDestroy(() => {
    if (virtualList && column.data) {
      const state = virtualList.getScrollState();
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

  <div class="infinite-loading" bind:this={loadingEl}>
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
