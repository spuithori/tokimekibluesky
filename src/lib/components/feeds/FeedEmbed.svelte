<script lang="ts">
  import {agent} from "$lib/stores";
  import {onMount} from "svelte";
  import FeedsItem from "$lib/components/feeds/FeedsItem.svelte";

  export let _agent = $agent;
  export let feedUri;
  let feed: string;

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