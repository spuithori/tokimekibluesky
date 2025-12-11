<script lang="ts">
  import LoginModal from "$lib/components/acp/LoginModal.svelte";
  import {_} from "svelte-i18n";
  import {accountsDb} from "$lib/db";

  let { account } = $props();
  let isLoginModalOpen = $state(false);

  async function handleSuccess(event) {
      isLoginModalOpen = false;
      location.reload();
  }

  function handleCancel() {
      isLoginModalOpen = false;
  }

  async function handleDelete() {
      try {
          const id = await accountsDb.accounts.delete(account.id);
          const profiles = await accountsDb.profiles.toArray();

          profiles.forEach(profile => {
              const pid = accountsDb.profiles.update(profile.id, {
                  accounts: profile.accounts.filter(_account => _account !== account.id)
              });

              if (profile.primary === account.id) {
                  const npid = accountsDb.profiles.update(profile.id, {
                      primary: profile.accounts[0]
                  })
              }
          })

          location.reload();
      } catch (e) {
          console.error(e);
      }
  }
</script>

<div class="missing-account-item">
  <h2 class="missing-account-item__title">@{account.handle || account.session?.handle || account.did}</h2>
  {#if account.isOAuth}
    <span class="missing-account-item__badge">OAuth</span>
  {/if}

  <div class="missing-account-item__buttons">
    <button class="button button--sm" onclick={() => {isLoginModalOpen = true}}>{$_('login')}</button>
    <button class="button button--border button--sm" onclick={handleDelete}>{$_('logout_button')}</button>
  </div>
</div>

{#if (isLoginModalOpen)}
  <LoginModal
      existingId={account.id}
      identifier={account.handle || account.session?.handle || ''}
      isMissing={true}
      on:success={handleSuccess}
      on:cancel={handleCancel}></LoginModal>
{/if}

<style lang="postcss">
  .missing-account-item {
      border: 1px solid var(--border-color-1);
      border-radius: var(--border-radius-3);
      padding: 16px;
      margin-bottom: 16px;

      &__title {
          font-size: 16px;
          margin-bottom: 8px;
          line-height: 1.5;
      }

      &__badge {
          display: inline-block;
          font-size: 11px;
          padding: 2px 6px;
          border-radius: 4px;
          background-color: var(--primary-color);
          color: #fff;
          margin-bottom: 8px;
      }

      &__buttons {
          display: flex;
          gap: 8px;
          align-items: center;
      }
  }
</style>