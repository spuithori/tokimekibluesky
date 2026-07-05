<script lang="ts">
    import { setColumnState } from '$lib/classes/columnState.svelte';
    import { openJunkColumn, type JunkColumnDescriptor } from '$lib/junkColumn';
    import DeckSlot from '../../../../routes/(app)/DeckSlot.svelte';

    interface Props {
        descriptor: JunkColumnDescriptor;
        _agent?: any;
    }

    let { descriptor, _agent = undefined }: Props = $props();

    const junkState = setColumnState(true);
    openJunkColumn(junkState, descriptor);
    const index = $derived(junkState.getColumnIndex(descriptor.id));
</script>

{#if index >= 0}
    <DeckSlot {index} isJunk={true} {_agent}></DeckSlot>
{/if}
