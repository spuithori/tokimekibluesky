<script lang="ts">
  import { run } from 'svelte/legacy';

    import {_} from 'svelte-i18n';
    import {agent, subscribedLabelers} from "$lib/stores";
    import OfficialLabelerList from "./OfficialLabelerList.svelte";
    import LabelerItem from "$lib/components/labeler/LabelerItem.svelte";
    import LoadingSpinner from "$lib/components/ui/LoadingSpinner.svelte";

    let labelers = $state([]);
    let ready = $state(false);


    async function loadLabelers(subscribedLabelers) {
        if (subscribedLabelers.length) {
            const res = await $agent.agent.getLabelers({dids: subscribedLabelers, detailed: true});
            labelers = res.data.views;
        }

        ready = true;
    }
    run(() => {
    loadLabelers($subscribedLabelers);
  });
</script>

<svelte:head>
  <title>{$_('settings_labeler')} - TOKIMEKI</title>
</svelte:head>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" onclick={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <h1 class="column-heading__title">{$_('settings_labeler')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

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