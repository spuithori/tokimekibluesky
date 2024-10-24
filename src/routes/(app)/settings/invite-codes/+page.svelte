<script lang="ts">
    import {_} from 'svelte-i18n';
    import {agent, settings} from '$lib/stores';
    import {onMount} from "svelte";
    import UserItem from "../../profile/[handle]/UserItem.svelte";
    let codes = $state([]);
    let activeCodes = $state(0);

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
  <title>{$_('settings_invite_codes')} - TOKIMEKI</title>
</svelte:head>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" onclick={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <h1 class="column-heading__title">{$_('settings_invite_codes')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  <div class="settings-wrap">
    <p class="active-codes">{$_('active_codes')}: {activeCodes}</p>
    <p>APIの仕様変更により、招待コードの一覧はアプリパスワードでログインしている場合は取得できなくなりました。<br>Due to API specification changes, the list of invitation codes can no longer be retrieved when logged in with the app password.</p>

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