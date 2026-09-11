<script lang="ts">
  import {_} from 'tokimeki-i18n';
  import ThreadGuides from '$lib/components/thread/ThreadGuides.svelte';
  import type {ThreadTombstoneRow} from '$lib/components/thread/threadRows';

  let { row, oncollapse }: { row: ThreadTombstoneRow; oncollapse?: (uri: string) => void } = $props();

  const label = $derived(
    row.reason === 'blocked' ? $_('thread_blocked_post')
      : row.reason === 'noUnauthenticated' ? $_('no_unauthenticated_post')
      : $_('deleted_post'),
  );
</script>

<div class="thread-row thread-row--tombstone" class:thread-row--nested={row.indent >= 1} data-row-key={row.key} style:--indent={row.indent}>
  <ThreadGuides guide={row.guide} {oncollapse}></ThreadGuides>
  <article class="timeline-hidden-item thread-tombstone">
    <p class="timeline-hidde-item__text">{label}</p>
  </article>
</div>
