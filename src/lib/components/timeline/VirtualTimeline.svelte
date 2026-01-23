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
  import {useIntersectionObserver} from "runed";

  let {
    column,
    _agent,
    isJunk = false,
    unique,
    isTopScrolling = false,
    handleLoadMore,
    handleDividerClick,
    handleDividerUp
  }: {
    column: any;
    _agent: any;
    isJunk?: boolean;
    unique: any;
    isTopScrolling?: boolean;
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
  let intervalId: ReturnType<typeof setTimeout> | undefined;
  let lastUnique = $state(unique);
  let uniqueRafId: number | null = null;

  $effect(() => {
    if (unique !== lastUnique) {
      isComplete = false;
      retryCount = 0;
      isLoading = false;
      initialScrollState = null;
      clearTimeout(intervalId);

      if (uniqueRafId !== null) {
        cancelAnimationFrame(uniqueRafId);
      }

      lastUnique = unique;

      uniqueRafId = requestAnimationFrame(() => {
        uniqueRafId = null;
        if (loadingEl && !isLoading && !isComplete) {
          triggerLoad();
        }
      });
    }
  });

  let isSingleColumnMode = $derived($settings.design?.layout !== 'decks');
  let topMargin = $derived(isSingleColumnMode ? 52 : 0);

  let scrollContainer = $derived.by(() => {
    if (!parent) return null;
    if (isJunk) {
      return parent.closest('.modal-page-content') as HTMLElement | null;
    }
    if (isSingleColumnMode) {
      return document.documentElement;
    }
    return column.scrollElement ?? null;
  });

  let intersectionRoot = $derived.by(() => {
    if (!parent) return null;
    if (isJunk) {
      return parent.closest('.modal-page-content') as HTMLElement | null;
    }
    if (isSingleColumnMode) {
      return null;
    }
    return column.scrollElement ?? null;
  });

  useIntersectionObserver(
    () => loadingEl,
    (entries) => {
      const entry = entries[0];
      if (!entry) return;

      if (entry.isIntersecting && !isComplete && !isRetryLimit) {
        triggerLoad();
      } else {
        clearTimeout(intervalId);
      }
    },
    {
      root: () => intersectionRoot,
      threshold: 0.25,
    }
  );

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
    await handleLoadMore(loaded, complete);
    isLoading = false;

    if (!isComplete && !isRetryLimit && loadingEl) {
      clearTimeout(intervalId);
      intervalId = setTimeout(() => {
        triggerLoad();
      }, 500);
    }
  }

  function loaded() {
    retryCount = retryCount + 1;
  }

  function complete() {
    clearTimeout(intervalId);
    isComplete = true;
  }

  function handleResetLimit() {
    retryCount = 0;
    isLoading = false;
    triggerLoad();
  }

  $effect(() => {
    return () => {
      clearTimeout(intervalId);
      if (uniqueRafId !== null) {
        cancelAnimationFrame(uniqueRafId);
      }
    };
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
</script>

<div class="timeline timeline--default virtual-timeline" bind:this={parent}>
  <VirtualList
    items={column.data.feed}
    {getKey}
    {scrollContainer}
    {topMargin}
    {isTopScrolling}
    {initialScrollState}
    maintainScrollPosition={!column.settings?.refreshToTop}
    buffer={10}
    estimatedItemHeight={200}
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
