<script lang="ts">
    import { liveQuery } from 'dexie';
    import { themesDb } from '$lib/db';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { OFFICIAL_THEME_DID, themeUri } from '$lib/theme/format';
    import { FLAT, FLAT_RKEY } from '$lib/theme/samples/flat';

    const ID = themeUri(OFFICIAL_THEME_DID, FLAT_RKEY);

    const installed = liveQuery(() => themesDb.themes.get(ID));

    async function install() {
        await themesDb.themes.put({
            id: ID,
            uri: ID,
            did: OFFICIAL_THEME_DID,
            handle: 'tokimeki.blue',
            record: FLAT,
            installedAt: new Date().toISOString(),
        });
        settingsStore.design.skin = ID;
        location.href = '/';
    }

    async function remove() {
        settingsStore.design.skin = 'default';
        await themesDb.themes.delete(ID);
    }
</script>

<main>
    <h1>Flat</h1>
    <button onclick={install}>{$installed ? '再適用してアプリを開く' : '導入して適用'}</button>
    {#if $installed}
        <button onclick={remove}>元に戻す</button>
    {/if}
</main>

<style>
    main {
        display: flex;
        flex-direction: column;
        gap: 12px;
        max-width: 360px;
        margin: 48px auto;
        padding: 0 16px;
    }

    button {
        padding: 12px 16px;
        border-radius: 6px;
        border: 1px solid #e0e1e6;
        background: #fff;
        font: inherit;
        cursor: pointer;
    }
</style>
