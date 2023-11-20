<script lang="ts">
  import {liveQuery} from "dexie";
  import {accountsDb} from "$lib/db";
  import {_} from "svelte-i18n";
  import Menu from "$lib/components/ui/Menu.svelte";
  import {createEventDispatcher} from "svelte";
  const dispatch = createEventDispatcher();

  export let id;
  export let index = 0;
  export let isPrimary = false;
  export let isManagement = false;

  let isMenuOpen = false;

  let account = liveQuery(
      () => accountsDb.accounts.get(id)
  );

  async function switchMain(id) {
      isMenuOpen = false;

      dispatch('switch', {
          id: id,
      });
  }

  async function deleteAccount(id) {
      isMenuOpen = false;

      dispatch('delete', {
          id: id,
      });
  }
</script>

{#if ($account)}
  <div class="acp-account">
    <p class="acp-account__handle">
      <span>@{$account.session.handle}</span>

      {#if (isPrimary)}
        <span class="acp-account__label">{$_('profile_main_account')}</span>
      {/if}
    </p>
    <p class="acp-account__service">{$account.service}</p>

    {#if (!isManagement)}
      <Menu bind:isMenuOpen={isMenuOpen}>
        <ul class="timeline-menu-list" slot="content">
          {#if (!isPrimary)}
            <li class="timeline-menu-list__item">
              <button class="timeline-menu-list__button" on:click={() => {switchMain(id)}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-replace"><path d="M14 4c0-1.1.9-2 2-2"/><path d="M20 2c1.1 0 2 .9 2 2"/><path d="M22 8c0 1.1-.9 2-2 2"/><path d="M16 10c-1.1 0-2-.9-2-2"/><path d="m3 7 3 3 3-3"/><path d="M6 10V5c0-1.7 1.3-3 3-3h1"/><rect width="8" height="8" x="2" y="14" rx="2"/></svg>
                <span>{$_('switch_main_account')}</span>
              </button>
            </li>

            <li class="timeline-menu-list__item timeline-menu-list__item--delete">
              <button class="timeline-menu-list__button" on:click={() => {deleteAccount(id)}}>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-x"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="m14.5 7-5 5"/><path d="m9.5 7 5 5"/></svg>
                <span class="text-danger">{$_('delete_account')}</span>
              </button>
            </li>
          {/if}
        </ul>
      </Menu>
    {:else}
      <div class="acp-account-logout-button">
        <button class="button button--danger button--border button--ss" on:click={() => {deleteAccount(id)}}>{$_('logout_button')}</button>
      </div>
    {/if}
  </div>
{:else}
  <div class="acp-account">
    <p class="acp-account__handle">
      <span>不明なアカウント</span>
    </p>
    <p class="acp-account__service">Unknown account.</p>

    <Menu bind:isMenuOpen={isMenuOpen}>
      <ul class="timeline-menu-list" slot="content">
        <li class="timeline-menu-list__item timeline-menu-list__item--delete">
          <button class="timeline-menu-list__button" on:click={() => {deleteAccount(id)}}>
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-book-x"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/><path d="m14.5 7-5 5"/><path d="m9.5 7 5 5"/></svg>
            <span class="text-danger">{$_('delete_account')}</span>
          </button>
        </li>
      </ul>
    </Menu>
  </div>
{/if}

<style lang="postcss">
  .acp-account {
      border: 1px solid var(--border-color-1);
      padding: 10px;
      border-radius: 4px;
      margin-top: 10px;
      font-size: 14px;
      position: relative;

      &__service {
          color: var(--text-color-3);
      }

      &__handle {
          font-weight: bold;
          display: flex;
          align-items: center;
          gap: 5px;
      }
      
      &__label {
          font-size: 11px;
          letter-spacing: -.05em;
          height: 20px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 0 8px;
          border-radius: 10px;
          background-color: var(--acp-main-label-bg-color);
          color: #fff;
      }
  }

  .acp-account-logout-button {
      position: absolute;
      right: 10px;
      top: 10px;
  }
</style>