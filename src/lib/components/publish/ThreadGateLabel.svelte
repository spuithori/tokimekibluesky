<script lang="ts">
    import { m } from "$lib/paraglide/messages.js";
    import { MessageSquareWarning } from 'lucide-svelte';

    let { post } = $props();
</script>

{#if (post.threadGate === 'everybody')}
  <p class="thread-gate-label"><MessageSquareWarning size="16"></MessageSquareWarning>{m.thread_gate_everybody_title()}</p>
{/if}

{#if (post.threadGate === 'nobody')}
  <p class="thread-gate-label"><MessageSquareWarning size="16"></MessageSquareWarning>{m.thread_gate_nobody_label()}</p>
{/if}

{#if (Array.isArray(post.threadGate))}
  <p class="thread-gate-label"><MessageSquareWarning size="16"></MessageSquareWarning>{m.thread_gate_custom_label()}</p>
{/if}

<style lang="postcss">
  .thread-gate-label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      padding: 4px 8px;
      background-color: var(--bg-color-2);
      color: var(--text-color-2);
      font-weight: bold;
      border-radius: var(--border-radius-2);
  }
</style>