<script lang="ts">
  import { run } from 'svelte/legacy';

    import {agent, agents, labelDefs, labelerSettings, subscribedLabelers} from "$lib/stores";
  import { m } from "$lib/paraglide/messages.js";

  interface Props {
    did: any;
    size?: string;
  }

  let { did, size = 'sm' }: Props = $props();


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
  let subscribed = $derived($subscribedLabelers.includes(did));
  run(() => {
    applyLabelDefs($subscribedLabelers);
  });
</script>

{#if (did !== 'did:plc:ar7c4by46qjdydhdevvrndac')}
  {#if (subscribed)}
    <button class="button button--{size} button--following" onclick={unsubscribe} data-unfollow-name="{m.label_unsubscribe()}">{m.label_unsubscribe()}</button>
  {:else}
    <button class="button button--{size} button--follow" onclick={subscribe}>{m.label_subscribe()}</button>
  {/if}
{/if}