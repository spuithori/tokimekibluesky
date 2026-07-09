<script lang="ts">
    import { onDestroy } from 'svelte';
    import { getColumnState } from '$lib/classes/columnState.svelte';
    import { registerCommands } from '$lib/commands/registry.svelte';
    import { createCoreCommands } from '$lib/commands/coreCommands';

    const columnState = getColumnState();
    const unregister = registerCommands(createCoreCommands({ columnState }));
    onDestroy(unregister);
</script>
