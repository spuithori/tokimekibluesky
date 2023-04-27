<script lang="ts">
import UserTimeline from "./UserTimeline.svelte";
import type { LayoutData } from './$types';

export let data: LayoutData;
</script>

<svelte:head>
  <title>{data.params.handle} - TOKIMEKI Bluesky</title>
</svelte:head>

<div class="user-timeline">
  <UserTimeline author={data.params.handle}></UserTimeline>
</div>
