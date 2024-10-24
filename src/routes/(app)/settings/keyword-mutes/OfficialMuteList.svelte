<script lang="ts">
  import {_} from 'svelte-i18n';
  import {agent, agents} from "$lib/stores";
  import {onMount} from "svelte";
  import {createEventDispatcher} from "svelte";
  import AgentsSelector from "$lib/components/acp/AgentsSelector.svelte";
  const dispatch = createEventDispatcher();
  let words = $state([]);
  let _agent = $agent;

  async function handleAgentSelect(event) {
      _agent = event.detail.agent;
      words = await _agent.getMuteWords();
  }

  onMount(async () => {
      console.log(await $agent.getMuteWords());
      words = await _agent.getMuteWords();
  })

  function importWord(word) {
      dispatch('add', {
          word:  {
              enabled: true,
              word: word,
              period: {
                  start: '00:00',
                  end: '23:59'
              },
              ignoreCaseSensitive: false,
              regExp: false,
          }
      })
  }
</script>

{#if $agents.size > 1}
  <div class="import-word-agents-selector">
    <AgentsSelector on:select={handleAgentSelect}></AgentsSelector>
  </div>
{/if}

{#each words as word}
  <div class="import-word">
    <p class="import-word__text">{word.value}</p>
    <button class="button button--ss" onclick={() => {importWord(word.value)}}>{$_('import_word')}</button>
  </div>
{/each}

<style lang="postcss">
  .import-word-agents-selector {
      margin-bottom: 16px;
  }

  .import-word {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--border-color-2);
  }
</style>