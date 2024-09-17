<script lang="ts">
    import {agent, cloudBookmarkModal} from "$lib/stores";
    import CloudBookmarkModal from "$lib/components/bookmark/CloudBookmarkModal.svelte";
    import {createEventDispatcher} from 'svelte';
    const dispatch = createEventDispatcher();
    let bookmark = undefined;

    export let _agent = $agent;

    function handleBookmarkClose(event) {
        $cloudBookmarkModal.open = false;
        dispatch('close', event.detail);
    }
</script>

{#if ($cloudBookmarkModal.open)}
  <CloudBookmarkModal id={$cloudBookmarkModal.data} on:close={handleBookmarkClose} {_agent}></CloudBookmarkModal>
{/if}