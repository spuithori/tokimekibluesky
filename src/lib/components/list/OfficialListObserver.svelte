<script lang="ts">
    import {agent, officialListModal} from "$lib/stores";
    import {createEventDispatcher} from 'svelte';
    import OfficialListModal from "$lib/components/list/OfficialListModal.svelte";
    const dispatch = createEventDispatcher();

    export let _agent = $agent;
    export let purpose = 'app.bsky.graph.defs#curatelist';

    function handleListClose(event) {
        $officialListModal = {
            open: false,
            uri: '',
        }

        dispatch('close');
    }
</script>

{#if ($officialListModal.open)}
  <OfficialListModal {_agent} {purpose} uri={$officialListModal.uri} on:close={handleListClose}></OfficialListModal>
{/if}