<script lang="ts">
    import Users2 from '@lucide/svelte/icons/users-2';
  import {_} from "tokimeki-i18n";
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
  <p class="realtime-follows__count"><Users2 size={20} aria-label="{$_('realtime_follows_count')}" /> {follows.length}</p>

  {#if (isFollowsListRefreshing)}
    <LoadingSpinner size="20" padding="0"></LoadingSpinner>
  {/if}
  <button class="button button--ss" disabled={isFollowsListRefreshing} onclick={refreshFollowsList}>{$_('realtime_follows_refresh')}</button>
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