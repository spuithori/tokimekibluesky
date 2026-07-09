<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import SettingsHeader from '$lib/components/settings/SettingsHeader.svelte';
    import RicePluginsPanel from '$lib/components/rice/RicePluginsPanel.svelte';
</script>

<svelte:head>
    <title>{$_('settings_plugins')} - TOKIMEKI</title>
</svelte:head>

<div>
    <SettingsHeader>{$_('settings_plugins')}</SettingsHeader>

    <div class="settings-wrap">
        <RicePluginsPanel></RicePluginsPanel>
    </div>
</div>
