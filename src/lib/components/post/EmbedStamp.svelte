<script lang="ts">
  import {agent} from "$lib/stores";
  import Images from "../../../routes/(app)/Images.svelte";

  export let record;
  export let _agent = $agent;
</script>

<div class="stamp">
  <Images images={record.embeds[0].images} blobs={record?.value?.embed.images} did={record.author.did}></Images>
</div>