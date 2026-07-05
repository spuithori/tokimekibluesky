<script lang="ts">
    import Bell from '@lucide/svelte/icons/bell';
    import { getColumnState } from '$lib/classes/columnState.svelte';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { parseCommandLine, runCommand } from '$lib/commands/registry.svelte';

    interface Props {
        variant?: 'bar' | 'column';
        options?: Record<string, string>;
    }

    let { options: itemOptions = {} }: Props = $props();

    const columnState = getColumnState();
    const options = $derived({ ...(riceState.moduleConfig('notifications')?.options ?? {}), ...itemOptions });
    const count = $derived(
        columnState.columns
            .filter((column) => column?.algorithm?.type === 'notification')
            .reduce((sum, column) => sum + (column.unreadCount ?? 0), 0),
    );
    const hidden = $derived(options['hide-zero'] === 'true' && count === 0);

    function handleClick(event: MouseEvent) {
        const { id, arg } = parseCommandLine(options['on-click'] ?? 'side.toggle notifications');
        const anchor = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
        runCommand(id, arg, { anchor });
    }
</script>

{#if !hidden}
    <button class="rice-bar-item" onclick={handleClick}>
        <Bell size={16} color="var(--text-color-2)" strokeWidth="var(--icon-stroke-width, 2px)"></Bell>
        {#if count > 0}
            <span class="rice-bar-item__count rice-bar-item__count--active">{count}</span>
        {/if}
    </button>
{/if}
