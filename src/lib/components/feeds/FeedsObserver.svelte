<script lang="ts">
    import {agent, feedsModal} from "$lib/stores";
    import FeedsModal from "$lib/components/feeds/FeedsModal.svelte";
    import {createEventDispatcher} from 'svelte';
    const dispatch = createEventDispatcher();

    export let _agent = $agent;

    function handleFeedsClose(event) {
        $feedsModal.open = false;
        dispatch('close', event.detail);
    }
</script>

{#if ($feedsModal.open)}
  <FeedsModal on:close={handleFeedsClose} {_agent}></FeedsModal>
{/if}