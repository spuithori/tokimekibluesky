<script lang="ts">
    import {_} from 'svelte-i18n';
    import SettingsHeader from "$lib/components/settings/SettingsHeader.svelte";
    import {accountsDb} from "$lib/db";
    import {stateQuery} from "$lib/classes/dbState.svelte";

    let profilesQuery = stateQuery(
        () => accountsDb.profiles.toArray(),
        () => [],
    );
    const profiles = $derived(profilesQuery.current || []);
    let checkedProfiles = $state([]);
    let workspaceExportAll = $state(false);
    let importFile: FileList | null | undefined = $state();

    function handleToggleAll() {
        checkedProfiles = workspaceExportAll ? profiles.map(p => p.id) : [];
    }

    function handleExport() {
        const selectedProfiles = profiles.filter(p => checkedProfiles.includes(p.id));

        const json = JSON.stringify(selectedProfiles, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `tokimeki-profiles-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    }

    async function handleImport() {
        if (!importFile || importFile.length === 0) {
            return;
        }

        const file = importFile[0];

        try {
            const text = await file.text();
            const parsedData = JSON.parse(text);

            if (!Array.isArray(parsedData)) {
                alert('The JSON file format is incorrect.');
                return;
            }

            const importedProfiles = parsedData.map(({ id, ...profile }) => profile);

            await accountsDb.profiles.bulkPut(importedProfiles);

            importFile = new DataTransfer().files;
        } catch (error) {
            console.error(error);
            alert('Failed to load the JSON file.');
        }
    }

    $effect(() => {
        if (profiles.length > 0 && checkedProfiles.length === profiles.length) {
            workspaceExportAll = true;
        } else if (checkedProfiles.length < profiles.length) {
            workspaceExportAll = false;
        }
    });
</script>

<svelte:head>
    <title>{$_('workspace_import_export')} - TOKIMEKI</title>
</svelte:head>

<div>
    <SettingsHeader>
        {$_('workspace_import_export')}
    </SettingsHeader>

    <div class="settings-wrap">
        <div class="settings-box">
            <div class="settings-box__title">{$_('export')}</div>

            <div class="checkbox-list">
                <div class="checkbox">
                    <input type="checkbox" class="checkbox__input" id="workspaceExportAll" bind:checked={workspaceExportAll} onchange={handleToggleAll}>
                    <label class="checkbox__label" for="workspaceExportAll">
                        <span class="checkbox__ui"></span>
                        <span class="checkbox__text">{$_('check_all')}</span>
                    </label>
                </div>

                {#each profiles as profile}
                    <div class="checkbox">
                        <input type="checkbox" class="checkbox__input" id="workspaceExport{profile.id}" value={profile.id} bind:group={checkedProfiles}>
                        <label class="checkbox__label" for="workspaceExport{profile.id}">
                            <span class="checkbox__ui"></span>
                            <span class="checkbox__text">{profile.name}</span>
                        </label>
                    </div>
                {/each}
            </div>

            <button class="button button--sm" disabled={!checkedProfiles.length} onclick={handleExport}>エクスポート</button>
        </div>

        <div class="settings-box">
            <div class="settings-box__title">{$_('import')}</div>

            <input class="mb10" accept=".json,application/json" type="file" bind:files={importFile}>

            <button class="button button--sm" disabled={!importFile} onclick={handleImport}>{$_('import')}</button>
        </div>
    </div>
</div>

<style lang="postcss">
    .settings-box {
        padding: 16px;
        border: 1px solid var(--border-color-2);
        border-radius: var(--border-radius-3);

        &__title {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 8px;
        }
    }

    .checkbox-list {
        margin-bottom: 16px;
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
    }
</style>