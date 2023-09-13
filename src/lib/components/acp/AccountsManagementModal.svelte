<script lang="ts">
    import {_} from "svelte-i18n";
    import { fade, fly } from 'svelte/transition';
    import {db} from "$lib/db";
    import {createEventDispatcher} from "svelte";
    import {liveQuery} from "dexie";
    import AcpAccountCard from "$lib/components/acp/AcpAccountCard.svelte";
    const dispatch = createEventDispatcher();

    $: accounts = liveQuery(async () => {
        const accounts = await db.accounts.toArray();
        return accounts;
    });

    function close() {
        dispatch('close');
    }

    async function handleDelete(event) {
        try {
            const id = await db.accounts.delete(event.detail.id);
            const profiles = await db.profiles.toArray();

            profiles.forEach(profile => {
                const pid = db.profiles.update(profile.id, {
                    accounts: profile.accounts.filter(account => account !== event.detail.id)
                });
            })
        } catch (e) {
            console.error(e);
        }
    }
</script>

<div class="modal" transition:fly="{{ y: 30, duration: 250 }}">
  <div class="modal-contents">
    <h2 class="modal-title">{$_('accounts_management_title')}</h2>

    {#if $accounts}
      <div class="accounts-management-list">
        {#each $accounts as account (account.id)}
          <AcpAccountCard isManagement={true} id={account.id} did={account.did} on:delete={handleDelete}></AcpAccountCard>
        {/each}
      </div>
    {/if}
  </div>

  <button class="modal-background-close" aria-hidden="true" on:click={close}></button>
</div>

<style lang="postcss">

</style>