<script lang="ts">
    import {_} from "svelte-i18n";
    import ReactionButtonSettingsModal from "$lib/components/settings/ReactionButtonSettingsModal.svelte";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
</script>

<svelte:head>
  <title>{$_('reaction_button_settings')} - TOKIMEKI</title>
</svelte:head>

<div>
  <SettingsHeader>
    {$_('reaction_button_settings')}
  </SettingsHeader>

  <div class="settings-wrap">
    <ReactionButtonSettingsModal></ReactionButtonSettingsModal>
  </div>
</div>
