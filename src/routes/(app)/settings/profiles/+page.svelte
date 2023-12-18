<script lang="ts">
    import {_} from 'svelte-i18n';
    import { liveQuery } from 'dexie';
    import {accountsDb} from '$lib/db';
    import AcpProfileCard from "$lib/components/acp/AcpProfileCard.svelte";
    import AccountsManagementModal from "$lib/components/acp/AccountsManagementModal.svelte";

    let isAccountManagementModalOpen = false;

    let accounts = liveQuery(
        () => accountsDb.accounts.toArray()
    );

    $: profiles = liveQuery(async () => {
        const profiles = await accountsDb.profiles.toArray();
        return profiles;
    })

    $: currentProfile = Number(localStorage.getItem('currentProfile') || profiles[0].id );

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
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" on:click={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <h1 class="column-heading__title">{$_('settings_profiles')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  <div class="settings-wrap">
    <p class="settings-description">{$_('profiles_description')}</p>

    <div class="acp-list-wrap">
      <div class="acp-list">
        {#if ($profiles)}
          {#each $profiles as profile (profile.id)}
            <AcpProfileCard {profile} isCurrent={currentProfile === profile.id}></AcpProfileCard>
          {/each}
        {/if}
      </div>

      <div class="acp-add-button">
        <button class="button" on:click={() => {createProfile($profiles.length + 1)}}>{$_('create_new_profile')}</button>
      </div>

      <div class="acp-management-button">
        <button class="text-button" on:click={() => {isAccountManagementModalOpen = true}}>{$_('accounts_management')}</button>
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