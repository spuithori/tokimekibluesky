<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { agent } from '$lib/stores';
    import { unsub } from '$lib/pushSubscription';

    export let accounts;
    export let currentAccount;

    $: {

    }

    function accountNameUpdate() {
        localStorage.setItem('accounts', JSON.stringify(accounts));
    }

    async function accountSwitch(index) {
        currentAccount = index;
        localStorage.setItem('currentAccount', String(currentAccount));
        await unsub();
        location.reload();
    }

    function handleKeydown(event) {
        if (event.key === 'n') {
            return false;
        }
    }
</script>

<svelte:window on:keydown={handleKeydown} />

<div>
  <div class="account-switch-list">
    {#each accounts as account, index}
      <div class="account-switch-item" class:account-switch-item--current={account.session.did === $agent.did()}>
        <div class="account-switch-item__avatar">

        </div>

        <div class="account-switch-item__content">
          <div class="account-switch-item__name-wrap">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
            <path id="edit-pencil" d="M9.84,2.96l3.2,3.2L3.2,16H0V12.8Zm1.12-1.12L12.8,0,16,3.2,14.16,5.04Z" fill="var(--text-color-1)"/>
            </svg>
            <input class="account-switch-item__name" bind:value={account.name} on:input={() => accountNameUpdate()} maxlength="30" required>
          </div>

          <p class="account-switch-item__handle">@{account.session.handle}</p>

          <p class="account-switch-item__service">{account.service}</p>

          {#if (account.session.did === $agent.did())}
            <div class="account-switch-item__buttons">
              <button class="button button--sm" disabled>{$_('current')}</button>
            </div>
          {:else}
            <div class="account-switch-item__buttons">
              <button class="button button--sm" on:click={() => {accountSwitch(index)}}>{$_('switch')}</button>
            </div>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>

<style lang="postcss">
  .account-switch-list {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;

      @media (max-width: 767px) {
          grid-template-columns: 1fr;

          .button {
              width: 100%;
          }
      }
  }

  .account-switch-item {
      padding: 20px;
      border: 1px solid var(--border-color-1);
      border-radius: 6px;
      width: 100%;
      max-width: 300px;
      min-width: 0;

      &__content {
          display: flex;
          flex-direction: column;
      }

      &__name-wrap {
          position: relative;
          border: 1px solid var(--border-color-1);
          border-radius: 4px;
          height: 40px;
          padding: 0 10px;
          display: flex;
          gap: 10px;
          align-items: center;
          margin-bottom: 10px;
          overflow: hidden;

          &:focus-within {
              border-color: var(--text-color-1);
          }

          svg {
              flex-shrink: 0;
          }
      }

      &__name {
          font-size: 18px;
          font-weight: 600;
          flex: 1;
          white-space: nowrap;
          color: var(--text-color-1);
      }

      &__service {
          margin-bottom: 15px;
      }

      &__buttons {
          text-align: center;
          margin-top: auto;
      }

      &--current {
          border-color: var(--primary-color);
          border-width: 2px;
      }
  }
</style>