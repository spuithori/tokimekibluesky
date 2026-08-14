<script lang="ts">
    import {agent, agents, bluefeedAddModal} from "$lib/stores";
    import {getAccountIdByDid} from "$lib/util";
    import BluefeedAddModal from "$lib/components/list/BluefeedAddModal.svelte";

    const uniqueAgent = $agents.get(getAccountIdByDid($agents, $bluefeedAddModal.did));
    let _agent = uniqueAgent || $agent;

    function handleListClose() {
        $bluefeedAddModal = {
            open: false,
            post: undefined,
            did: '',
        }
    }
</script>

{#if ($bluefeedAddModal.open)}
  <BluefeedAddModal {_agent} post={$bluefeedAddModal.post} onclose={handleListClose}></BluefeedAddModal>
{/if}
