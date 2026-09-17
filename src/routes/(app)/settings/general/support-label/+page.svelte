<script lang="ts">
    import {_} from "tokimeki-i18n";
    import LabelerLabelList from "$lib/components/labeler/LabelerLabelList.svelte";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
    import {TOKIMEKI_LABELER_DID} from "$lib/support/supporterLabels";
</script>

<svelte:head>
  <title>{$_('settings_support_label')} - TOKIMEKI</title>
</svelte:head>

<div>
  <SettingsHeader>
    {$_('settings_support_label')}
  </SettingsHeader>

  <div class="settings-wrap">
    <p class="settings-description">{$_('tokimeki_label_settings_description_1')}<a href="/profile/{TOKIMEKI_LABELER_DID}">{$_('tokimeki_label_settings_description_link')}</a>{$_('tokimeki_label_settings_description_2')}</p>

    <LabelerLabelList did={TOKIMEKI_LABELER_DID}></LabelerLabelList>
  </div>
</div>
