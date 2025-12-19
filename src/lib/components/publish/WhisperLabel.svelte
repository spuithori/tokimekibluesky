<script lang="ts">
  import { _ } from 'svelte-i18n';
  import { CircleDashed } from 'lucide-svelte';
  import type { WhisperDuration } from '$lib/classes/postState.svelte';

  interface Props {
    duration: WhisperDuration;
  }

  let { duration }: Props = $props();

  const durationLabels: Record<string, string> = {
    '10m': '10m',
    '30m': '30m',
    '1h': '1h',
    '6h': '6h',
    '12h': '12h',
    '24h': '24h',
  };
</script>

<span class="whisper-label" class:whisper-label--active={duration}>
  <CircleDashed size="16"></CircleDashed>
  {#if duration}
    {$_('whisper_title')}: {durationLabels[duration]}
  {:else}
    {$_('whisper_title')}
  {/if}
</span>

<style lang="postcss">
  .whisper-label {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    padding: 4px 8px;
    background-color: var(--bg-color-2);
    color: var(--text-color-2);
    font-weight: bold;
    border-radius: var(--border-radius-2);
    height: 30px;

      &--active {
          border: 2px solid var(--danger-color);
          color: var(--danger-color);
      }
  }
</style>
