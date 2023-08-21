<script>
    import { agent } from '$lib/stores';
    import {liveQuery} from "dexie";
    import {accountsDb} from "$lib/db";

    $: account = liveQuery(async () => {
        const account = await accountsDb.accounts
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
        <img src="{$account.avatar}" alt="">
      </a>
    {:else}
      <span class="empty-avatar"></span>
    {/if}
  </div>
{/if}

<style lang="postcss">
  .my-profile-badge {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      overflow: hidden;

      @media (max-width: 767px) {
          width: 38px;
          height: 38px;
      }
  }

  .my-profile-badge img  {
      background-color: var(--primary-color);
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
  }

  .empty-avatar {
      background-color: var(--primary-color);
      width: 100%;
      height: 100%;
  }
</style>