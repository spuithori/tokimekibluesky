<script lang="ts">
  import {_} from 'svelte-i18n';
  import {agent} from "$lib/stores";
  import OfficialLabelerList from "./OfficialLabelerList.svelte";
  import LabelerItem from "$lib/components/labeler/LabelerItem.svelte";
  import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";
  import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
  import {appState} from "$lib/classes/appState.svelte";

  let labelers = $state([]);
  let ready = $state(false);

  async function loadLabelers(subscribedLabelers) {
    if (subscribedLabelers.length) {
      const res = await $agent.agent.getLabelers({dids: subscribedLabelers, detailed: true});
      labelers = res.data.views;
    }

    ready = true;
  }

  loadLabelers(appState.subscribedLabelers.current);
</script>

<svelte:head>
  <title>{$_('settings_labeler')} - TOKIMEKI</title>
</svelte:head>

<div>
  <SettingsHeader>
    {$_('settings_labeler')}
  </SettingsHeader>

  <div class="settings-wrap">
    <p class="settings-description">{$_('labeler_description')}</p>

    {#if (ready)}
      {#each labelers as labeler}
        <LabelerItem labeler={labeler}></LabelerItem>
      {/each}
    {:else}
      <div class="thread-loading">
        <LoadingSpinner></LoadingSpinner>
      </div>
    {/if}

    <div class="import-labeler-wrap">
      <h3 class="import-labeler-wrap__title">{$_('import_labeler')}</h3>

      <OfficialLabelerList></OfficialLabelerList>
    </div>
  </div>
</div>

<style lang="postcss">
  .import-labeler-wrap {
      background-color: var(--bg-color-3);
      padding: 16px;
      border-radius: var(--border-radius-3);

      &__title {
          font-size: 16px;
          margin-bottom: 8px;
      }
  }
</style>