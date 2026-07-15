<script lang="ts">
    import Unplug from '@lucide/svelte/icons/unplug';
  import {_} from "tokimeki-i18n";
  import {liveQuery} from "dexie";
  import {accountsDb, type Account} from "$lib/db";
  import {toast} from "svelte-sonner";
  import LoginModal from "$lib/components/acp/LoginModal.svelte";
  import {addAccountToCurrentWorkspace} from "$lib/workspace";

  let { column } = $props();

  let accounts = liveQuery<Account[]>(() =>
      column?.did ? accountsDb.accounts.where('did').equals(column.did).toArray() : Promise.resolve([] as Account[])
  );
  const knownAccount = $derived($accounts?.[0]);

  let isAdding = $state(false);
  let isLoginModalOpen = $state(false);

  async function addToWorkspace() {
      if (!knownAccount?.id || isAdding) return;
      isAdding = true;
      try {
          await addAccountToCurrentWorkspace(knownAccount.id);
      } catch (e) {
          console.error(e);
          toast.error('Error: ' + e);
      } finally {
          isAdding = false;
      }
  }

  async function handleLoginSuccess(event: CustomEvent<{ id: number }>) {
      isLoginModalOpen = false;
      try {
          if (event?.detail?.id) {
              await addAccountToCurrentWorkspace(event.detail.id);
          }
      } catch (e) {
          console.error(e);
      }
  }
</script>

<div class="column-agent-missing">
  <div class="modal-heading-icon">
    <Unplug size={48} color="var(--danger-color)" />
  </div>

  <h1 class="modal-title modal-title--smaller modal-title--center">{$_('profile_account_missing_title')}</h1>

  {#if column.handle}
    <p class="modal-text modal-text--center">{$_('column_account_missing_text_1', {name: column.handle})}</p>
  {:else}
    <p class="modal-text modal-text--center">{$_('column_account_missing_text_2')}</p>
  {/if}

  <div class="column-agent-missing__actions">
    {#if knownAccount}
      <button class="button" onclick={addToWorkspace} disabled={isAdding}>{$_('add_to_workspace')}</button>
    {:else if $accounts !== undefined && column.handle}
      <button class="button" onclick={() => {isLoginModalOpen = true}}>{$_('login')}</button>
    {/if}

    <a href="/settings/profiles/" class="button button--border">{$_('settings_profiles')}</a>
  </div>
</div>

{#if isLoginModalOpen}
  <LoginModal identifier={column.handle || ''} on:success={handleLoginSuccess} on:cancel={() => {isLoginModalOpen = false}}></LoginModal>
{/if}

<style lang="postcss">
  .column-agent-missing {
      width: 100%;
      padding: 50px 30px;

      &__actions {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
      }
  }
</style>
