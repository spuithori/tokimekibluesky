<script>
    import { agent } from '$lib/stores';
    import {liveQuery} from "dexie";
    import {db} from "$lib/db";

    $: account = liveQuery(async () => {
        const account = await db.accounts
            .where('did')
            .equals($agent.did())
            .first();
        return account;
    })
</script>

{#if $account}
  <div class="my-profile-badge">
    {#if $account.session?.handle}
      <a href="/profile/{$account.session.handle}">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user-2"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>
      </a>
    {:else}
      <span class="empty-avatar"></span>
    {/if}
  </div>
{/if}