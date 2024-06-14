<script lang="ts">
    import {_} from 'svelte-i18n';
    import {settings, subscribedLabelers} from '$lib/stores';
    import LabelSelector from "$lib/components/labeler/LabelSelector.svelte";
    import LabelerLabelList from "$lib/components/labeler/LabelerLabelList.svelte";

    type contentLabelsSelect = 'hide' | 'warn' | 'ignore';
    type contentLabels = {
        gore: contentLabelsSelect,
        hate: contentLabelsSelect,
        impersonation: contentLabelsSelect,
        nsfw: contentLabelsSelect,
        nudity: contentLabelsSelect,
        spam: contentLabelsSelect,
        suggestive: contentLabelsSelect,
    }

    const officialLabelerDid = 'did:plc:ar7c4by46qjdydhdevvrndac';

    let labels: contentLabels = $settings.moderation.contentLabels || {
        gore: 'warn',
        hate: 'warn',
        impersonation: 'warn',
        nsfw: 'warn',
        nudity: 'warn',
        spam: 'warn',
        suggestive: 'warn',
    };

    $: {
        let labelsAlt = new Map();
        labelsAlt.set('nsfw', ['porn']);
        labelsAlt.set('suggestive', ['sexual']);
        labelsAlt.set('gore', ['graphic-media']);

        labelsAlt.forEach((value, key) => {
            value.forEach(item => {
                labels[item] = labels[key];
            })
        });

        $settings.moderation.contentLabels = labels;
    }
</script>

<svelte:head>
  <title>{$_('settings_moderation')} - TOKIMEKI</title>
</svelte:head>

<div>
  <div class="column-heading">
    <div class="column-heading__buttons">
      <button class="settings-back" on:click={() => {history.back()}}>
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
      </button>
    </div>

    <h1 class="column-heading__title">{$_('settings_moderation')}</h1>

    <div class="column-heading__buttons column-heading__buttons--right">
      <a class="settings-back" href="/">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--text-color-1)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
      </a>
    </div>
  </div>

  <div class="settings-wrap">
    <div class="settings-child-nav">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle-off"><path d="M20.5 14.9A9 9 0 0 0 9.1 3.5"/><path d="m2 2 20 20"/><path d="M5.6 5.6C3 8.3 2.2 12.5 4 16l-2 6 6-2c3.4 1.8 7.6 1.1 10.3-1.7"/></svg>
      <a href="/settings/moderation/modlist">{$_('settings_mod_list')}<br><span>{$_('settings_mod_list_description')}</span></a>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
    </div>

    <div class="settings-child-nav">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
      <a href="/settings/moderation/labeler">{$_('settings_labeler')}<br><span>{$_('settings_labeler_description')}</span></a>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
    </div>

    <div class="settings-child-nav">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle-more"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/><path d="M8 12h.01"/><path d="M12 12h.01"/><path d="M16 12h.01"/></svg>
      <a href="/settings/moderation/chat">{$_('settings_chat')}<br><span>{$_('settings_chat_description')}</span></a>
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right"><path d="m9 18 6-6-6-6"/></svg>
    </div>

    <h2 class="moderation-group-title">{$_('global_label_settings')}</h2>
    <p class="settings-description">{$_('global_label_settings_description')}</p>

    <div class="moderation-settings-groups">
      <div class="moderation-settings-group">
        <h3 class="moderation-settings-group__title">{$_('labeling_porn')}</h3>
        <p class="moderation-settings-group__text">{$_('labeling_porn_description')}</p>

        <div class="moderation-settings-group__content">
          <LabelSelector name="nsfw" bind:value={labels.nsfw}></LabelSelector>
        </div>
      </div>

      <div class="moderation-settings-group">
        <h3 class="moderation-settings-group__title">{$_('labeling_sexual')}</h3>
        <p class="moderation-settings-group__text">{$_('labeling_sexual_description')}</p>

        <div class="moderation-settings-group__content">
          <LabelSelector name="suggestive" bind:value={labels.suggestive}></LabelSelector>
        </div>
      </div>

      <div class="moderation-settings-group">
        <h3 class="moderation-settings-group__title">{$_('labeling_gore')}</h3>
        <p class="moderation-settings-group__text">{$_('labeling_gore_description')}</p>

        <div class="moderation-settings-group__content">
          <LabelSelector name="gore" bind:value={labels.gore}></LabelSelector>
        </div>
      </div>

      <div class="moderation-settings-group">
        <h3 class="moderation-settings-group__title">{$_('labeling_nudity')}</h3>
        <p class="moderation-settings-group__text">{$_('labeling_nudity_description')}</p>

        <div class="moderation-settings-group__content">
          <LabelSelector name="nudity" bind:value={labels.nudity}></LabelSelector>
        </div>
      </div>

      {#if ($subscribedLabelers.includes(officialLabelerDid))}
        <h2 class="moderation-group-title">{$_('official_label_settings')}</h2>
        <p class="settings-description">{$_('official_label_settings_description')}</p>

        <LabelerLabelList did="did:plc:ar7c4by46qjdydhdevvrndac" isOfficial={true}></LabelerLabelList>
      {/if}
    </div>
  </div>
</div>

<style lang="postcss">

</style>