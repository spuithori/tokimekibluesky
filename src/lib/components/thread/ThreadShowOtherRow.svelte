<script lang="ts">
  import {_} from 'tokimeki-i18n';
  import EyeOff from '@lucide/svelte/icons/eye-off';
  import ThreadGuides from '$lib/components/thread/ThreadGuides.svelte';
  import type {ThreadShowOtherRow} from '$lib/components/thread/threadRows';

  let { row, loading = false, onshowother, oncollapse }: { row: ThreadShowOtherRow; loading?: boolean; onshowother: () => void; oncollapse?: (uri: string) => void } = $props();
</script>

<div class="thread-row thread-row--control thread-row--other" class:thread-row--nested={row.indent >= 1} data-row-key={row.key} style:--indent={row.indent}>
  <ThreadGuides guide={row.guide} {oncollapse}></ThreadGuides>
  <button class="thread-control thread-show-other" class:thread-control--loading={loading} disabled={loading} onclick={onshowother}>
    <span class="thread-show-other__icon">
      <EyeOff size="16" color="var(--text-color-3)"></EyeOff>
    </span>
    {$_('show_other_replies')}
  </button>
</div>
