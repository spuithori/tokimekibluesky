<script lang="ts">
    import { onDestroy } from "svelte";
    import { getColumnState } from "$lib/classes/columnState.svelte";
    import { openJunkColumn, type JunkColumnDescriptor } from "$lib/junkColumn";
    import DeckSlot from "./DeckSlot.svelte";

    interface Props {
        descriptor: JunkColumnDescriptor;
        name?: any;
        _agent?: any;
        removeOnDestroy?: boolean;
    }

    let { descriptor, name = undefined, _agent = undefined, removeOnDestroy = false }: Props = $props();

    const junkState = getColumnState(true);
    openJunkColumn(junkState, descriptor);

    const index = $derived(junkState.getColumnIndex(descriptor.id));

    onDestroy(() => {
        if (removeOnDestroy) junkState.remove(descriptor.id);
    });
</script>

{#if index >= 0}
    <DeckSlot {index} isJunk={true} {name} {_agent}></DeckSlot>
{/if}
