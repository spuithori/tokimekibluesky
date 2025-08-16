<script lang="ts">
    import { m } from "$lib/paraglide/messages.js";
    import ReactionButtonSettingsModal from "$lib/components/settings/ReactionButtonSettingsModal.svelte";
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
</script>

<svelte:head>
  <title>{m.reaction_button_settings()} - TOKIMEKI</title>
</svelte:head>

<div>
  <SettingsHeader>
    {m.reaction_button_settings()}
  </SettingsHeader>

  <div class="settings-wrap">
    <ReactionButtonSettingsModal></ReactionButtonSettingsModal>
  </div>
</div>
