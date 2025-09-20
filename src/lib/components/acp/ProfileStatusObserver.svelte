<script lang="ts">
  import ProfileStatusModal from "$lib/components/acp/ProfileStatusModal.svelte";
  import MissingAccountsModal from "$lib/components/acp/MissingAccountsModal.svelte";
  import MissingProfileModal from "$lib/components/acp/MissingProfileModal.svelte";
  import MissingPrimaryModal from "$lib/components/acp/MissingPrimaryModal.svelte";
  import {appState} from "$lib/classes/appState.svelte";

  $effect(() => {
      if (appState.missingAccounts.length) {
        appState.status = 3;
      }
  })
</script>

{#if (appState.status === 1 || appState.status === 2)}
  <ProfileStatusModal status={appState.status}></ProfileStatusModal>
{/if}

{#if (appState.status === 3)}
  <MissingAccountsModal></MissingAccountsModal>
{/if}

{#if (appState.status === 4)}
  <MissingProfileModal></MissingProfileModal>
{/if}

{#if (appState.status === 5)}
  <MissingPrimaryModal></MissingPrimaryModal>
{/if}