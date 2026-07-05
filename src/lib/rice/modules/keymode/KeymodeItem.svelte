<script lang="ts">
    import { keymodeState } from '$lib/classes/keymodeState.svelte';
    import { riceState } from '$lib/rice/riceState.svelte';

    interface Props {
        variant?: 'bar' | 'menu';
        options?: Record<string, string>;
    }

    let { options: itemOptions = {} }: Props = $props();

    const options = $derived({ ...(riceState.moduleConfig('keymode')?.options ?? {}), ...itemOptions });
</script>

{#if keymodeState.mode}
    <span class="rice-keymode">{options.prefix ?? ''}{keymodeState.mode}</span>
{/if}

<style>
    .rice-keymode {
        display: inline-flex;
        align-items: center;
        height: 20px;
        padding: 0 8px;
        border-radius: 10px;
        background-color: var(--current-theme-color, var(--primary-color));
        color: var(--bg-color-1);
        font-size: 11px;
        font-weight: bold;
        letter-spacing: .05em;
        text-transform: uppercase;
        white-space: nowrap;
    }
</style>
