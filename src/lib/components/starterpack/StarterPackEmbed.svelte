<script lang="ts">
  import {agent} from "$lib/stores";
  import {onMount} from "svelte";
  import StarterPackItem from "$lib/components/starterpack/StarterPackItem.svelte";

  let { _agent = $agent, starterPackBasic } = $props();
  let starterPack = $state(starterPackBasic);

  onMount(async () => {
    try {
      const res = await _agent.xrpcGet('app.bsky.graph.getStarterPack', {starterPack: starterPackBasic.uri});
      starterPack = res.data.starterPack;
    } catch (e) {

    }
  });
</script>

{#if starterPack}
  <StarterPackItem {_agent} {starterPack} layout="embed"></StarterPackItem>
{/if}
