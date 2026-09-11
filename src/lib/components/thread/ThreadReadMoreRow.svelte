<script lang="ts">
  import {_} from 'tokimeki-i18n';
  import ThreadGuides from '$lib/components/thread/ThreadGuides.svelte';
  import type {ThreadReadMoreRow, ThreadReadMoreUpRow} from '$lib/components/thread/threadRows';

  let {
    row,
    loading = false,
    onreadmore,
    onopen,
    oncollapse,
  }: {
    row: ThreadReadMoreRow | ThreadReadMoreUpRow;
    loading?: boolean;
    onreadmore?: (row: ThreadReadMoreRow) => void;
    onopen: (post: any) => void;
    oncollapse?: (uri: string) => void;
  } = $props();

  const href = $derived('/profile/' + row.post.author.handle + '/post/' + row.post.uri.split('/').slice(-1)[0]);

  function handleClick(e: MouseEvent) {
    e.preventDefault();

    if (row.kind === 'readMore' && onreadmore) {
      onreadmore(row);
      return;
    }

    onopen(row.post);
  }
</script>

<div
  class="thread-row thread-row--control"
  class:thread-row--read-more={row.kind === 'readMore'}
  class:thread-row--read-more-up={row.kind === 'readMoreUp'}
  class:thread-row--nested={row.indent >= 1}
  data-row-key={row.key}
  style:--indent={row.indent}
>
  <ThreadGuides guide={row.guide} {oncollapse}></ThreadGuides>
  <a {href} class="thread-control thread-read-more" class:thread-control--loading={loading} onclick={handleClick}>
    {#if row.kind === 'readMore' && row.continuesThread}
      {$_('read_more_thread_continue', {index: row.nextIndex, count: row.total})}
    {:else if row.kind === 'readMore'}
      {$_('read_more_thread_count', {count: row.count})}
    {:else}
      {$_('read_more_thread_up')}
    {/if}
  </a>
</div>
