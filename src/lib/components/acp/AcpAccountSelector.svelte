<script lang="ts">
  import {_} from "svelte-i18n";
  import {liveQuery} from "dexie";
  import {accountsDb} from "$lib/db";
  import LoginModal from "$lib/components/acp/LoginModal.svelte";
  import {createEventDispatcher} from "svelte";
  const dispatch = createEventDispatcher();

  let { exclude = [] } = $props();
  let isOpen = $state(false);
  let isLoginModalOpen = $state(false);

  let accounts = liveQuery(
      () => accountsDb.accounts.toArray()
  );

  async function handleSuccess(event) {
      isLoginModalOpen = false;
      isOpen = false;

      dispatch('success', event.detail);
  }

  function handleSelect(id) {
      isOpen = false;

      dispatch('success', {
          id: id,
      });
  }

  function handleCancel() {
      isLoginModalOpen = false;
  }
</script>

<div class="acp-selector-wrap" class:acp-selector-wrap--open={isOpen}>
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down acp-selector-wrap-arrow"><path d="m6 9 6 6 6-6"/></svg>

  <div class="acp-selector">
    <button class="acp-selector__item acp-selector__item--front" onclick={() => {isOpen = !isOpen}}>
      <span class="acp-selector__title"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-plus-2"><path d="M14 19a6 6 0 0 0-12 0"/><circle cx="8" cy="9" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>{$_('add_account')}</span>
    </button>

    <div class="acp-selector-choices">
      {#if ($accounts)}
        {#each $accounts as account}
          {#if (!exclude.includes(account.id))}
            <button class="acp-selector__item" onclick={() => {handleSelect(account.id)}}>
              <span class="acp-selector__title">@{account.handle || account.session?.handle || account.did}</span>
            </button>
          {/if}
        {/each}
      {/if}

      <button class="acp-selector__item acp-selector__item--add" onclick={() => {isLoginModalOpen = true}}>
        <span class="acp-selector__title">{$_('new_login')}</span>
      </button>
    </div>
  </div>
</div>

{#if (isLoginModalOpen)}
  <LoginModal on:success={handleSuccess} on:cancel={handleCancel}></LoginModal>
{/if}

<style lang="postcss">
  .acp-selector-wrap {
      margin-top: 20px;
      height: 50px;
      position: relative;
      overflow: hidden;
      cursor: pointer;
      border-radius: 4px;
      background-color: var(--bg-color-1);
      border-bottom: 1px solid var(--border-color-1);

      &--open {
          overflow: visible;
      }
  }

  .acp-selector-wrap-arrow {
      position: absolute;
      top: 0;
      bottom: 0;
      margin: auto;
      right: 20px;
      pointer-events: none;
      z-index: 1;
  }

  .acp-selector {
      position: absolute;
      left: 0;
      right: 0;
      top: 0;
      border: 1px solid var(--border-color-1);
      border-radius: 4px;

      &__item {
          height: 50px;
          width: 100%;
          padding: 0 20px;
          display: flex;
          justify-content: center;
          flex-direction: column;
          background-color: var(--bg-color-1);
          border-top: 1px solid var(--border-color-1);

          &:hover {
              background-color: var(--bg-color-2);
          }

          &--front {
              border-top: none;
          }
      }

      &__title {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
          color: var(--text-color-1);
      }
  }

  .acp-selector-choices {
      position: relative;
      z-index: 2;
  }
</style>