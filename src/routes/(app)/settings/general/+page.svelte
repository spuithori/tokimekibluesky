<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import ChevronRight from '@lucide/svelte/icons/chevron-right';
    import Tag from '@lucide/svelte/icons/tag';
    import SettingsCategory from '$lib/components/settings/SettingsCategory.svelte';
</script>

<SettingsCategory category="general" title="settings_general">
    <div class="settings-child-nav">
        <Tag size="24"></Tag>
        <a href="/settings/general/support-label">{$_('settings_support_label')}<br><span>{$_('settings_support_label_description')}</span></a>
        <ChevronRight size="20"></ChevronRight>
    </div>
</SettingsCategory>
