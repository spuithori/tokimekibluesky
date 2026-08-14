<script lang="ts">
    import Replace from '@lucide/svelte/icons/replace';
    import BookX from '@lucide/svelte/icons/book-x';
  import {liveQuery} from "dexie";
  import {accountsDb} from "$lib/db";
  import {_} from "tokimeki-i18n";
  import Menu from "$lib/components/ui/Menu.svelte";

  interface Props {
    id: any;
    index?: number;
    isPrimary?: boolean;
    isManagement?: boolean;
    onswitch?: (id: any) => void;
    ondelete?: (id: any) => void;
    onswitchAuth?: (payload: {id: any, isOAuth: boolean}) => void;
  }

  let {
    id,
    index = 0,
    isPrimary = false,
    isManagement = false,
    onswitch,
    ondelete,
    onswitchAuth
  }: Props = $props();

  let isMenuOpen = $state(false);

  let account = liveQuery(
      () => accountsDb.accounts.get(id)
  );

  async function switchMain(id) {
      isMenuOpen = false;

      onswitch?.(id);
  }

  async function deleteAccount(id) {
      isMenuOpen = false;

      ondelete?.(id);
  }

  async function switchAuthMethod(id, isOAuth) {
      onswitchAuth?.({id, isOAuth});
  }
</script>

{#if ($account)}
  <div class="acp-account">
    <p class="acp-account__handle">
      <span>@{$account.handle || $account.session?.handle || $account.did}</span>

      {#if (isPrimary)}
        <span class="acp-account__label">{$_('profile_main_account')}</span>
      {/if}

      {#if $account?.isOAuth}
        <span class="acp-account__label acp-account__label--gray">OAuth</span>
      {:else}
        <span class="acp-account__label acp-account__label--gray">Password</span>
      {/if}
    </p>
    <p class="acp-account__service">{$account.service}</p>

    {#if (!isManagement)}
      <Menu bind:isMenuOpen={isMenuOpen}>
        {#snippet content()}
                <ul class="timeline-menu-list" >
            {#if (!isPrimary)}
              <li class="timeline-menu-list__item">
                <button class="timeline-menu-list__button" onclick={() => {switchMain(id)}}>
                  <Replace size={20} color="var(--text-color-1)" />
                  <span>{$_('switch_main_account')}</span>
                </button>
              </li>

              <li class="timeline-menu-list__item timeline-menu-list__item--delete">
                <button class="timeline-menu-list__button" onclick={() => {deleteAccount(id)}}>
                  <BookX size={20} color="var(--danger-color)" />
                  <span class="text-danger">{$_('delete_account')}</span>
                </button>
              </li>
            {/if}
          </ul>
              {/snippet}
      </Menu>
    {:else}
      <div class="acp-account-management-buttons">
        {#if $account?.isOAuth}
          <button class="button button--border button--ss" onclick={() => {switchAuthMethod(id, true)}}>{$_('switch_to_password')}</button>
        {:else}
          <button class="button button--border button--ss" onclick={() => {switchAuthMethod(id, false)}}>{$_('switch_to_oauth')}</button>
        {/if}
        <button class="button button--danger button--border button--ss" onclick={() => {deleteAccount(id)}}>{$_('logout_button')}</button>
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
      {#snippet content()}
            <ul class="timeline-menu-list" >
          <li class="timeline-menu-list__item timeline-menu-list__item--delete">
            <button class="timeline-menu-list__button" onclick={() => {deleteAccount(id)}}>
              <BookX size={20} color="var(--danger-color)" />
              <span class="text-danger">{$_('delete_account')}</span>
            </button>
          </li>
        </ul>
          {/snippet}
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

          &--gray {
              background-color: var(--bg-color-2);
              color: var(--text-color-3);
          }
      }
  }

  .acp-account-management-buttons {
      position: absolute;
      right: 10px;
      top: 10px;
      display: flex;
      gap: 8px;

      @media (max-width: 767px) {
          position: static;
          margin-top: 8px;
      }
  }
</style>