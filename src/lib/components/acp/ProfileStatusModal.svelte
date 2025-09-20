<script lang="ts">
  import {_} from "svelte-i18n";
  import { fly } from 'svelte/transition';
  import AcpAccountSelector from "$lib/components/acp/AcpAccountSelector.svelte";
  import {accountsDb} from "$lib/db";
  import {agent, agents} from "$lib/stores";
  import {modifyAgents} from "$lib/modifyAgents";
  import {appState} from "$lib/classes/appState.svelte";

  interface Props {
    status?: number;
  }

  let { status = 0 }: Props = $props();
  let profile = $state();

  accountsDb.profiles.get(appState.profile.current)
    .then(value => {
        profile = value;
    });

  async function handleSuccess(event) {
      try {
          const _accounts = [...profile.accounts, event.detail.id]
          const id = await accountsDb.profiles.update(profile.id, {
              accounts: _accounts,
              primary: event.detail.id
          });

          $agents = await modifyAgents(_accounts);
          agent.set($agents.get(event.detail.id));
          appState.status = 0;
          appState.init();
      } catch (e) {
          console.error(e);
      }
  }
</script>

{#if profile}
  <div class="modal" transition:fly="{{ y: 30, duration: 250 }}">
    <div class="modal-contents">
      <div class="modal-heading-icon">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--danger-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-unplug"><path d="m19 5 3-3"/><path d="m2 22 3-3"/><path d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"/><path d="M7.5 13.5 10 11"/><path d="M10.5 16.5 13 14"/><path d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"/></svg>
      </div>

      <h1 class="modal-title modal-title--smaller modal-title--center">{$_('no_account_in_profile')}</h1>

      <p class="modal-text modal-text--center">{$_('no_account_in_profile_description')}</p>

      <div class="acp-select-account-wrap">
        <AcpAccountSelector exclude={profile.accounts || []} on:success={handleSuccess}></AcpAccountSelector>
      </div>
    </div>

    {#if (status === 0)}
      <button class="modal-background-close" aria-hidden="true" onclick={close}></button>
    {/if}
  </div>
{/if}


<style lang="postcss">

</style>