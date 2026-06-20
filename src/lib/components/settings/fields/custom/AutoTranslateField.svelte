<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { isLocalTranslateSupported, disposeAllTranslators } from '$lib/localTranslate';

    const localSupported = isLocalTranslateSupported();

    function handleChange(event: Event & { currentTarget: EventTarget & HTMLInputElement }) {
        if (!event.currentTarget.checked) {
            disposeAllTranslators();
        }
    }
</script>

<div class="input-toggle">
    <input
        class="input-toggle__input"
        type="checkbox"
        id="autoTranslation"
        disabled={!localSupported}
        bind:checked={settingsStore.general.autoTranslate}
        onchange={handleChange}
    /><label class="input-toggle__label" for="autoTranslation"></label>
</div>

<p class="settings-group__description">
    {#if !localSupported}
        {$_('auto_translation_unsupported')}
    {:else}
        {$_('auto_translation_description')}
        <a href="/settings/translation">{$_('translation_manage_link')}</a>
    {/if}
</p>
