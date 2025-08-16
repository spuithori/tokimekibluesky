<script lang="ts">
    import { m } from "$lib/paraglide/messages.js";
    import { MessageSquareQuote } from 'lucide-svelte';
</script>

<p class="post-gate-label"><MessageSquareQuote size="16"></MessageSquareQuote>{m.post_gate_quote_label()}</p>

<style lang="postcss">
    .post-gate-label {
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