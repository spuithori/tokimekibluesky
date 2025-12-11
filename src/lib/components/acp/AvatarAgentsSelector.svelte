<script lang="ts">
  import { fly } from 'svelte/transition';
  import {agents} from "$lib/stores";
  import { clickOutside } from '$lib/clickOutSide';
  import {accountsDb} from '$lib/db';
  import {getAccountIdByDid} from "$lib/util";
  import AvatarAgentsSelectorModalItem from "$lib/components/acp/AvatarAgentsSelectorModalItem.svelte";
  import type {Agent} from "$lib/agent";

  interface Props {
    _agent?: any;
    isDisabled?: boolean;
    style?: string;
  }

  let { _agent, isDisabled = false, onselect }: Props = $props();
  let isOpen = $state(false);
  let avatar = $state();

  $effect(() => {
      selectAgent(_agent);
  });

  function selectAgent(agent: Agent) {
      accountsDb.accounts.get(getAccountIdByDid($agents, agent.did()))
          .then(res => {
              avatar = res.avatar;

              if (!avatar) {
                  agent.getAvatar(agent.did())
                      .then(_res => {
                          avatar = _res;
                      });
              }
          });
      isOpen = false;
  }
</script>

{#if _agent}
  <div class="avatar-agents-selector-wrap" class:agents-selector-wrap--open={isOpen} aria-disabled={isDisabled}>
    <div class="avatar-agents-selector-current">
      <button class="avatar-agents-selector-avatar" onclick={() => {isOpen = !isOpen}}>
        {#if (avatar)}
          <img loading="lazy" src={avatar} alt="">
        {/if}
      </button>
    </div>

    {#if (isOpen)}
      <div class="avatar-agents-selector-modal"
           tabindex="-1"
           use:clickOutside={{ignoreElement: '.avatar-agents-selector-avatar'}}
           onoutclick={() => (isOpen = false)}
           transition:fly={{ y: 30, duration: 250 }}
      >
        {#each $agents as [key, agent]}
          {#if (agent.did())}
            <AvatarAgentsSelectorModalItem
              {agent}
              {key}
              isCurrent={agent.handle() === _agent.handle()}
              onselect={() => {onselect(agent)}}
            ></AvatarAgentsSelectorModalItem>
          {/if}
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style lang="postcss">
  .avatar-agents-selector-wrap {
      position: relative;
  }

  .avatar-agents-selector-avatar {
      aspect-ratio: 1 / 1;
      overflow: hidden;
      border-radius: 50%;
      background-color: var(--primary-color);
      width: 100%;

      img {
          width: 100%;
          height: auto;
      }
  }

  .avatar-agents-selector-modal {
      position: absolute;
      left: 0;
      top: calc(100% + 10px);
      z-index: 101;
      background-color: var(--bg-color-1);
      border-radius: var(--border-radius-3);
      box-shadow: 0 0 8px var(--box-shadow-color-1);
      padding: 8px;
      min-width: 200px;
  }
</style>