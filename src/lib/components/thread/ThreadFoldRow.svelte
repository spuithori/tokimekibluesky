<script lang="ts">
  import {_} from 'tokimeki-i18n';
  import ChevronDown from '@lucide/svelte/icons/chevron-down';
  import ChevronUp from '@lucide/svelte/icons/chevron-up';
  import ThreadGuides from '$lib/components/thread/ThreadGuides.svelte';
  import type {ThreadFoldRow} from '$lib/components/thread/threadRows';

  let { row, onfold, oncollapse }: { row: ThreadFoldRow; onfold: (row: ThreadFoldRow) => void; oncollapse?: (uri: string) => void } = $props();
</script>

<div class="thread-row thread-row--control thread-row--fold" class:thread-row--nested={row.visualDepth >= 2} data-row-key={row.key} style:--indent={row.visualDepth > 1 ? row.visualDepth - 1 : 0}>
  <ThreadGuides guide={row.guide} elbow={row.visualDepth >= 2} tick={row.visualDepth < 2} {oncollapse}></ThreadGuides>
  <button class="thread-control thread-fold" data-mode={row.mode} onclick={() => {onfold(row)}}>
    {#if row.mode === 'open'}
      <ChevronUp size="16"></ChevronUp>
      {$_('thread_fold_hide')}
    {:else}
      <ChevronDown size="16"></ChevronDown>
      {$_('thread_fold_show', {count: row.count})}
    {/if}
  </button>
</div>
