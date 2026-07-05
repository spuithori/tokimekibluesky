<script>
    import Unplug from '@lucide/svelte/icons/unplug';
  import AcpProfileCard from "$lib/components/acp/AcpProfileCard.svelte";
  import { fly } from 'svelte/transition';
  import {liveQuery} from "dexie";
  import {accountsDb} from "$lib/db";
  import {_} from "tokimeki-i18n";

  let profiles = $derived(liveQuery(async () => {
      const profiles = await accountsDb.profiles.toArray();
      return profiles;
  }))
</script>

<div class="modal" transition:fly="{{ y: 30, duration: 250 }}">
  <div class="modal-contents">
    <div class="modal-heading-icon">
      <Unplug size={48} color="var(--danger-color)" />
    </div>

    <h1 class="modal-title modal-title--smaller modal-title--center">{$_('missing_profile_title')}</h1>

    <div class="acp-list">
      {#if ($profiles)}
        {#each $profiles as profile (profile.id)}
          <AcpProfileCard {profile}></AcpProfileCard>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style lang="postcss">
  .acp-list {
      margin-top: 36px;
  }
</style>
