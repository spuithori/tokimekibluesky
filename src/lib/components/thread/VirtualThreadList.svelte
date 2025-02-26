<script lang="ts">
  import {settings} from '$lib/stores';
  import VirtualThreadItem from "$lib/components/thread/VirtualThreadItem.svelte";
  import { WindowVirtualizer, Virtualizer } from "virtua/svelte";
  import {_} from "svelte-i18n";

  let { column, _agent, rootIndex } = $props();
  let parent = $state();
  let el: VList = $state();
  let Virtual = $settings?.design?.layout === 'decks' ? Virtualizer : WindowVirtualizer;
  let isFirst = $state(true);

  $effect(() => {
    if (el) {
      if (!rootIndex) {
        rootIndex = column.data.feed.findIndex(_feed => _feed.depth === 0);
      }

      const offset = el.getScrollOffset();

      if (!isFirst && !offset) {
        el.scrollToIndex(rootIndex, {
          align: 'start',
          offset: -102 + offset,
        });
      }

      isFirst = false;
    }
  });
</script>

<div class="timeline" class:end-filler={column.data.feed.length > 1} bind:this={parent}>
  {#if (parent)}
    <Virtualizer data={column.data.feed} scrollRef={parent.closest('.modal-page-content')} bind:this={el} startMargin={102}>
      {#snippet children(item, index)}
        {#if (!column.data.feed[index].blocked && !column.data.feed[index].notFound)}
          <div
              data-depth={column.data.feed[index]?.depth}
              class="thread-item"
              class:thread-item--compact={$settings?.design.postsLayout === 'compact'}
              class:thread-item--minimum={$settings?.design.postsLayout === 'minimum'}
              class:is-root={!column.data.feed[0]?.post?.record?.reply}
              class:is-final={column.data.feed[index].post.replyCount === 0}
              class:has-child={column.data.feed[index].post.replyCount > 0}
          >
            <VirtualThreadItem {column} {index} {_agent}></VirtualThreadItem>

            {#if (column.data.feed[index]?.depth > 1)}
              <span class="thread-round-border"></span>
            {/if}

            {#if (column.data.feed[index]?.post?.replyCount > 0 && column.data.feed[index]?.depth === 6)}
              <a href={'/profile/' + column.data.feed[index].post.author.handle + '/post/' + column.data.feed[index].post.uri.split('/').slice(-1)[0]} class="thread-depth-more">{$_('read_more_thread')}</a>
            {/if}
          </div>
        {:else}
          <article class="timeline-hidden-item">
            <p class="timeline-hidde-item__text">{$_('deleted_post')}</p>
          </article>
        {/if}
      {/snippet}
    </Virtualizer>
  {/if}
</div>

<style lang="postcss">
  .thread-item {
      position: relative;

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

      /* &[data-depth='1'] {
          margin-left: 0;
      }

      &[data-depth='2'] {
          margin-left: 32px;
      }

      &[data-depth='3'] {
          margin-left: 64px;
      }

      &[data-depth='4'] {
          margin-left: 96px;
      }

      &[data-depth='5'] {
          margin-left: 128px;
      }

      &[data-depth='6'] {
          margin-left: 160px;
      } */
  }

  /* .thread-round-border {
      position: absolute;
      width: 16px;
      height: 16px;
      border-bottom: 2px solid var(--border-color-1);
      border-left: 2px solid var(--border-color-1);
      border-radius: 0 0 0 10px;
      left: -10px;
      top: 10px;
      z-index: -1;
  } */
  
  .end-filler {
      &::after {
          content: '';
          display: block;
          height: calc(94vh - 120px - var(--root-client-height, 0px));
      }
  }
</style>