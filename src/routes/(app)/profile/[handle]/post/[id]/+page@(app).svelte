<script lang="ts">
    import ArrowLeft from '@lucide/svelte/icons/arrow-left';
    import X from '@lucide/svelte/icons/x';
    import { _ } from 'tokimeki-i18n';
    import { page } from '$app/stores';
    import { goto } from '$app/navigation';
    import { agent, agents, junkAgentDid } from "$lib/stores";
    import PageModal from "$lib/components/ui/PageModal.svelte";
    import ThreadView from "./ThreadView.svelte";
    import AvatarAgentsSelector from "$lib/components/acp/AvatarAgentsSelector.svelte";
    import {getAccountIdByDid} from "$lib/util";

    let handle = $derived($page.params.handle);
    let id = $derived($page.params.id);
    let _agent = $state($junkAgentDid ? $agents.get(getAccountIdByDid($agents, $junkAgentDid)) : $agent);

    function handleClose() {
        goto('/', { noScroll: true });
    }
</script>

<PageModal isVirtual={true}>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" onclick={() => {history.back()}} aria-label="Back">
        <ArrowLeft color="var(--text-color-1)" />
      </button>
    </div>

    <div class="column-heading__selector">
      <AvatarAgentsSelector
          {_agent}
          onselect={(agent) => {_agent = agent}}
      ></AvatarAgentsSelector>
    </div>

    <h2 class="column-heading__title">{$_('title_thread')}</h2>

    <div class="column-heading__buttons column-heading__buttons--right">
      <button class="settings-back" onclick={handleClose} aria-label="Close">
        <X color="var(--text-color-1)" />
      </button>
    </div>
  </div>

  {#if handle}
    {#key $page.params.id}
      <ThreadView id={$page.params.id} handle={$page.params.handle} {_agent}></ThreadView>
    {/key}
  {/if}
</PageModal>
