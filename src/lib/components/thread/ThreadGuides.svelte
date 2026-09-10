<script lang="ts">
  import {_} from 'tokimeki-i18n';
  import type { ThreadGuide } from './threadRows';

  let {
    guide,
    elbow = false,
    tick = false,
    oncollapse,
  }: {
    guide: ThreadGuide;
    elbow?: boolean;
    tick?: boolean;
    oncollapse?: (uri: string) => void;
  } = $props();

  const parentLevel = $derived(guide.columns.length - 1);
</script>

{#each guide.columns as column, level (level)}
  {#if column !== 'none' || level === parentLevel}
    <button
      class="thread-guide-hit"
      data-level={level}
      style:--level={level}
      aria-label={$_('thread_collapse_branch')}
      title={$_('thread_collapse_branch')}
      onclick={() => {oncollapse?.(guide.owners[level])}}
    >
      {#if column === 'pass'}
        <span class="thread-guide thread-guide--column"></span>
      {/if}
    </button>
  {/if}
{/each}

{#if elbow && guide.columns.length}
  <span class="thread-guide thread-guide--elbow" data-level={parentLevel} style:--level={parentLevel}></span>
{/if}

{#if guide.top}
  <span class="thread-guide thread-guide--top"></span>
  {#if tick}
    <span class="thread-guide thread-guide--tick"></span>
  {/if}
{/if}

{#if guide.bottom}
  <span class="thread-guide thread-guide--bottom"></span>
{/if}
