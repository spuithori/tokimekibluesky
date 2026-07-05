<script lang="ts">
    import CircleAlert from '@lucide/svelte/icons/circle-alert';
    import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
    import type { RiceDiagnostic } from '$lib/rice/config/model';

    interface Props {
        diagnostics: RiceDiagnostic[];
    }

    let { diagnostics }: Props = $props();
</script>

{#if diagnostics.length > 0}
    <ul class="rice-diagnostics">
        {#each diagnostics as diagnostic (diagnostic.line + diagnostic.message)}
            <li class="rice-diagnostics__item rice-diagnostics__item--{diagnostic.severity}">
                {#if diagnostic.severity === 'error'}
                    <CircleAlert size={16} color="var(--danger-color)"></CircleAlert>
                {:else}
                    <TriangleAlert size={16} color="var(--text-color-3)"></TriangleAlert>
                {/if}
                <span class="rice-diagnostics__line">L{diagnostic.line}</span>
                <span class="rice-diagnostics__message">{diagnostic.message}</span>
            </li>
        {/each}
    </ul>
{/if}

<style>
    .rice-diagnostics {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 8px 0;
    }

    .rice-diagnostics__item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: var(--text-color-2);
    }

    .rice-diagnostics__item--error {
        color: var(--danger-color);
    }

    .rice-diagnostics__line {
        flex-shrink: 0;
        font-family: ui-monospace, monospace;
        color: var(--text-color-3);
    }

    .rice-diagnostics__message {
        min-width: 0;
        overflow-wrap: anywhere;
    }
</style>
