<script lang="ts">
    import { m } from "$lib/paraglide/messages.js";
    import { liveQuery } from 'dexie';
    import {accountsDb} from '$lib/db';
    import AcpProfileCard from "$lib/components/acp/AcpProfileCard.svelte";
    import AccountsManagementModal from "$lib/components/acp/AccountsManagementModal.svelte";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";

    let isAccountManagementModalOpen = $state(false);

    let accounts = liveQuery(
        () => accountsDb.accounts.toArray()
    );

    let profiles = $derived(liveQuery(async () => {
        const profiles = await accountsDb.profiles.toArray();
        return profiles;
    }))

    let currentProfile = $derived(Number(localStorage.getItem('currentProfile') || profiles[0].id ));

    async function createProfile(length) {
        const id = await accountsDb.profiles.put({
            accounts: [],
            columns: [],
            createdAt: "",
            name: m.workspace() + ' ' + length,
            primary: 0
        })
    }

    function handleAccountsManagementModalClose() {
        isAccountManagementModalOpen = false;
    }
</script>

<svelte:head>
  <title>{m.settings_profiles()} - TOKIMEKI</title>
</svelte:head>

<div>
  <SettingsHeader>
    {m.settings_profiles()}
  </SettingsHeader>

  <div class="settings-wrap">
    <p class="settings-description">{m.profiles_description()}</p>

    <div class="acp-list-wrap">
      <div class="acp-list">
        {#if ($profiles)}
          {#each $profiles as profile (profile.id)}
            <AcpProfileCard {profile} isCurrent={currentProfile === profile.id}></AcpProfileCard>
          {/each}
        {/if}
      </div>

      <div class="acp-add-button">
        <button class="button" onclick={() => {createProfile($profiles.length + 1)}}>{m.create_new_profile()}</button>
      </div>

      <div class="acp-management-button">
        <button class="text-button" onclick={() => {isAccountManagementModalOpen = true}}>{m.accounts_management()}</button>
      </div>
    </div>
  </div>
</div>

{#if isAccountManagementModalOpen}
  <AccountsManagementModal on:close={handleAccountsManagementModalClose}></AccountsManagementModal>
{/if}

<style lang="postcss">
  .acp-add-button {
      margin-top: 20px;
      text-align: center;
  }

  .acp-management-button {
      text-align: center;
      margin-top: 15px;
  }
</style>