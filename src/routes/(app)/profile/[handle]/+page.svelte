<script lang="ts">
import UserTimeline from "./UserTimeline.svelte";
import type { LayoutData } from './$types';
import {agent, isLogin} from "$lib/stores";
let profile = Promise;

export let data: LayoutData;

async function load() {
    let profile = await $agent.agent.api.app.bsky.actor.getProfile({actor: data.params.handle});
    return profile.data;
}
profile = load();

</script>

<svelte:head>
  <title>{data.params.handle} - TokimekiBluesky</title>
</svelte:head>

<div class="user-timeline">
  {#await profile}
  {:then profile}
    <UserTimeline author={profile.did}></UserTimeline>
  {/await}
</div>

<style>

</style>