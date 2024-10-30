<script lang="ts">
  import { offset, flip, shift } from 'svelte-floating-ui/dom';
  import { createFloatingActions } from 'svelte-floating-ui';
  import { fly } from 'svelte/transition';
  import {agent, agents} from "$lib/stores";
  import {createEventDispatcher} from "svelte";
  import { clickOutside } from '$lib/clickOutSide';
  import {accountsDb} from '$lib/db';
  import {getAccountIdByDid} from "$lib/util";
  import AvatarAgentsSelectorModalItem from "$lib/components/acp/AvatarAgentsSelectorModalItem.svelte";
  import type {Agent} from "$lib/agent";
  const dispatch = createEventDispatcher();

  interface Props {
    _agent?: any;
    isDisabled?: boolean;
    style?: string;
  }

  let { _agent = $bindable($agent), isDisabled = false, style = 'default' }: Props = $props();
  let isOpen = $state(false);
  let avatar = $state();

  const [ floatingRef, floatingContent ] = createFloatingActions({
      strategy: 'absolute',
      placement: 'bottom-start',
      middleware: [
          offset(10),
          flip(),
          shift(),
      ]
  });

  $effect.pre(() => {
      selectAgent(_agent);
  })

  function selectAgent(agent: Agent) {
      dispatch('select', {
          agent: agent,
      });

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
    <div class="avatar-agents-selector-current" use:floatingRef>
      <button class="avatar-agents-selector-avatar" onclick={() => {isOpen = !isOpen}}>
        {#if (avatar)}
          <img src="{avatar}" alt="">
        {/if}
      </button>
    </div>

    {#if (isOpen)}
      <div class="avatar-agents-selector-modal"
           tabindex="-1"
           use:clickOutside={{ignoreElement: '.avatar-agents-selector-avatar'}}
           onoutclick={() => (isOpen = false)}
           transition:fly="{{ y: 30, duration: 250 }}"
           use:floatingContent
      >
        {#each $agents as [key, agent]}
          {#if (agent.agent?.session)}
            <AvatarAgentsSelectorModalItem
              {agent}
              {key}
              isCurrent={agent.agent.session.handle === _agent.agent.session.handle}
              onselect={() => {_agent = agent}}
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
      z-index: 100;
      background-color: var(--bg-color-1);
      border-radius: var(--border-radius-3);
      box-shadow: 0 0 8px var(--box-shadow-color-1);
      padding: 8px;
      min-width: 200px;
  }
</style>