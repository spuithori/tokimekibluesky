<script lang="ts">
  import {agent} from '$lib/stores';
  import { createVirtualizer } from '@tanstack/svelte-virtual';
  import VirtualThreadItem from "$lib/components/thread/VirtualThreadItem.svelte";

  export let column;
  export let _agent = $agent;

  let virtualListEl: HTMLDivElement
  let virtualItemEls: HTMLDivElement[] = []
  export let rootIndex = column.data.feed.findIndex(_feed => _feed.depth === 0);

  $: virtualizer = createVirtualizer<HTMLDivElement, HTMLDivElement>({
      count: column.data.feed.length,
      getScrollElement: () => virtualListEl,
      estimateSize: () => 186,
      overscan: 5,
  })

  $: items = $virtualizer.getVirtualItems()

  $: {
      if (virtualItemEls.length)
          virtualItemEls.forEach((el) => $virtualizer.measureElement(el))
  }

  $: changeRootIndex(column);

  function changeRootIndex(column) {
      if (!$virtualizer.isScrolling) {
         setTimeout(() => {
             $virtualizer.scrollToIndex(rootIndex, {
                 align: 'start',
             });
         }, 0)
      }
  }
</script>

<div class="thread-timeline-scroller" bind:this={virtualListEl}>
  <div style="position: relative; height: {$virtualizer.getTotalSize()}px; width: 100%;">
    <div style="position: absolute; top: 0; left: 0; width: 100%; transform: translateY({items[0] ? items[0].start : 0}px);">
      {#each items as data, index (data.index)}
        <div
          bind:this={virtualItemEls[index]}
          data-index={data.index}
          data-depth={column.data.feed[data.index]?.depth}
          class="thread-item"
          class:is-root={!column.data.feed[0]?.post?.record?.reply}
          class:is-final={column.data.feed[data.index].post.replyCount === 0}
          class:has-child={column.data.feed[data.index].post.replyCount > 0}
        >
          <VirtualThreadItem {column} depth={column.data.feed[data.index]?.depth} index={data.index} {_agent}></VirtualThreadItem>
        </div>
      {/each}
    </div>
  </div>
</div>

<style lang="postcss">
  .thread-timeline-scroller {
      position: relative;
      height: 100%;
      width: 100%;
      overflow-y: scroll;
      contain: strict;
      padding: 0 16px calc(94vh - 120px - var(--root-client-height, 0px));
      overflow-anchor: none;
  }

  .thread-item {
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
  }
</style>