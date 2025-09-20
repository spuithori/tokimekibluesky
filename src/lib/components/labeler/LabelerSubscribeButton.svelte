<script lang="ts">
  import {agent, agents, labelerSettings} from "$lib/stores";
  import {_} from "svelte-i18n";
  import {appState} from "$lib/classes/appState.svelte";

  interface Props {
    did: any;
    size?: string;
  }

  let { did, size = 'sm' }: Props = $props();


  function subscribe() {
      appState.subscribedLabelers.current = [...appState.subscribedLabelers.current, did];
      applyLabeler();

      if (!$labelerSettings.find(labelers => labelers.did === did)) {
          $labelerSettings = [
              ...$labelerSettings,
              {
                  did: did,
                  labels: {},
              }
          ]
      }
      localStorage.setItem('labelerSettings', JSON.stringify($labelerSettings));
  }

  function unsubscribe() {
      appState.subscribedLabelers.current = appState.subscribedLabelers.current.filter(labeler => labeler !== did);
      applyLabeler();
  }

  function applyLabeler() {
      $agents.forEach(_agent => {
          _agent.agent.configureLabelersHeader(appState.subscribedLabelers.current);
      })
  }

  async function applyLabelDefs(subscribedLabelers) {
      appState.labelDefs.current = await $agent.agent.getLabelDefinitions(subscribedLabelers);
  }

  let subscribed = $derived(appState.subscribedLabelers.current.includes(did));

  $effect(() => {
    applyLabelDefs(appState.subscribedLabelers.current);
  });
</script>

{#if (did !== 'did:plc:ar7c4by46qjdydhdevvrndac')}
  {#if (subscribed)}
    <button class="button button--{size} button--following" onclick={unsubscribe} data-unfollow-name="{$_('label_unsubscribe')}">{$_('label_unsubscribe')}</button>
  {:else}
    <button class="button button--{size} button--follow" onclick={subscribe}>{$_('label_subscribe')}</button>
  {/if}
{/if}