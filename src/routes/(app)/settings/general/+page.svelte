<script lang="ts">
    import { locale } from 'svelte-i18n';
    import { settings } from '$lib/stores';
    import { intlRelativeTimeFormatState } from '$lib/classes/intlRelativeTimeFormatState.svelte';
    import SettingsCategory from '$lib/components/settings/SettingsCategory.svelte';

    // Side effects that follow the language setting (previously inline in this
    // page). Kept here because the language selector lives on this category.
    $effect(() => {
        intlRelativeTimeFormatState.changeLocale($settings?.general?.language || navigator.language);
    });

    $effect(() => {
        if ($settings?.general?.language) {
            locale.set($settings.general.language);
        }
    });
</script>

<SettingsCategory category="general" title="settings_general" />
