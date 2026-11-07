<script lang="ts">
  import LabelerLabelList from "$lib/components/labeler/LabelerLabelList.svelte";
  import type { PageProps } from './$types';
  import { agent } from "$lib/stores";
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";

  let { data }: PageProps = $props();
  let did = $state();

  $effect(() => {
    $agent.xrpc.get('app.bsky.actor.getProfile', {actor: data.params.handle}).then(({ did: resDid }) => {
      did = resDid;
    })
  })
</script>


<div class="user-profile-labeler-wrap">
  {#if (did)}
    <LabelerLabelList did={did}></LabelerLabelList>
  {:else}
    <LoadingSpinner />
  {/if}
</div>

<style lang="postcss">
  .user-profile-labeler-wrap {
    margin: 8px 16px;
  }
</style>
