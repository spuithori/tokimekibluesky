<script lang="ts">
    import {_} from 'svelte-i18n';
    import { liveQuery } from 'dexie';
    import {accountsDb} from '$lib/db';
    import AcpProfileCard from "$lib/components/acp/AcpProfileCard.svelte";
    import AccountsManagementModal from "$lib/components/acp/AccountsManagementModal.svelte";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
    import {appState} from "$lib/classes/appState.svelte";
    import { ChevronRight,GalleryVertical } from "lucide-svelte";

    let isAccountManagementModalOpen = $state(false);

    let accounts = liveQuery(
        () => accountsDb.accounts.toArray()
    );

    let profiles = $derived(liveQuery(async () => {
        const profiles = await accountsDb.profiles.toArray();
        return profiles;
    }))

    async function createProfile(length) {
        const id = await accountsDb.profiles.put({
            accounts: [],
            columns: [],
            createdAt: "",
            name: $_('workspace') + ' ' + length,
            primary: 0
        })
    }

    function handleAccountsManagementModalClose() {
        isAccountManagementModalOpen = false;
    }
</script>

<svelte:head>
  <title>{$_('settings_profiles')} - TOKIMEKI</title>
</svelte:head>

<div>
  <SettingsHeader>
    {$_('settings_profiles')}
  </SettingsHeader>

  <div class="settings-wrap">
    <div class="settings-child-nav">
      <GalleryVertical size="24"></GalleryVertical>
      <a href="/settings/schedule">{$_('schedule_post_title')}<br><span>{$_('schedule_auth_required')}</span></a>
      <ChevronRight size="20"></ChevronRight>
    </div>

    <p class="settings-description">{$_('profiles_description')}</p>

    <div class="acp-list-wrap">
      <div class="acp-list">
        {#if ($profiles)}
          {#each $profiles as profile (profile.id)}
            <AcpProfileCard {profile} isCurrent={appState.profile.current === profile.id}></AcpProfileCard>
          {/each}
        {/if}
      </div>

      <div class="acp-add-button">
        <button class="button" onclick={() => {createProfile($profiles.length + 1)}}>{$_('create_new_profile')}</button>
      </div>

      <div class="acp-management-button">
        <button class="text-button" onclick={() => {isAccountManagementModalOpen = true}}>{$_('accounts_management')}</button>
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