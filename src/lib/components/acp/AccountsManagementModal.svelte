<script lang="ts">
    import {_} from "tokimeki-i18n";
    import { fly } from 'svelte/transition';
    import {accountsDb} from "$lib/db";
    import {liveQuery} from "dexie";
    import AcpAccountCard from "$lib/components/acp/AcpAccountCard.svelte";
    import LoginModal from "$lib/components/acp/LoginModal.svelte";

    let { onclose } = $props();

    let accounts = $derived(liveQuery(async () => {
        const accounts = await accountsDb.accounts.toArray();
        return accounts;
    }));

    let switchingAccount: { id: number; did: string; handle?: string; isOAuth: boolean } | null = $state(null);
    let isLoginModalOpen = $state(false);
    let loginModalIdentifier = $state('');

    function close() {
        onclose?.();
    }

    async function handleDelete(deletedId) {
        try {
            const id = await accountsDb.accounts.delete(deletedId);
            const profiles = await accountsDb.profiles.toArray();

            profiles.forEach(profile => {
                const pid = accountsDb.profiles.update(profile.id, {
                    accounts: profile.accounts.filter(account => account !== deletedId)
                });
            })
        } catch (e) {
            console.error(e);
        }
    }

    async function handleSwitchAuth(payload) {
        const { id, isOAuth } = payload;
        const account = await accountsDb.accounts.get(id);

        if (!account) return;

        switchingAccount = {
            id: id,
            did: account.did,
            handle: account.handle || account.session?.handle,
            isOAuth: isOAuth,
        };
        loginModalIdentifier = account.handle || account.session?.handle || '';
        isLoginModalOpen = true;
    }

    async function handleLoginSuccess() {
        isLoginModalOpen = false;
        switchingAccount = null;
        loginModalIdentifier = '';
    }

    function handleLoginCancel() {
        isLoginModalOpen = false;
        switchingAccount = null;
        loginModalIdentifier = '';
    }
</script>

<div class="modal" transition:fly="{{ y: 30, duration: 250 }}">
  <div class="modal-contents">
    <h2 class="modal-title">{$_('accounts_management_title')}</h2>

    {#if $accounts}
      <div class="accounts-management-list">
        {#each $accounts as account (account.id)}
          <AcpAccountCard isManagement={true} id={account.id} ondelete={handleDelete} onswitchAuth={handleSwitchAuth}></AcpAccountCard>
        {/each}
      </div>
    {/if}
  </div>

  <button class="modal-background-close" aria-hidden="true" onclick={close}></button>
</div>

{#if isLoginModalOpen}
  <LoginModal
    existingId={switchingAccount?.id}
    identifier={loginModalIdentifier}
    initialAuthMode={switchingAccount?.isOAuth ? 'password' : 'oauth'}
    lockAuthMode={true}
    onsuccess={handleLoginSuccess}
    oncancel={handleLoginCancel}
  ></LoginModal>
{/if}
