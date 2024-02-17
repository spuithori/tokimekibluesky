<script lang="ts">
    import {agent, agents, bluefeedAddModal} from "$lib/stores";
    import {createEventDispatcher} from 'svelte';
    import {getAccountIdByDid} from "$lib/util";
    import BluefeedAddModal from "$lib/components/list/BluefeedAddModal.svelte";
    const dispatch = createEventDispatcher();

    const uniqueAgent = $agents.get(getAccountIdByDid($agents, $bluefeedAddModal.did));
    let _agent = uniqueAgent || $agent;

    function handleListClose(event) {
        $bluefeedAddModal = {
            open: false,
            post: undefined,
            did: '',
        }

        dispatch('close');
    }
</script>

{#if ($bluefeedAddModal.open)}
  <BluefeedAddModal {_agent} post={$bluefeedAddModal.post} on:close={handleListClose}></BluefeedAddModal>
{/if}
