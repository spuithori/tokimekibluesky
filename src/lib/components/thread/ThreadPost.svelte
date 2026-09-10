<script lang="ts">
  import {_} from 'tokimeki-i18n';
  import TimelineItem from '../../../routes/(app)/TimelineItem.svelte';
  import Likes from '$lib/components/thread/Likes.svelte';
  import Quotes from '$lib/components/thread/Quotes.svelte';
  import Reposts from '$lib/components/thread/Reposts.svelte';
  import ThreadGuides from '$lib/components/thread/ThreadGuides.svelte';
  import type {ThreadPostRow} from '$lib/components/thread/threadRows';

  let {
    row,
    column,
    feed,
    _agent,
    oncollapse,
  }: {
    row: ThreadPostRow;
    column: any;
    feed: any[];
    _agent: any;
    oncollapse?: (uri: string) => void;
  } = $props();

  let isMuteOpen = $state(false);
  let isHiddenOpen = $state(false);

  const isMuted = $derived(row.item.mutedByViewer || row.post.author?.viewer?.muted);
</script>

<div
  class="thread-row thread-row--post"
  class:thread-row--anchor={row.role === 'anchor'}
  class:thread-row--parent={row.role === 'parent'}
  class:thread-row--op={row.isOp}
  class:thread-row--nested={row.visualDepth >= 2}
  data-row-key={row.key}
  style:--indent={row.visualDepth > 1 ? row.visualDepth - 1 : 0}
>
  <ThreadGuides guide={row.guide} elbow={row.visualDepth >= 2} {oncollapse}></ThreadGuides>

  <TimelineItem
    data={row.item}
    {column}
    {_agent}
    {feed}
    isSingle={true}
    isThread={true}
    postNumber={row.number}
    badge={row.isRootAuthor ? $_('thread_op_badge') : undefined}
  >
    <div class="timeline-analytics-list">
      {#if (row.post.quoteCount ?? 0) > 0}
        <Quotes uri={row.post.uri} {_agent}>{row.post.quoteCount}</Quotes>
      {/if}

      {#if (row.post.repostCount ?? 0) > 0}
        <Reposts uri={row.post.uri} {_agent}></Reposts>
      {/if}

      {#if (row.post.likeCount ?? 0) > 0}
        <Likes uri={row.post.uri} {_agent}></Likes>
      {/if}
    </div>
  </TimelineItem>

  {#if row.canCollapse && oncollapse}
    <button
      class="thread-gutter"
      aria-label={$_('thread_collapse_replies')}
      title={$_('thread_collapse_replies')}
      onclick={() => {oncollapse(row.item.uri)}}
    ></button>
  {/if}

  {#if isMuted && !isMuteOpen}
    <div class="thread-notice">
      <p class="thread-notice__text">{$_('muted_user_thread')}</p>
      <button class="button button--sm" onclick={() => {isMuteOpen = true}}>{$_('show_button')}</button>
    </div>
  {:else if row.item.hiddenByThreadgate && !isHiddenOpen}
    <div class="thread-notice">
      <p class="thread-notice__text">{$_('hidden_reply_thread')}</p>
      <button class="button button--sm" onclick={() => {isHiddenOpen = true}}>{$_('show_button')}</button>
    </div>
  {/if}
</div>
