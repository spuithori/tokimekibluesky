<script lang="ts">
    import Unplug from '@lucide/svelte/icons/unplug';
  import {_} from "tokimeki-i18n";
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
        <Unplug size={48} color="var(--danger-color)" />
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