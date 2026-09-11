<script lang="ts">
  import { tick, onDestroy, untrack } from 'svelte';
  import { beforeNavigate } from '$app/navigation';
  import {settings} from '$lib/stores';
  import VirtualList from '$lib/components/virtual/VirtualList.svelte';
  import type { ScrollState } from '$lib/components/virtual/types';
  import { getScrollTopFor, setScrollTopFor, resolveScrollContainer } from '$lib/components/virtual/scroll-helpers';
  import ThreadRow from '$lib/components/thread/ThreadRow.svelte';
  import type {ThreadRow as ThreadRowModel, ThreadFoldRow, ThreadReadMoreRow} from '$lib/components/thread/threadRows';

  let {
    rows,
    anchorIndex,
    column,
    feed,
    _agent,
    isJunk = false,
    expanding,
    isOtherLoading = false,
    onfold,
    oncollapse,
    onreadmore,
    onopen,
    onshowother,
  }: {
    rows: ThreadRowModel[];
    anchorIndex: number;
    column: any;
    feed: any[];
    _agent: any;
    isJunk?: boolean;
    expanding?: { has(uri: string): boolean };
    isOtherLoading?: boolean;
    onfold: (row: ThreadFoldRow) => void;
    oncollapse: (uri: string) => void;
    onreadmore: (row: ThreadReadMoreRow) => void;
    onopen: (post: any) => void;
    onshowother: () => void;
  } = $props();

  const ownColumn = column;
  let parent = $state<HTMLElement | undefined>();
  let virtualList: ReturnType<typeof VirtualList> | undefined = $state();

  let initialScrollState = $state<ScrollState | null>(ownColumn.data?.scrollState ?? null);
  if (initialScrollState && (!initialScrollState.heights || initialScrollState.heights.length === 0) && ownColumn.data?._heightCache?.length > 0) {
    initialScrollState = { ...initialScrollState, heights: ownColumn.data._heightCache, heightsWidth: ownColumn.data._heightCacheWidth };
  }
  if (ownColumn.data?.scrollState) {
    ownColumn.data.scrollState = null;
  }

  let hasScrolledToAnchor = initialScrollState != null;

  function saveScrollState() {
    if (!virtualList || !ownColumn?.data) return;
    const state = virtualList.getScrollStateLightweight();
    if (state && state.visualY !== undefined) {
      ownColumn.data.scrollState = state;
    }
  }

  beforeNavigate(() => {
    saveScrollState();
  });

  onDestroy(() => {
    if (virtualList && ownColumn?.data && feed.length > 0) {
      const snapshot = virtualList.getHeightSnapshot();
      ownColumn.data._heightCache = snapshot.entries;
      ownColumn.data._heightCacheWidth = snapshot.width;
      if (!ownColumn.data.scrollState) {
        saveScrollState();
      }
    }
  });

  const isSingleColumnMode = $derived($settings.design?.layout !== 'decks');
  const topMargin = $derived.by(() => {
    if (isJunk) {
      return isSingleColumnMode ? 108 : 121;
    }
    return isSingleColumnMode ? 52 : 121;
  });

  const scrollContainer = $derived(
    resolveScrollContainer(parent, isSingleColumnMode, isJunk, ownColumn.scrollElement)
  );

  const isWindowScroll = $derived(
    scrollContainer === document.documentElement ||
    scrollContainer === document.body
  );

  function getKey(row: ThreadRowModel): string {
    return row.key;
  }

  function containerTop(): number {
    return isWindowScroll || !scrollContainer ? 0 : scrollContainer.getBoundingClientRect().top;
  }

  function firstVisibleRow(): { key: string; offset: number } | null {
    if (!parent || !scrollContainer) return null;
    const limit = containerTop() + topMargin - 1;
    for (const el of parent.querySelectorAll<HTMLElement>('.thread-row[data-row-key]')) {
      const top = el.getBoundingClientRect().top;
      if (top >= limit) {
        return { key: el.dataset.rowKey!, offset: top - containerTop() };
      }
    }
    return null;
  }

  async function settleRowAt(index: number, offset: number): Promise<void> {
    if (!virtualList || !scrollContainer) return;
    virtualList.scrollToIndex(index, { offset: topMargin - offset });
    await tick();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

    for (let attempt = 0; attempt < 8; attempt++) {
      if (!virtualList || !scrollContainer) return;
      virtualList.prepareForIndex(index);
      await tick();
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const element = virtualList.getItemElement(index);
      if (!element) continue;
      const residual = element.getBoundingClientRect().top - containerTop() - offset;
      if (Math.abs(residual) <= 1) return;
      setScrollTopFor(scrollContainer, isWindowScroll, getScrollTopFor(scrollContainer, isWindowScroll) + residual);
    }
  }

  let pendingAnchor: { key: string; offset: number } | null = null;
  let prevKeys: string[] = [];

  $effect.pre(() => {
    const keys = rows.map(row => row.key);
    untrack(() => {
      const changed = keys.length !== prevKeys.length || keys.some((key, i) => key !== prevKeys[i]);
      pendingAnchor = changed && hasScrolledToAnchor && virtualList && scrollContainer ? firstVisibleRow() : null;
      prevKeys = keys;
    });
  });

  $effect(() => {
    void rows;
    const anchor = pendingAnchor;
    pendingAnchor = null;
    untrack(() => {
      if (anchor) {
        restoreRow(anchor);
      }
      scheduleEndFiller();
    });
  });

  async function restoreRow(anchor: { key: string; offset: number }): Promise<void> {
    const index = rows.findIndex(row => row.key === anchor.key);
    if (index < 0 || !virtualList || !scrollContainer) return;
    await tick();
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    if (!virtualList || !scrollContainer) return;
    const element = virtualList.getItemElement(index);
    if (element) {
      const residual = element.getBoundingClientRect().top - containerTop() - anchor.offset;
      if (Math.abs(residual) > 1) {
        setScrollTopFor(scrollContainer, isWindowScroll, getScrollTopFor(scrollContainer, isWindowScroll) + residual);
      }
      return;
    }
    await settleRowAt(index, anchor.offset);
  }

  let endFiller = $state(0);
  let endFillerFrame = 0;

  function scheduleEndFiller() {
    if (endFillerFrame) return;
    endFillerFrame = requestAnimationFrame(() => {
      endFillerFrame = 0;
      updateEndFiller();
    });
  }

  function updateEndFiller() {
    if (!virtualList || !scrollContainer || rows.length === 0) return;
    const total = virtualList.getTreeDiagnostics().total;
    const anchorY = virtualList.getPositionForIndex(Math.max(0, anchorIndex));
    const viewport = isWindowScroll ? window.innerHeight : scrollContainer.clientHeight;
    endFiller = Math.max(0, Math.round(viewport - topMargin - (total - anchorY)));
  }

  $effect(() => {
    const targetIdx = anchorIndex;
    if (!virtualList || !scrollContainer || rows.length === 0 || hasScrolledToAnchor) return;
    if (targetIdx < 0) return;
    if (targetIdx === 0) {
      hasScrolledToAnchor = true;
      if (!initialScrollState && getScrollTopFor(scrollContainer, isWindowScroll) > 0) {
        virtualList.scrollToIndex(0);
      }
      scheduleEndFiller();
      return;
    }

    hasScrolledToAnchor = true;
    virtualList.scrollToIndex(targetIdx);

    const maxAttempts = 8;

    async function performScrollAdjustment() {
      await tick();
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (!virtualList || !scrollContainer) break;

        virtualList.prepareForIndex(targetIdx);
        await tick();
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

        const element = virtualList?.getItemElement(targetIdx);
        if (!element) continue;

        const elementRect = element.getBoundingClientRect();
        const targetTop = isWindowScroll
          ? elementRect.top - topMargin
          : elementRect.top - scrollContainer.getBoundingClientRect().top - topMargin;

        if (Math.abs(targetTop) <= 3) break;

        setScrollTopFor(scrollContainer, isWindowScroll, getScrollTopFor(scrollContainer, isWindowScroll) + targetTop);
      }

      scheduleEndFiller();
    }

    performScrollAdjustment();
  });
</script>

<div
  class="timeline timeline--inline-p0 thread-list"
  class:thread-list--tree={$settings.design?.threaded}
  class:thread-list--compact={$settings.design?.postsLayout === 'compact'}
  class:thread-list--minimum={$settings.design?.postsLayout === 'minimum'}
  class:thread-list--bubble={$settings.design?.bubbleTimeline}
  class:end-filler={rows.length > 1}
  style:--thread-end-filler="{endFiller}px"
  bind:this={parent}
>
  <VirtualList
    items={rows}
    {getKey}
    {scrollContainer}
    {topMargin}
    {initialScrollState}
    bufferPx={1000}
    bind:this={virtualList}
  >
    {#snippet children(row)}
      <ThreadRow
        {row}
        column={ownColumn}
        {feed}
        {_agent}
        {expanding}
        {isOtherLoading}
        {onfold}
        {oncollapse}
        {onreadmore}
        {onopen}
        {onshowother}
      ></ThreadRow>
    {/snippet}
  </VirtualList>
</div>

<style lang="postcss">
  .end-filler {
      &::after {
          content: '';
          display: block;
          height: var(--thread-end-filler, 0px);
      }
  }
</style>
