<script lang="ts">
  import {db} from "$lib/db";
  import AcpAccountCard from "$lib/components/acp/AcpAccountCard.svelte";
  import AcpAccountSelector from "$lib/components/acp/AcpAccountSelector.svelte";
  import {agent, agents, columns, currentTimeline} from "$lib/stores";
  import Menu from "$lib/components/ui/Menu.svelte";
  import {_} from "svelte-i18n";
  import toast from "svelte-french-toast";
  import ColumnModal from "$lib/components/column/ColumnModal.svelte";
  import {modifyAgents} from "$lib/modifyAgents";
  import AcpProfileNameModal from "$lib/components/acp/AcpProfileNameModal.svelte";
  import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
  import {resumeAccountsSession} from "$lib/resumeAccountsSession";

  export let profile;
  export let isCurrent = false;

  let isMenuOpen = false;
  let isColumnModalOpen = false;
  let isNameModalOpen = false;
  let _agents;
  let _agent;

  async function handleSuccess(event) {
      try {
          const _accounts = [...profile.accounts, event.detail.did]
          const id = await db.profiles.update(profile.id, {
              accounts: _accounts,
          });

          if (isCurrent) {
              agents.set(await modifyAgents(_accounts));
          }

      } catch (e) {
          console.error(e);
      }
  }

  async function changeProfile() {
      localStorage.setItem('currentProfile', profile.id);
      columns.set(profile.columns);
      currentTimeline.set(0);
      location.reload();
  }

  async function deleteProfile(id) {
      try {
          const pid = await db.profiles.delete(id);

          toast.success($_('profile_delete_success'));
      } catch (e) {
          console.error(e);
      }
  }

  async function handleSwitchMain(event) {
      try {
          const id = await db.profiles.update(profile.id, {
              primary: event.detail.did,
          });

          if (isCurrent) {
              await agent.set($agents.get(event.detail.did));
          }
      } catch (e) {
          console.error(e);
      }
  }

  async function handleDeleteAccount(event) {
      try {
          console.log(event.detail.did)
          const _accounts = profile.accounts.filter(account => account !== event.detail.did)
          const id = await db.profiles.update(profile.id, {
              accounts: _accounts,
          });

          if (isCurrent) {
              agents.set(await modifyAgents(_accounts));
          }
      } catch (e) {
          console.error(e);
      }
  }

  async function handleColumnModalOpen(event) {
      if (!isCurrent) {
          _agents = $agents;
          _agent = $agent;

          const accounts = await db.accounts
              .where('id')
              .anyOf(profile.accounts)
              .toArray();
          const agentsMap = await resumeAccountsSession(accounts);

          agents.set(agentsMap);
          agent.set($agents.get(profile.primary || profile.accounts[0]));
      }

      if (!$agent) {
          toast.error($_('profile_accounts_missing'));
          return false;
      }

      isColumnModalOpen = true
  }

  function handleColumnModalClose(event) {
      if (isCurrent) {
          columns.set(event.detail.columns);
      } else {
          $agents = _agents;
          $agent = _agent;
      }

      isColumnModalOpen = false;
  }

  async function handleNameChange(event) {
      try {
          const id = await db.profiles.update(profile.id, {
              name: event.detail.name,
          });

          isNameModalOpen = false;
      } catch (e) {
          console.error(e);
      }
  }
</script>

<div class="acp-card" class:acp-card--current={isCurrent}>
  <div class="acp-card__heading">
    <p class="acp-card__name">{profile.name}</p>

    {#if (!isCurrent)}
      <button class="button button--ss" on:click={changeProfile}>{$_('profile_switch')}</button>
    {:else}
      <button class="button button--ss button--border" disabled>{$_('profile_current')}</button>
    {/if}

    <Menu bind:isMenuOpen={isMenuOpen}>
      <ul class="timeline-menu-list" slot="content">
        {#if (!isCurrent)}
          <li class="timeline-menu-list__item timeline-menu-list__item--delete">
            <button class="timeline-menu-list__button" on:click={() => {deleteProfile(profile.id)}}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-x"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="m14.5 7-5 5"/><path d="m9.5 7 5 5"/></svg>
              <span class="text-danger">{$_('delete_profile')}</span>
            </button>
          </li>
        {/if}

        {#if profile.accounts.length}
          <li class="timeline-menu-list__item">
            <button class="timeline-menu-list__button" on:click={handleColumnModalOpen}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-columns"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="12" x2="12" y1="3" y2="21"/></svg>
              <span>{$_('column_settings')}</span>
            </button>
          </li>
        {/if}

        <li class="timeline-menu-list__item">
          <button class="timeline-menu-list__button" on:click={() => {isNameModalOpen = true}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pen-square"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/></svg>
            <span>{$_('profile_change_name')}</span>
          </button>
        </li>
      </ul>
    </Menu>
  </div>

  {#if (profile)}
    <div class="acp-accounts">
      {#each profile.accounts as account, index (account)}
        <AcpAccountCard
            did={account}
            {index}
            isPrimary={profile.primary === account}
            on:switch={handleSwitchMain}
            on:delete={handleDeleteAccount}
        ></AcpAccountCard>
      {/each}
    </div>
  {/if}

  <div class="acp-select-account-wrap">
    <AcpAccountSelector exclude={profile.accounts} on:success={handleSuccess}></AcpAccountSelector>
  </div>
</div>

{#if isColumnModalOpen}
  <ColumnModal on:close={handleColumnModalClose} _columns={profile.columns} profileId={profile.id}></ColumnModal>
{/if}

{#if isNameModalOpen}
  <AcpProfileNameModal name="{profile.name}" on:nameChange={handleNameChange}></AcpProfileNameModal>
{/if}

<style lang="postcss">
  .acp-card {
      padding: 12px 20px;
      box-shadow: 0 0 10px var(--box-shadow-color-1);
      border-radius: 6px;
      border: 2px solid transparent;
      margin-bottom: 20px;
      position: relative;

      &--current {
          border: 2px solid var(--primary-color);
      }

      &__name {
          font-weight: bold;
          font-size: 16px;
          margin-right: auto;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          min-width: 0;
      }

      &__heading {
          display: flex;
          align-items: center;
          gap: 10px;
      }
  }
</style>