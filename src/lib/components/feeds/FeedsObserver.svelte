<script lang="ts">
    import {feedsModal} from "$lib/stores";
    import FeedsModal from "$lib/components/feeds/FeedsModal.svelte";
    import {createEventDispatcher} from 'svelte';
    const dispatch = createEventDispatcher();

    function handleFeedsClose(event) {
        $feedsModal.open = false;
        dispatch('close', event.detail);
    }
</script>

{#if ($feedsModal.open)}
  <FeedsModal on:close={handleFeedsClose}></FeedsModal>
{/if}