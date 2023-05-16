<script lang="ts">
    import {_} from 'svelte-i18n';
    import {agent, settings} from '$lib/stores';
    import {onMount} from "svelte";
    import UserItem from "../../profile/[handle]/UserItem.svelte";
    let codes = [];
    let activeCodes = 0;

    onMount(async () => {
        const res = await $agent.agent.api.com.atproto.server.getAccountInviteCodes();
        codes = res.data.codes;

        activeCodes = codes.filter(code => !code.uses.length)?.length || 0;
    })

    async function getProfile(did) {
        const res = await $agent.agent.api.app.bsky.actor.getProfile({actor: did})
        return res.data
    }
</script>

<svelte:head>
  <title>Invite codes - TOKIMEKI Bluesky</title>
</svelte:head>

<div>
  <div class="settings-heading">
    <a href="/settings" class="settings-back"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="16.97" viewBox="0 0 20 16.97">
      <path id="arrow-left" d="M3.828,9,9.9,2.929,8.485,1.515,0,10l.707.707,7.778,7.778L9.9,17.071,3.828,11H20V9Z" transform="translate(0 -1.515)" fill="var(--text-color-1)"/>
    </svg></a>

    <h1 class="settings-title">{$_('settings_invite_codes')}</h1>
  </div>

  <div class="settings-wrap">
    <p class="active-codes">{$_('active_codes')}: {activeCodes}</p>

    <div class="invite-codes">
      {#each codes as code}
        <article class="invite-codes__item">
          {#if (!code.uses.length)}
            <h2 class="invite-codes__code">{code.code}</h2>
          {:else}
            <h2 class="invite-codes__code"><del>{code.code}</del></h2>

            {#await getProfile(code.uses[0].usedBy)}
            {:then user}
              <div class="invite-codes-user">
                <UserItem user={user}></UserItem>
              </div>
            {/await}
          {/if}
        </article>
      {/each}
    </div>
  </div>
</div>

<style lang="postcss">
  .invite-codes {
      list-style: none;

      &__item {
          background-color: var(--bg-color-2);
          border-radius: 6px;
          margin-bottom: 10px;
          padding: 10px;
      }

      &__code {
          font-size: 16px;
      }
  }

  .active-codes {
      margin-bottom: 20px;
      font-size: 18px;
      font-weight: bold;
  }
</style>