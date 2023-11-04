<script lang="ts">
  import LoginModal from "$lib/components/acp/LoginModal.svelte";
  import {_} from "svelte-i18n";
  import {accountsDb} from "$lib/db";

  export let account;
  let isLoginModalOpen = false;

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
  <h2 class="missing-account-item__title">{account.session?.handle}</h2>

  <div class="missing-account-item__buttons">
    <button class="button button--sm" on:click={() => {isLoginModalOpen = true}}>{$_('login')}</button>
    <button class="button button--border button--sm" on:click={handleDelete}>{$_('logout_button')}</button>
  </div>
</div>

{#if (isLoginModalOpen)}
  <LoginModal
      existingId={account.id}
      identifier={account.session?.handle || ''}
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

      &__buttons {
          display: flex;
          gap: 8px;
          align-items: center;
      }
  }
</style>