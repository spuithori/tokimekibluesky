<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { settingsStore } from '$lib/settings/settings.svelte';
</script>

<div class="select">
    <input
        class="select__input"
        type="password"
        id="finnhubApiKey"
        bind:value={settingsStore.general.finnhubApiKey}
        placeholder="API Key"
        autocomplete="off"
    />
</div>

<p class="settings-group__description">
    {$_('finnhub_api_key_description')}
    <a href="https://finnhub.io/" target="_blank" rel="noopener noreferrer">finnhub.io</a>
</p>
