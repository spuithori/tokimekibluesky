<script lang="ts">
    import { offset, flip, shift } from 'svelte-floating-ui/dom';
    import { createFloatingActions } from 'svelte-floating-ui';
    import { fly } from 'svelte/transition';
    import { liveQuery } from "dexie";
    import {agent, agents} from "$lib/stores";
    import {createEventDispatcher} from "svelte";
    import { clickOutside } from '$lib/clickOutSide';
    import {accountsDb} from '$lib/db';
    import {getAccountIdByDid} from "$lib/util";
    import AvatarAgentsSelectorModalItem from "$lib/components/acp/AvatarAgentsSelectorModalItem.svelte";
    const dispatch = createEventDispatcher();

    export let _agent = $agent;
    export let isDisabled = false;
    export let style = 'default';
    let isOpen = false;

    const [ floatingRef, floatingContent ] = createFloatingActions({
        strategy: 'absolute',
        placement: 'bottom-start',
        middleware: [
            offset(10),
            flip(),
            shift(),
        ]
    });

    $: avatar = liveQuery(async () => {
        const account = await accountsDb.accounts.get(getAccountIdByDid($agents, _agent.did()));
        return account.avatar;
    })

    async function selectAgent(key, agent) {
        _agent = agent;

        dispatch('select', {
            id: key,
            agent: _agent,
        });

        isOpen = false;
    }
</script>

{#if _agent}
  <div class="avatar-agents-selector-wrap" class:agents-selector-wrap--open={isOpen} aria-disabled={isDisabled}>
    <div class="avatar-agents-selector-current" use:floatingRef>
      <button class="avatar-agents-selector-avatar" on:click={() => {isOpen = !isOpen}}>
        {#if ($avatar)}
          <img src="{$avatar}" alt="">
        {/if}
      </button>
    </div>

    {#if (isOpen)}
      <div class="avatar-agents-selector-modal"
           tabindex="-1"
           use:clickOutside={{ignoreElement: '.avatar-agents-selector-avatar'}}
           on:outclick={() => (isOpen = false)}
           transition:fly="{{ y: 30, duration: 250 }}"
           use:floatingContent
      >
        {#each $agents as [key, agent]}
          {#if (agent.agent?.session)}
            <AvatarAgentsSelectorModalItem
              agent={agent}
              key={key}
              isCurrent={agent.agent.session.handle === _agent.agent.session.handle}
              on:select={() => {selectAgent(key, agent)}}
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