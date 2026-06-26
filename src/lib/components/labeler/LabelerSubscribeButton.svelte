<script lang="ts">
  import {agent, agents} from "$lib/stores";
  import {settingsStore} from "$lib/settings/settings.svelte";
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

      if (!settingsStore.moderation.labelers.find(labeler => labeler.did === did)) {
          settingsStore.moderation.labelers = [
              ...settingsStore.moderation.labelers,
              {
                  did: did,
                  labels: {},
              }
          ];
      }
  }

  function unsubscribe() {
      appState.subscribedLabelers.current = appState.subscribedLabelers.current.filter(labeler => labeler !== did);
      applyLabeler();
  }

  function applyLabeler() {
      $agents.forEach(_agent => {
          _agent.configureLabelers(appState.subscribedLabelers.current);
      })
  }

  async function applyLabelDefs(subscribedLabelers) {
      appState.labelDefs.current = await $agent.getLabelDefinitions(subscribedLabelers);
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