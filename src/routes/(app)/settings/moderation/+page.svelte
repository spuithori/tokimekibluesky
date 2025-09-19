<script lang="ts">
    import { run } from 'svelte/legacy';

    import {_} from 'svelte-i18n';
    import {settings, subscribedLabelers} from '$lib/stores';
    import LabelSelector from "$lib/components/labeler/LabelSelector.svelte";
    import LabelerLabelList from "$lib/components/labeler/LabelerLabelList.svelte";
    import {ChevronRight, Globe2, MessageCircleMore, MessageCircleOff, Repeat2, Shield, VolumeX, ShieldBan} from "lucide-svelte";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";

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

    let labels: contentLabels = $state($settings.moderation.contentLabels || {
        gore: 'warn',
        hate: 'warn',
        impersonation: 'warn',
        nsfw: 'warn',
        nudity: 'warn',
        spam: 'warn',
        suggestive: 'warn',
    });

    run(() => {
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
    });
</script>

<svelte:head>
  <title>{$_('settings_moderation')} - TOKIMEKI</title>
</svelte:head>

<div>
  <SettingsHeader>
    {$_('settings_moderation')}
  </SettingsHeader>

  <div class="settings-wrap">
    <div class="settings-child-nav">
      <VolumeX size="24"></VolumeX>
      <a href="/mutes">{$_('mutes_list')}</a>
      <ChevronRight size="20"></ChevronRight>
    </div>

    <div class="settings-child-nav">
      <ShieldBan size="24"></ShieldBan>
      <a href="/blocks">{$_('blocks_list')}</a>
      <ChevronRight size="20"></ChevronRight>
    </div>

    <div class="settings-child-nav">
      <MessageCircleOff size="24"></MessageCircleOff>
      <a href="/settings/moderation/modlist">{$_('settings_mod_list')}<br><span>{$_('settings_mod_list_description')}</span></a>
      <ChevronRight size="20"></ChevronRight>
    </div>

    <div class="settings-child-nav">
      <Shield size="24"></Shield>
      <a href="/settings/moderation/labeler">{$_('settings_labeler')}<br><span>{$_('settings_labeler_description')}</span></a>
      <ChevronRight size="20"></ChevronRight>
    </div>

    <div class="settings-child-nav">
      <MessageCircleMore size="24"></MessageCircleMore>
      <a href="/settings/moderation/chat">{$_('settings_chat')}<br><span>{$_('settings_chat_description')}</span></a>
      <ChevronRight size="20"></ChevronRight>
    </div>

    <div class="settings-child-nav">
      <Repeat2 size="24"></Repeat2>
      <a href="/settings/moderation/repost-mute">{$_('settings_repost_mute')}<br><span>{$_('settings_repost_mute_description')}</span></a>
      <ChevronRight size="20"></ChevronRight>
    </div>

    <div class="settings-child-nav">
      <Globe2 size="24"></Globe2>
      <a href="/settings/moderation/lang-filter">{$_('settings_lang_filter')}</a>
      <ChevronRight size="20"></ChevronRight>
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