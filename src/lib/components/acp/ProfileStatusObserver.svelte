<script lang="ts">
    import {missingAccounts, profileStatus} from '$lib/stores';
  import { liveQuery } from 'dexie';
  import { accountsDb } from '$lib/db';
  import ProfileStatusModal from "$lib/components/acp/ProfileStatusModal.svelte";
    import MissingAccountsModal from "$lib/components/acp/MissingAccountsModal.svelte";

  $: profile = liveQuery(async () => {
      const profile = await accountsDb.profiles.get(Number(localStorage.getItem('currentProfile')));
      return profile;
  });

  $: {
      if ($profile) {
          if (!$profile.accounts.length) {
              profileStatus.set(1);
          } else {
              profileStatus.set(0);
          }
      }

      if ($missingAccounts.length) {
          profileStatus.set(3);
      }
  }
</script>

{#if ($profileStatus === 1 || $profileStatus === 2)}
  <ProfileStatusModal status={$profileStatus} profile={$profile}></ProfileStatusModal>
{/if}

{#if ($profileStatus === 3)}
  <MissingAccountsModal status={$profileStatus}></MissingAccountsModal>
{/if}