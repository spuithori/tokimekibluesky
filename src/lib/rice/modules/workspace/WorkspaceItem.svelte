<script lang="ts">
    import Layers from '@lucide/svelte/icons/layers';
    import { liveQuery } from 'dexie';
    import { accountsDb } from '$lib/db';
    import { appState } from '$lib/classes/appState.svelte';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { parseCommandLine, runCommand } from '$lib/commands/registry.svelte';

    interface Props {
        variant?: 'bar' | 'column';
        options?: Record<string, string>;
    }

    let { options: itemOptions = {} }: Props = $props();

    const options = $derived({ ...(riceState.moduleConfig('workspace')?.options ?? {}), ...itemOptions });
    const profiles = liveQuery(() => accountsDb.profiles.toArray());
    const currentName = $derived($profiles?.find((profile) => profile.id === appState.profile.current)?.name ?? null);

    function handleClick(event: MouseEvent) {
        const { id, arg } = parseCommandLine(options['on-click'] ?? 'side.toggle workspace');
        const anchor = event.currentTarget instanceof HTMLElement ? event.currentTarget : undefined;
        runCommand(id, arg, { anchor });
    }
</script>

{#if currentName}
    <button class="rice-bar-item" onclick={handleClick}>
        <Layers size={16} color="var(--text-color-2)" strokeWidth="var(--icon-stroke-width, 2px)"></Layers>
        <span class="rice-bar-item__label">{currentName}</span>
    </button>
{/if}
