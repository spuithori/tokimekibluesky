<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { GalleryVertical, Palette, ChevronRight } from 'lucide-svelte';
    import SettingsCategory from '$lib/components/settings/SettingsCategory.svelte';
</script>

<SettingsCategory category="design" title="settings_design">
    <div class="settings-child-nav">
        <GalleryVertical size="24"></GalleryVertical>
        <a href="/settings/design/embed">{$_('settings_embed')}<br><span>{$_('settings_embed_description')}</span></a>
        <ChevronRight size="20"></ChevronRight>
    </div>

    <div class="settings-child-nav">
        <Palette size="24"></Palette>
        <a href="/theme-store">{$_('theme_store')}<br><span>{$_('theme_store_description')}</span></a>
        <ChevronRight size="20"></ChevronRight>
    </div>
</SettingsCategory>
