<script lang="ts">
    import type { Snippet } from 'svelte';

    let { children }: { children: Snippet } = $props();
</script>

<div class="ai-table-wrap">
    {@render children()}
</div>

<style lang="postcss">
    .ai-table-wrap {
        margin: 8px 0 16px;
        border: 1px solid var(--border-color-1);
        border-radius: 8px;
        overflow: hidden;

        :global(table) {
            width: 100%;
            border-collapse: collapse;
            font-size: 14px;
            line-height: 1.75;
            text-align: left;
            color: var(--text-color-1);
        }

        :global(th),
        :global(td) {
            padding: 12px 16px;
            vertical-align: top;
            overflow-wrap: anywhere;
        }

        :global(th) {
            width: 11.5em;
            background-color: var(--bg-color-2);
            font-size: 13px;
            font-weight: bold;
            color: var(--text-color-3);
        }

        :global(tr + tr) {
            border-top: 1px solid var(--border-color-1);
        }

        :global(code) {
            font-size: 12px;
        }

        @media (max-width: 767px) {
            :global(table),
            :global(tbody),
            :global(tr),
            :global(th),
            :global(td) {
                display: block;
                width: auto;
            }

            :global(th) {
                padding: 8px 14px 0;
                background-color: transparent;
                font-size: 12px;
            }

            :global(td) {
                padding: 2px 14px 10px;
            }
        }
    }
</style>
