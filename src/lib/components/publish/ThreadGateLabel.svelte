<script lang="ts">
    import {_} from "svelte-i18n";
    import {threadGate} from "$lib/stores";
    import { MessageSquareWarning } from 'lucide-svelte';
</script>

{#if ($threadGate === 'nobody')}
  <p class="thread-gate-label"><MessageSquareWarning size="16"></MessageSquareWarning>{$_('thread_gate_nobody_label')}</p>
{/if}

{#if (Array.isArray($threadGate))}
  <p class="thread-gate-label"><MessageSquareWarning size="16"></MessageSquareWarning>{$_('thread_gate_custom_label')}</p>
{/if}

<style lang="postcss">
  .thread-gate-label {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      padding: 4px 8px;
      background-color: var(--bg-color-2);
      color: var(--primary-color);
      font-weight: bold;
      border-radius: var(--border-radius-3);
      cursor: default;
      margin-top: 8px;
  }
</style>