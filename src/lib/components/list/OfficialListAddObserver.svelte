<script lang="ts">
    import {agent, agents, listAddModal} from "$lib/stores";
    import OfficialListAddModal from "$lib/components/list/OfficialListAddModal.svelte";
    import {getAccountIdByDid} from "$lib/util";

    const uniqueAgent = $agents.get(getAccountIdByDid($agents, $listAddModal.did));
    let _agent = uniqueAgent || $agent;

    function handleListClose(event) {
        $listAddModal = {
            open: false,
            author: undefined,
            did: '',
        }
    }
</script>

{#if ($listAddModal.open)}
  <OfficialListAddModal {_agent} author={$listAddModal.author} on:close={handleListClose}></OfficialListAddModal>
{/if}
