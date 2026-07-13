<script lang="ts">
    import ThrowingChild from './ThrowingChild.svelte';
    import ColumnErrorPanel from '$lib/components/column/ColumnErrorPanel.svelte';

    let { column, shouldThrow = true, onerror = undefined } = $props();
</script>

<svelte:boundary onerror={(error) => onerror?.(error)}>
    <ThrowingChild {shouldThrow} />

    {#snippet failed(error, reset)}
        <ColumnErrorPanel {column} {reset}></ColumnErrorPanel>
    {/snippet}
</svelte:boundary>
