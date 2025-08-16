<script lang="ts">
  import { m } from "$lib/paraglide/messages.js";
  import {onMount} from "svelte";
  import {getDbFollows, getFollowsWithUpdateDb} from "$lib/getActorsList";
  import {getAccountIdByDidFromDb} from "$lib/util";
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";

  let { _agent } = $props();

  let follows = $state([]);
  let isFollowsListRefreshing = $state(true);

  async function refreshFollowsList() {
      isFollowsListRefreshing = true;
      follows = await getFollowsWithUpdateDb(_agent, await getAccountIdByDidFromDb(_agent.did()));
      isFollowsListRefreshing = false;
  }

  onMount(async () => {
      follows = await getDbFollows(_agent);
      isFollowsListRefreshing = false;
  })
</script>

<div class="realtime-follows">
  <p class="realtime-follows__count"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users-2" aria-label="{m.realtime_follows_count()}"><path d="M14 19a6 6 0 0 0-12 0"/><circle cx="8" cy="9" r="4"/><path d="M22 19a6 6 0 0 0-6-6 4 4 0 1 0 0-8"/></svg> {follows.length}</p>

  {#if (isFollowsListRefreshing)}
    <LoadingSpinner size="20" padding="0"></LoadingSpinner>
  {/if}
  <button class="button button--ss" disabled={isFollowsListRefreshing} onclick={refreshFollowsList}>{m.realtime_follows_refresh()}</button>
</div>

<style lang="postcss">
    .realtime-follows {
        display: flex;
        align-items: center;
        gap: 10px;

        &__count {
            margin-right: auto;
            display: flex;
            align-items: center;
            gap: 4px;
        }
    }
</style>