<script lang="ts">
    import {agent, agents} from "$lib/stores";
    import {createEventDispatcher} from "svelte";
    const dispatch = createEventDispatcher();

    export let _agent = $agent;
    export let isDisabled = false;
    let isOpen = false;

    console.log(_agent)

    function selectAgent(key, agent) {
        _agent = agent;

        dispatch('select', {
            id: key,
            agent: _agent,
        });

        isOpen = false;
    }
</script>

<div class="agents-selector-wrap" class:agents-selector-wrap--open={isOpen} aria-disabled={isDisabled}>
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-down agents-selector-wrap-arrow"><path d="m6 9 6 6 6-6"/></svg>

  <div class="agents-selector">
    <button class="agents-selector__item agents-selector__item--front" on:click={() => {isOpen = !isOpen}}>
      <span class="agents-selector__title">@{_agent.agent.session.handle}</span>
    </button>

    {#each $agents as [key, agent]}
      {#if (agent.agent.session.handle !== _agent.agent.session.handle)}
        <button class="agents-selector__item" on:click={() => {selectAgent(key, agent)}}>
          <span class="agents-selector__title">@{agent.agent.session.handle}</span>
        </button>
      {/if}
    {/each}
  </div>
</div>

<style lang="postcss">
    .agents-selector-wrap {
        height: 50px;
        position: relative;
        overflow: hidden;
        cursor: pointer;
        border-radius: 4px;
        background-color: var(--bg-color-1);
        border-bottom: 1px solid var(--border-color-1);
        color: var(--text-color-1);
        z-index: 20;

        &--open {
            overflow: visible;
        }

        &[aria-disabled='true'] {
            pointer-events: none;
            opacity: .5;
        }
    }

    .agents-selector-wrap-arrow {
        position: absolute;
        top: 0;
        bottom: 0;
        margin: auto;
        right: 20px;
        pointer-events: none;
        z-index: 1;
    }

    .agents-selector {
        position: absolute;
        left: 0;
        right: 0;
        top: 0;
        border: 1px solid var(--border-color-1);
        border-radius: 4px;

        &__item {
            height: 50px;
            width: 100%;
            padding: 0 20px;
            display: flex;
            justify-content: center;
            flex-direction: column;
            background-color: var(--bg-color-1);
            border-top: 1px solid var(--border-color-1);

            &:hover {
                background-color: var(--bg-color-2);
            }

            &--front {
                border-top: none;
            }
        }

        &__title {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 5px;
        }
    }
</style>