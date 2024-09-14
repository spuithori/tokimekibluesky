<script lang="ts">
    import {labelerSettings, agent, subscribedLabelers, labelDefs, settings} from '$lib/stores';
  import {onMount} from "svelte";
  import {_} from "svelte-i18n";
  import LabelSelector from "$lib/components/labeler/LabelSelector.svelte";

  export let did;
  export let isOfficial = false;
  let defs = [];
  let labels = [];
  let renderLabels = {};
  let ready = false;

  $: changeLabel(renderLabels);

  onMount(async () => {
      const res = await $agent.agent.getLabelDefinitions([did]);
      defs = res[did];
      const saved = $labelerSettings.find(labeler => labeler.did === did);

      labels = defs.map(label => [label.identifier, saved?.labels?.[label.identifier] ? saved.labels[label.identifier] : label.defaultSetting]);
      renderLabels = Object.fromEntries(labels);
  });

  function applyLabelSettings() {
      if (!ready) {
          ready = true;
          return false;
      }

      if (!$subscribedLabelers.includes(did)) {
          return false;
      }

      if (Object.keys(renderLabels).length === 0) {
          renderLabels = {};
      }

      const labelIndex = $labelerSettings.findIndex(labeler => labeler.did === did);

      if (labelIndex !== -1) {
          Object.assign($labelerSettings[labelIndex], {
              did: did,
              labels: renderLabels,
          })
      } else {
          $labelerSettings = [
              ...$labelerSettings,
              {
                  did: did,
                  labels: renderLabels,
              }
          ]
      }

      localStorage.setItem('labelerSettings', JSON.stringify($labelerSettings));
  }

  function changeLabel(renderLabels) {
      applyLabelSettings();
  }
</script>

{#each labels as label, index}
  <div class="moderation-settings-group">
    <h3 class="moderation-settings-group__title">
      {#if (isOfficial)}
        {$_('labeling_' + label[0])}
      {:else}
      {defs[index].locales.find(locale => locale.lang === $settings.general.userLanguage)?.name ?? defs[index].locales[0]?.name}
      {/if}
    </h3>

    <p class="moderation-settings-group__text">{defs[index].locales.find(locale => locale.lang === $settings.general.userLanguage)?.description ?? defs[index].locales[0]?.description}</p>

    {#if ($subscribedLabelers.includes(did))}
      <div class="moderation-settings-group__content">
        <LabelSelector
          name={did + '_' + label[0]}
          bind:value={renderLabels[label[0]]}
        ></LabelSelector>
      </div>
    {/if}
  </div>
{/each}