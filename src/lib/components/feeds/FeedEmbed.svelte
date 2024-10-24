<script lang="ts">
  import {agent} from "$lib/stores";
  import {onMount} from "svelte";
  import FeedsItem from "$lib/components/feeds/FeedsItem.svelte";

  let { _agent = $agent, feedUri } = $props();
  let feed: string = $state();

  onMount(async () => {
      try {
          const res = await _agent.agent.api.app.bsky.feed.getFeedGenerator({feed: feedUri});
          feed = res.data.view;
      } catch (e) {
          //
      }
  })
</script>

{#if feed}
  <FeedsItem {_agent} {feed}></FeedsItem>
{/if}