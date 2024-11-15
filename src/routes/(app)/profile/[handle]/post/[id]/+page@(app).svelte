<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { page } from '$app/stores';
    import { agent, agents, junkAgentDid } from "$lib/stores";
    import PageModal from "$lib/components/ui/PageModal.svelte";
    import ThreadView from "./ThreadView.svelte";
    import AvatarAgentsSelector from "$lib/components/acp/AvatarAgentsSelector.svelte";
    import {getAccountIdByDid} from "$lib/util";

    let handle = $derived($page.params.handle);
    let id = $derived($page.params.id);
    let _agent = $state($junkAgentDid ? $agents.get(getAccountIdByDid($agents, $junkAgentDid)) : $agent);
</script>

<PageModal isVirtual={true}>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" onclick={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <div class="column-heading__selector">
      <AvatarAgentsSelector
          bind:_agent
          onselect={() => {}}
      ></AvatarAgentsSelector>
    </div>

    <h2 class="column-heading__title">{$_('title_thread')}</h2>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  {#if handle}
    {#key $page.params.id}
      <ThreadView id={$page.params.id} handle={$page.params.handle} {_agent}></ThreadView>
    {/key}
  {/if}
</PageModal>
