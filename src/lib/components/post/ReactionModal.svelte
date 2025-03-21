<script lang="ts">
  import {_} from "svelte-i18n";
  import { fly } from 'svelte/transition';
  import {onMount} from 'svelte';
  import {agent, agents} from "$lib/stores";
  import ReactionButtons from "$lib/components/post/ReactionButtons.svelte";
  import AgentsSelector from "$lib/components/acp/AgentsSelector.svelte";
  import {getAccountIdByDid} from "$lib/util";
  import { toast } from "svelte-sonner";

  let { data, onclose } = $props();
  let el = $state();
  let _agent = $state($agent);
  let currentAccount;
  let isLoading = false;

  function close() {
      el.close();
      onclose();
  }

  async function handleSelect(event) {
      isLoading = true;
      currentAccount = event.detail.id;
      _agent = $agents.get(currentAccount);

      try {
          data = await _agent.getFeed(data.post.uri);
          isLoading = false;
      } catch (e) {
          toast.error(e);
          close();
      }
  }

  onMount(() => {
      el.showModal();
  })
</script>

<dialog class="dialog-modal" transition:fly="{{ y: 30, duration: 250 }}" bind:this={el} onclose={close}>
  <div class="dialog-modal-contents dialog-modal-contents--ml">
    <div class="reaction-modal-select">
      <p class="selector-label">{$_('reaction_other_account')}</p>
      <AgentsSelector _agent={$agents.get(getAccountIdByDid($agents, _agent.did()))} on:select={handleSelect}></AgentsSelector>
    </div>

    {#key data}
      <div class="reaction-modal-buttons">
        <ReactionButtons
            {_agent}
            post={data.post}
            isModal={true}
        ></ReactionButtons>
      </div>
    {/key}

    <div class="modal-close">
      <button class="button button--sm" onclick={close}>{$_('close_button')}</button>
    </div>
  </div>

  <button class="modal-background-close" aria-hidden="true" onclick={close}></button>
</dialog>

<style lang="postcss">
  .dialog-modal-contents {
      width: 360px;
      max-width: 100%;
  }

  .reaction-modal-select {
      margin: 0 0 24px;
  }
</style>