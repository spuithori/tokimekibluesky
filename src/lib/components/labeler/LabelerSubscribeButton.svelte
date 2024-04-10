<script lang="ts">
    import {agent, agents, labelDefs, labelerSettings, subscribedLabelers} from "$lib/stores";
  import {_} from "svelte-i18n";

  export let did;
  export let size = 'sm';

  $: subscribed = $subscribedLabelers.includes(did);
  $: applyLabelDefs($subscribedLabelers);

  function subscribe() {
      $subscribedLabelers = [...$subscribedLabelers, did];
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
      $subscribedLabelers = $subscribedLabelers.filter(labeler => labeler !== did);
      applyLabeler();
  }

  function applyLabeler() {
      localStorage.setItem('subscribedLabelers', JSON.stringify($subscribedLabelers));

      $agents.forEach(_agent => {
          _agent.agent.configureLabelersHeader($subscribedLabelers);
      })
  }

    async function applyLabelDefs(subscribedLabelers) {
        labelDefs.set(await $agent.agent.getLabelDefinitions(subscribedLabelers));
        localStorage.setItem('labelDefs', JSON.stringify($labelDefs));
    }
</script>

{#if (did !== 'did:plc:ar7c4by46qjdydhdevvrndac')}
  {#if (subscribed)}
    <button class="button button--{size} button--following" on:click={unsubscribe} data-unfollow-name="{$_('label_unsubscribe')}">{$_('label_unsubscribe')}</button>
  {:else}
    <button class="button button--{size} button--follow" on:click={subscribe}>{$_('label_subscribe')}</button>
  {/if}
{/if}