<script lang="ts">
    import {agent, agents} from "$lib/stores";
    import {onMount} from "svelte";
    import AgentsSelector from "$lib/components/acp/AgentsSelector.svelte";
    import LabelerItem from "$lib/components/labeler/LabelerItem.svelte";
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
    let labelers = $state([]);
    let _agent = $agent;
    let ready = $state(false);

    async function handleAgentSelect(event) {
        ready = false;
        _agent = event.detail.agent;
        await loadLabelers();
        ready = true;
    }

    async function loadLabelers() {
        const dids = await _agent.getSavedLabelerDids();

        if (dids.length) {
            const res = await _agent.agent.getLabelers({dids: dids});
            labelers = res.data.views;
        } else {
            labelers = [];
        }
    }

    onMount(async () => {
        await loadLabelers();
        ready = true;
    })
</script>

{#if $agents.size > 1}
  <div class="import-word-agents-selector">
    <AgentsSelector on:select={handleAgentSelect}></AgentsSelector>
  </div>
{/if}

{#if (ready)}
  {#each labelers as labeler}
    <LabelerItem labeler={labeler}></LabelerItem>
  {/each}
{:else}
  <div class="thread-loading">
    <LoadingSpinner></LoadingSpinner>
  </div>
{/if}

<style lang="postcss">
    .import-word-agents-selector {
        margin-bottom: 16px;
    }
</style>