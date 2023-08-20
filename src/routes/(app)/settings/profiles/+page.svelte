<script lang="ts">
    import {_} from 'svelte-i18n';
    import { liveQuery } from 'dexie';
    import {accountsDb} from '$lib/db';
    import AcpProfileCard from "$lib/components/acp/AcpProfileCard.svelte";

    let accounts = liveQuery(
        () => accountsDb.accounts.toArray()
    );

    $: profiles = liveQuery(async () => {
        const profiles = await accountsDb.profiles.toArray();
        return profiles;
    })

    $: currentProfile = Number(localStorage.getItem('currentProfile') || profiles[0].id );

    async function createProfile() {
        const id = await accountsDb.profiles.put({
            accounts: [],
            columns: [],
            createdAt: "",
            name: "New Profile",
            primary: 0
        })
    }
</script>

<svelte:head>
  <title>Profiles - TOKIMEKI Bluesky</title>
</svelte:head>

<div>
  <div class="settings-heading">
    <a href="/settings" class="settings-back"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="16.97" viewBox="0 0 20 16.97">
      <path id="arrow-left" d="M3.828,9,9.9,2.929,8.485,1.515,0,10l.707.707,7.778,7.778L9.9,17.071,3.828,11H20V9Z" transform="translate(0 -1.515)" fill="var(--text-color-1)"/>
    </svg></a>

    <h1 class="settings-title">{$_('settings_profiles')}</h1>
  </div>

  <p class="settings-description">{$_('profiles_description')}</p>

  <div class="settings-wrap">
    <div class="acp-list-wrap">
      <div class="acp-list">
        {#if ($profiles)}
          {#each $profiles as profile (profile.id)}
            <AcpProfileCard {profile} isCurrent={currentProfile === profile.id}></AcpProfileCard>
          {/each}
        {/if}
      </div>

      <div class="acp-add-wrap">
        <button class="button" on:click={createProfile}>{$_('create_new_profile')}</button>
      </div>
    </div>
  </div>
</div>

<style lang="postcss">
  .acp-add-wrap {
      margin-top: 20px;
      text-align: center;
  }
</style>