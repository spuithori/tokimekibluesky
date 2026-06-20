<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { ChevronRight, SmilePlus } from 'lucide-svelte';
    import SettingsCategory from '$lib/components/settings/SettingsCategory.svelte';
</script>

<SettingsCategory category="timeline" title="settings_timeline">
    <div class="settings-child-nav">
        <SmilePlus size="24"></SmilePlus>
        <a href="/settings/timeline/reaction">{$_('reaction_button_settings')}<br><span>{$_('reaction_button_settings_description')}</span></a>
        <ChevronRight size="20"></ChevronRight>
    </div>
</SettingsCategory>
