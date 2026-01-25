<script lang="ts">
  import { tick } from 'svelte';
  import {settings} from '$lib/stores';
  import VirtualThreadItem from "$lib/components/thread/VirtualThreadItem.svelte";
  import VirtualList from "$lib/components/virtual/VirtualList.svelte";
  import {_} from "svelte-i18n";

  let { column, _agent, rootIndex, onchangeprofile, isJunk } = $props();
  let parent = $state<HTMLElement | undefined>();
  let virtualList: ReturnType<typeof VirtualList> | undefined = $state();
  let hasScrolledToRoot = false;
  let isSingleColumnMode = $derived($settings.design?.layout !== 'decks');
  let topMargin = $derived.by(() => {
    if (isJunk) {
      return isSingleColumnMode ? 108 : 121;
    }
    return isSingleColumnMode ? 52 : 121;
  });

  onchangeprofile(_agent.did(), _agent.handle());

  if ($settings.design?.threaded === undefined) {
    $settings.design.threaded = false;
  }

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

  function getKey(data: any, index: number): string {
    return `thread-${index}-${data?.post?.uri || ''}`;
  }

  let isWindowScroll = $derived(
    scrollContainer === document.documentElement ||
    scrollContainer === document.body
  );

  function getScrollTop(): number {
    if (isWindowScroll) return window.scrollY;
    return scrollContainer?.scrollTop ?? 0;
  }

  function setScrollTop(value: number): void {
    if (isWindowScroll) {
      window.scrollTo(0, value);
    } else if (scrollContainer) {
      scrollContainer.scrollTop = value;
    }
  }

  $effect(() => {
    if (!virtualList || !scrollContainer || column.data.feed.length === 0 || hasScrolledToRoot) return;

    let targetIdx = rootIndex;
    if (targetIdx === undefined || targetIdx === null) {
      targetIdx = column.data.feed.findIndex((_feed: any) => _feed.depth === 0);
    }

    if (targetIdx <= 0) return;

    hasScrolledToRoot = true;

    const initialPosition = virtualList.getPositionForIndex(targetIdx);
    if (isJunk) {
      setScrollTop(Math.max(0, initialPosition));
    } else {
      setScrollTop(Math.max(0, initialPosition - topMargin));
    }

    const maxAttempts = 8;

    async function performScrollAdjustment() {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        if (!virtualList || !scrollContainer) break;

        virtualList.prepareForIndex(targetIdx);
        await tick();
        await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));

        const element = virtualList?.getItemElement(targetIdx);
        if (!element) continue;

        const elementRect = element.getBoundingClientRect();
        let targetTop: number;

        if (isWindowScroll) {
          targetTop = elementRect.top - topMargin;
        } else {
          const containerRect = scrollContainer.getBoundingClientRect();
          targetTop = elementRect.top - containerRect.top - topMargin;
        }

        if (Math.abs(targetTop) <= 3) break;

        setScrollTop(getScrollTop() + targetTop);
      }
    }

    performScrollAdjustment();
  });
</script>

<div
  class="timeline timeline--inline-p0"
  class:end-filler={column.data.feed.length > 1}
  bind:this={parent}
>
  <VirtualList
    items={column.data.feed}
    {getKey}
    {scrollContainer}
    {topMargin}
    buffer={10}
    estimatedItemHeight={180}
    maintainScrollPosition={false}
    bind:this={virtualList}
  >
    {#snippet children(item, index)}
      {#if (!item.blocked && !item.notFound)}
        <div
            data-depth={item?.depth}
            class="thread-item"
            class:thread-item--compact={$settings?.design.postsLayout === 'compact'}
            class:thread-item--minimum={$settings?.design.postsLayout === 'minimum'}
            class:thread-item--threaded={$settings?.design?.threaded}
            class:thread-item--bubble={$settings?.design?.bubbleTimeline}
            class:is-root={!column.data.feed[0]?.post?.record?.reply}
            class:is-final={item.post.replyCount === 0}
            class:has-child={item.post.replyCount > 0}
        >
          <VirtualThreadItem {column} {index} {_agent}></VirtualThreadItem>

          {#if (item?.depth > 1)}
            <span class="thread-round-border"></span>
          {/if}

          {#if $settings?.design?.threaded}
            {#each {length: item.depth}, i}
              <span class="thread-depth-bar thread-depth-bar--{i}"></span>
            {/each}
          {/if}

          {#if (item?.post?.replyCount > 0 && item?.depth === 6)}
            <a href={'/profile/' + item.post.author.handle + '/post/' + item.post.uri.split('/').slice(-1)[0]} class="thread-depth-more">{$_('read_more_thread')}</a>
          {/if}
        </div>
      {:else}
        <article class="timeline-hidden-item">
          <p class="timeline-hidde-item__text">{$_('deleted_post')}</p>
        </article>
      {/if}
    {/snippet}
  </VirtualList>
</div>

<style lang="postcss">
  .thread-item {
      position: relative;
      margin: 0 var(--timeline-padding);

      &[data-depth='0'] {
          position: relative;

          &::after {
              content: '';
              left: -16px;
              top: 0;
              bottom: 0;
              position: absolute;
              width: 4px;
              background-color: var(--primary-color);
          }
      }

      &--threaded {
          &[data-depth='1'] {

          }

          &[data-depth='2'] {
              margin-left: 48px;
          }

          &[data-depth='3'] {
              margin-left: 80px;
          }

          &[data-depth='4'] {
              margin-left: 112px;
          }

          &[data-depth='5'] {
              margin-left: 144px;
          }

          &[data-depth='6'] {
              margin-left: 176px;
          }

          .thread-round-border {
              position: absolute;
              width: 10px;
              height: 10px;
              border-bottom: 2px solid var(--border-color-1);
              border-left: 2px solid var(--border-color-1);
              border-radius: 0 0 0 10px;
              left: -10px;
              top: 24px;
              z-index: 0;
          }
      }

      &.is-final {
          .thread-depth-bar {
              &--0 {
                  display: none;
              }
          }
      }

      &--bubble {
          .thread-depth-bar,
          .thread-round-border {
              display: none;
          }
      }
  }

  .end-filler {
      &::after {
          content: '';
          display: block;
          height: calc(94vh - 120px - var(--root-client-height, 0px));
      }
  }

  .thread-depth-bar {
      &--0 {
          --bar-top: 10px;
      }

      &--1 {
          --bar-position: -10px;
      }

      &--2 {
          --bar-position: -42px;
      }

      &--3 {
          --bar-position: -74px;
      }

      &--4 {
          --bar-position: -106px;
      }

      &--5 {
          --bar-position: -138px;
      }

      position: absolute;
      left: var(--bar-position);
      top: var(--bar-top, 0);
      bottom: 0;
      background-color: var(--border-color-1);
      width: 2px;
      z-index: 0;
  }
</style>
