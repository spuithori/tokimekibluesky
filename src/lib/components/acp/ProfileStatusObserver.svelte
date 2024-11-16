<script lang="ts">
  import {missingAccounts, profileStatus} from '$lib/stores';
  import ProfileStatusModal from "$lib/components/acp/ProfileStatusModal.svelte";
  import MissingAccountsModal from "$lib/components/acp/MissingAccountsModal.svelte";
  import MissingProfileModal from "$lib/components/acp/MissingProfileModal.svelte";
  import MissingPrimaryModal from "$lib/components/acp/MissingPrimaryModal.svelte";

  $effect(() => {
      if ($missingAccounts.length) {
          profileStatus.set(3);
      }
  })
</script>

{#if ($profileStatus === 1 || $profileStatus === 2)}
  <ProfileStatusModal status={$profileStatus}></ProfileStatusModal>
{/if}

{#if ($profileStatus === 3)}
  <MissingAccountsModal status={$profileStatus}></MissingAccountsModal>
{/if}

{#if ($profileStatus === 4)}
  <MissingProfileModal status={$profileStatus}></MissingProfileModal>
{/if}

{#if ($profileStatus === 5)}
  <MissingPrimaryModal status={$profileStatus}></MissingPrimaryModal>
{/if}