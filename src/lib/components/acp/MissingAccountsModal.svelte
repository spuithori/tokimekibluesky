<script lang="ts">
  import {_} from "svelte-i18n";
  import { fade, fly } from 'svelte/transition';
  import {missingAccounts, profileStatus} from "$lib/stores";
  import MissingAccountItem from "$lib/components/acp/MissingAccountItem.svelte";

  export let status;

  function close() {
      profileStatus.set(0);
  }
</script>

<div class="modal" transition:fly="{{ y: 30, duration: 250 }}">
  <div class="modal-contents">
    <div class="modal-heading-icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-unplug"><path d="m19 5 3-3"/><path d="m2 22 3-3"/><path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"/><path d="M7.5 13.5 10 11"/><path d="M10.5 16.5 13 14"/><path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"/></svg>
    </div>

    <h1 class="modal-title modal-title--smaller modal-title--center">{$_('missing_accounts_title')}</h1>

    <p class="modal-text modal-text--center">{$_('missing_accounts_description')}</p>

    {#if $missingAccounts.length}
      {#each $missingAccounts as account (account.id)}
        <MissingAccountItem {account}></MissingAccountItem>
      {/each}
    {/if}
  </div>

  {#if ($missingAccounts.length === 0)}
    <button class="modal-background-close" aria-hidden="true" on:click={close}></button>
  {/if}
</div>