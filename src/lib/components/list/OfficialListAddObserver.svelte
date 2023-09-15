<script lang="ts">
    import {agent, agents, listAddModal} from "$lib/stores";
    import {createEventDispatcher} from 'svelte';
    import OfficialListAddModal from "$lib/components/list/OfficialListAddModal.svelte";
    import {getAccountIdByDid} from "$lib/util";
    const dispatch = createEventDispatcher();

    const uniqueAgent = $agents.get(getAccountIdByDid($agents, $listAddModal.did));
    let _agent = uniqueAgent || $agent;

    function handleListClose(event) {
        $listAddModal = {
            open: false,
            author: undefined,
            did: '',
        }

        dispatch('close');
    }
</script>

{#if ($listAddModal.open)}
  <OfficialListAddModal {_agent} author={$listAddModal.author} on:close={handleListClose}></OfficialListAddModal>
{/if}
