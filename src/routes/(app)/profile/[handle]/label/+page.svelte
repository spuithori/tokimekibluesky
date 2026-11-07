<script lang="ts">
  import LabelerLabelList from "$lib/components/labeler/LabelerLabelList.svelte";
  import type { PageProps } from "./$types";
  import { agent } from "$lib/stores";
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
  import { getAgentContext } from "../state.svelte";
  import { onMount } from "svelte";

  let { data }: PageProps = $props();
  let did = $state();
  const agentContext = getAgentContext();

  onMount(async () => {
    const { did: resDid } = await agentContext.agent!.xrpc.get(
      "app.bsky.actor.getProfile",
      { actor: data.params.handle },
    );
    did = resDid;
  });
</script>

<div class="user-profile-labeler-wrap">
  {#if did}
    <LabelerLabelList {did}></LabelerLabelList>
  {:else}
    <LoadingSpinner />
  {/if}
</div>

<style lang="postcss">
  .user-profile-labeler-wrap {
    margin: 8px 16px;
  }
</style>
