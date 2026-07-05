<script lang="ts">
    import Unplug from '@lucide/svelte/icons/unplug';
  import {_} from "tokimeki-i18n";
  import { fly } from 'svelte/transition';
  import MissingAccountItem from "$lib/components/acp/MissingAccountItem.svelte";
  import {appState} from "$lib/classes/appState.svelte";

  function close() {
      appState.status = 0;
  }
</script>

<div class="modal" transition:fly="{{ y: 30, duration: 250 }}">
  <div class="modal-contents">
    <div class="modal-heading-icon">
      <Unplug size={48} color="var(--danger-color)" />
    </div>

    <h1 class="modal-title modal-title--smaller modal-title--center">{$_('missing_accounts_title')}</h1>

    <p class="modal-text modal-text--center">{$_('missing_accounts_description')}</p>

    {#if appState.missingAccounts.length}
      {#each appState.missingAccounts as account (account.id)}
        <MissingAccountItem {account}></MissingAccountItem>
      {/each}
    {/if}
  </div>

  {#if (appState.missingAccounts.length === 0)}
    <button class="modal-background-close" aria-hidden="true" onclick={close}></button>
  {/if}
</div>

<style lang="postcss">
  .modal {
    z-index: 1000;
  }
</style>