<script lang="ts">
  import TimelineItem from "../../../../TimelineItem.svelte";
  import {_} from "svelte-i18n";
  import Likes from "$lib/components/thread/Likes.svelte";
  import { agent } from "$lib/stores";
  import Quotes from "$lib/components/thread/Quotes.svelte";

  export let _agent = $agent;
  export let feeds = [];
  export let depth = 0;
  export let column = undefined;
  export let rootClientHeight = 0;

  let item;
  let scrolled = false;
  let clientHeight;

  $: handleThreadUpdate(item);

  function handleThreadUpdate(item) {
      if (!item) {
          return false;
      }

      if (item && item.dataset.depth === '0') {
          rootClientHeight = clientHeight;
          item.scrollIntoView({block: 'start'});

          scrolled = true;
      }
  }
</script>

<div class="thread">
  {#each feeds as data, index (data)}
    {#if (!data.notFound)}
      {#if (data.parent)}
        <div class="thread-parent">
          <svelte:self feeds={[data.parent]} depth={depth - 1} column={column}></svelte:self>
        </div>
      {/if}

      {#if (!data.blocked)}
        <div
            class="thread-item"
            data-depth={depth}
            bind:this={item}
            class:is-root={!feeds[0]?.post?.record?.reply}
            class:is-final={data.post.replyCount === 0}
            class:has-child={data.post.replyCount > 0}
            class:is-author-child={data.post.record.reply?.root ? data.post.author.did === data.post.record.reply.root.uri.split('/')[2] : false}
            bind:clientHeight={clientHeight}
        >
          <TimelineItem data={data} isSingle={true} isThread={true} column={column} {_agent}>
            <div class="timeline-analytics-list">
              {#if (data?.post?.quoteCount > 0)}
                <Quotes uri={data.post.uri}>
                  {data.post.quoteCount}
                </Quotes>
              {/if}

              {#if (data.post.likeCount > 0)}
                <Likes uri={data.post.uri}></Likes>
              {/if}
            </div>
          </TimelineItem>

          {#if (data.post.replyCount > 0 && depth === 6)}
            <a href={'/profile/' + data.post.author.handle + '/post/' + data.post.uri.split('/').slice(-1)[0]} class="thread-depth-more">{$_('read_more_thread')}</a>
          {/if}
        </div>
      {:else}
        <article class="timeline-hidden-item">
          <p class="timeline-hidde-item__text">{$_('deleted_post')}</p>
        </article>
      {/if}

      {#if (data.replies?.length)}
        <div class="thread-replies">
          <button class="thread-replies-more" class:thread-replies-more--open={data.repliesOpen} on:click={() => {data.repliesOpen = true}}>{$_('show_replies')}</button>

          <svelte:self feeds={data.replies} depth={depth + 1} column={column}></svelte:self>
        </div>
      {/if}
    {:else}
      <article class="timeline-hidden-item">
        <p class="timeline-hidde-item__text">{$_('deleted_post')}</p>
      </article>
    {/if}
  {/each}
</div>

<style lang="postcss">
  .thread {
      position: relative;
  }

  .thread-item {
      scroll-margin-top: 120px;

      &[data-depth='0'] {
          margin-left: -16px;
          margin-right: -16px;
          padding-left: 16px;
          padding-right: 16px;
          box-shadow: inset 4px 0 var(--primary-color);
      }
  }

  .timeline-analytics-list {
      display: flex;
      flex-wrap: wrap;
      gap: 4px 12px;
  }
</style>
