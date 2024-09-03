<script lang="ts">
    import {_} from "svelte-i18n";
    import {postgate} from "$lib/stores";
    import { MessageSquareQuote } from 'lucide-svelte';
</script>

{#if (!$postgate)}
  <p class="post-gate-label"><MessageSquareQuote size="16"></MessageSquareQuote>{$_('post_gate_quote_label')}</p>
{/if}

<style lang="postcss">
    .post-gate-label {
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