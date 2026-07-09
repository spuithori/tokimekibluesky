<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { toast } from 'svelte-sonner';
    import Puzzle from '@lucide/svelte/icons/puzzle';
    import Download from '@lucide/svelte/icons/download';
    import RefreshCw from '@lucide/svelte/icons/refresh-cw';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
    import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { riceModuleHost } from '$lib/rice/modules/host.svelte';
    import { setValueInText } from '$lib/rice/config/edit';
    import { HOST_SVELTE_VERSION } from '$lib/rice/plugins/hostVersion';
    import { pluginEntryId } from '$lib/rice/plugins/adapter';
    import { fetchPluginFromUrl, type FetchedPlugin } from '$lib/rice/plugins/loader';
    import { canMutatePlugin, checkPluginUpdate, commitInstall, commitUpdate, uninstallPlugin } from '$lib/rice/plugins/store.svelte';

    let url = $state('');
    let busy = $state(false);
    let pendingInstall = $state<FetchedPlugin | null>(null);
    let pendingUpdate = $state<{ id: string; fetched: FetchedPlugin; currentVersion: string } | null>(null);
    let pendingUninstall = $state<string | null>(null);

    const installed = $derived(Object.entries(settingsStore.rice.plugins ?? {}));
    const missingEnabled = $derived(
        Object.entries(riceState.compiled.plugins)
            .filter(([id, config]) => config.enable && !(settingsStore.rice.plugins ?? {})[id])
            .map(([id]) => id),
    );

    function entryFor(id: string) {
        return riceModuleHost.entries.get(pluginEntryId(id));
    }

    function contributionSummary(fetched: FetchedPlugin): string {
        return Object.entries(fetched.manifest.contributes ?? {})
            .map(([key, value]) => `${key} (${Array.isArray(value) ? value.length : Object.keys(value).length})`)
            .join(', ');
    }

    function errorMessage(e: unknown): string {
        return e instanceof Error ? e.message : String(e);
    }

    async function preview() {
        if (!url.trim() || busy) return;
        busy = true;
        try {
            pendingInstall = await fetchPluginFromUrl(new URL(url.trim(), location.href).href);
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            busy = false;
        }
    }

    async function confirmInstall() {
        const fetched = pendingInstall;
        pendingInstall = null;
        if (!fetched) return;
        try {
            await commitInstall(fetched);
            url = '';
            toast.success($_('rice_plugins_installed', { name: fetched.manifest.name }));
        } catch (e) {
            toast.error(errorMessage(e));
        }
    }

    function toggle(id: string, enable: boolean) {
        settingsStore.rice.config = setValueInText(
            settingsStore.rice.config,
            [{ name: pluginEntryId(id) }],
            'enable',
            String(enable),
        );
    }

    async function checkUpdate(id: string) {
        if (busy) return;
        busy = true;
        try {
            const result = await checkPluginUpdate(id);
            if (!result.changed) {
                toast.success($_('rice_plugins_up_to_date'));
            } else {
                pendingUpdate = { id, fetched: result.fetched, currentVersion: result.currentVersion };
            }
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            busy = false;
        }
    }

    async function confirmUpdate() {
        const update = pendingUpdate;
        pendingUpdate = null;
        if (!update) return;
        try {
            if (await commitUpdate(update.id, update.fetched)) {
                toast.success($_('rice_plugins_updated', { name: update.fetched.manifest.name }));
            } else {
                toast.error($_('rice_plugins_busy'));
            }
        } catch (e) {
            toast.error(errorMessage(e));
        }
    }

    async function confirmUninstall() {
        const id = pendingUninstall;
        pendingUninstall = null;
        if (!id) return;
        try {
            if (await uninstallPlugin(id)) {
                toast.success($_('rice_plugins_uninstalled'));
            } else {
                toast.error($_('rice_plugins_busy'));
            }
        } catch (e) {
            toast.error(errorMessage(e));
        }
    }
</script>

<div class="rice-plugins">
    <h3 class="rice-plugins__heading">
        <Puzzle size={18}></Puzzle>
        {$_('rice_plugins')}
    </h3>

    <p class="rice-plugins__description">{$_('rice_plugins_description')}</p>

    <div class="rice-plugins__install">
        <input
            class="rice-plugins__url input-text"
            type="url"
            placeholder={$_('rice_plugins_url_placeholder')}
            bind:value={url}
            onkeydown={(e) => { if (e.key === 'Enter') preview(); }}
        >
        <button class="button button--sm" disabled={busy || !url.trim()} onclick={preview}>
            <Download size={16}></Download>
            {$_('rice_plugins_install')}
        </button>
    </div>

    {#if installed.length === 0}
        <p class="rice-plugins__empty">{$_('rice_plugins_empty')}</p>
    {:else}
        <ul class="rice-plugins__list">
            {#each installed as [id, plugin] (id)}
                {@const entry = entryFor(id)}
                {@const status = entry?.status ?? 'unavailable'}
                <li class="rice-plugin">
                    <div class="rice-plugin__main">
                        <span class="rice-plugin__name">{plugin.name}</span>
                        <span class="rice-plugin__version">v{plugin.version}</span>
                        <span class="rice-plugin__status rice-plugin__status--{status}">{$_(`rice_plugins_status_${status}`)}</span>

                        {#if plugin.svelteVersion !== HOST_SVELTE_VERSION}
                            <span class="rice-plugin__warning" title={$_('rice_plugins_svelte_mismatch', { plugin: plugin.svelteVersion, host: HOST_SVELTE_VERSION })}>
                                <TriangleAlert size={14}></TriangleAlert>
                            </span>
                        {/if}
                    </div>

                    {#if entry?.status === 'error' && entry.errorMessage}
                        <p class="rice-plugin__error">{entry.errorMessage}</p>
                    {/if}

                    <div class="rice-plugin__actions">
                        <div class="input-toggle">
                            <input
                                class="input-toggle__input"
                                type="checkbox"
                                id="rice-plugin-{id}"
                                checked={status === 'enabled' || status === 'enabling'}
                                disabled={!settingsStore.rice.enabled || !entry}
                                onchange={(e) => toggle(id, e.currentTarget.checked)}
                            ><label class="input-toggle__label" for="rice-plugin-{id}"></label>
                        </div>

                        <button class="text-button" disabled={busy || !canMutatePlugin(id)} onclick={() => checkUpdate(id)}>
                            <RefreshCw size={14}></RefreshCw>
                            {$_('rice_plugins_update')}
                        </button>

                        <button class="text-button" disabled={!canMutatePlugin(id)} onclick={() => { pendingUninstall = id; }}>
                            <Trash2 size={14}></Trash2>
                            {$_('rice_plugins_uninstall')}
                        </button>
                    </div>
                </li>
            {/each}
        </ul>
    {/if}

    {#each missingEnabled as id (id)}
        <p class="rice-plugins__missing">
            <TriangleAlert size={14}></TriangleAlert>
            {$_('rice_plugins_missing_hint', { id })}
        </p>
    {/each}
</div>

{#if pendingInstall}
    <ConfirmModal
        on:ok={confirmInstall}
        on:cancel={() => { pendingInstall = null; }}
        yesText={$_('rice_plugins_install')}
        cancelText={$_('cancel')}
    >
        <div class="rice-plugin-confirm">
            <h3 class="rice-plugin-confirm__title">{pendingInstall.manifest.name} <span>v{pendingInstall.manifest.version}</span></h3>

            {#if pendingInstall.manifest.description}
                <p class="rice-plugin-confirm__description">{pendingInstall.manifest.description}</p>
            {/if}

            {#if pendingInstall.manifest.contributes}
                <p class="rice-plugin-confirm__contributes">{contributionSummary(pendingInstall)}</p>
            {/if}

            <p class="rice-plugin-confirm__warning">
                <TriangleAlert size={16}></TriangleAlert>
                {$_('rice_plugins_trust_warning')}
            </p>

            {#if pendingInstall.svelteVersionMismatch}
                <p class="rice-plugin-confirm__warning">
                    <TriangleAlert size={16}></TriangleAlert>
                    {$_('rice_plugins_svelte_mismatch', { plugin: pendingInstall.manifest.svelteVersion, host: HOST_SVELTE_VERSION })}
                </p>
            {/if}
        </div>
    </ConfirmModal>
{/if}

{#if pendingUpdate}
    <ConfirmModal
        on:ok={confirmUpdate}
        on:cancel={() => { pendingUpdate = null; }}
        yesText={$_('rice_plugins_update')}
        cancelText={$_('cancel')}
    >
        <div class="rice-plugin-confirm">
            <h3 class="rice-plugin-confirm__title">{pendingUpdate.fetched.manifest.name}</h3>
            <p class="rice-plugin-confirm__description">{$_('rice_plugins_update_available', { current: pendingUpdate.currentVersion, next: pendingUpdate.fetched.manifest.version })}</p>

            <p class="rice-plugin-confirm__warning">
                <TriangleAlert size={16}></TriangleAlert>
                {$_('rice_plugins_trust_warning')}
            </p>
        </div>
    </ConfirmModal>
{/if}

{#if pendingUninstall}
    <ConfirmModal
        on:ok={confirmUninstall}
        on:cancel={() => { pendingUninstall = null; }}
        yesText={$_('rice_plugins_uninstall')}
        cancelText={$_('cancel')}
    >
        <p>{$_('rice_plugins_uninstall_confirm', { name: (settingsStore.rice.plugins ?? {})[pendingUninstall]?.name ?? pendingUninstall })}</p>
    </ConfirmModal>
{/if}

<style lang="postcss">
    .rice-plugins {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .rice-plugins__heading {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 16px;
    }

    .rice-plugins__description {
        font-size: 14px;
        color: var(--text-color-2);
    }

    .rice-plugins__install {
        display: flex;
        gap: 8px;

        .rice-plugins__url {
            flex: 1;
        }

        button {
            flex-shrink: 0;
            display: flex;
            align-items: center;
            gap: 4px;
        }
    }

    .rice-plugins__empty {
        font-size: 14px;
        color: var(--text-color-3);
    }

    .rice-plugins__list {
        list-style: none;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .rice-plugin {
        border: 1px solid var(--border-color-2, var(--border-color-1));
        border-radius: 8px;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
    }

    .rice-plugin__main {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .rice-plugin__name {
        font-weight: bold;
    }

    .rice-plugin__version {
        font-size: 12px;
        color: var(--text-color-3);
    }

    .rice-plugin__status {
        font-size: 12px;
        padding: 2px 8px;
        border-radius: 10px;
        background-color: var(--bg-color-2);
        color: var(--text-color-2);
    }

    .rice-plugin__status--enabled {
        background-color: var(--primary-color);
        color: var(--bg-color-1);
    }

    .rice-plugin__status--error {
        background-color: var(--danger-color);
        color: #fff;
    }

    .rice-plugin__warning {
        color: var(--danger-color);
        display: flex;
        align-items: center;
    }

    .rice-plugin__error {
        font-size: 12px;
        color: var(--danger-color);
        word-break: break-all;
    }

    .rice-plugin__actions {
        display: flex;
        align-items: center;
        gap: 16px;

        button {
            display: flex;
            align-items: center;
            gap: 4px;
            font-size: 13px;
        }
    }

    .rice-plugins__missing {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 13px;
        color: var(--danger-color);
    }

    .rice-plugin-confirm {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 24px;
        max-width: 400px;

        .rice-plugin-confirm__title span {
            font-size: 13px;
            font-weight: normal;
            color: var(--text-color-3);
        }

        .rice-plugin-confirm__description,
        .rice-plugin-confirm__contributes {
            font-size: 14px;
            color: var(--text-color-2);
            word-break: break-all;
        }

        .rice-plugin-confirm__warning {
            display: flex;
            align-items: flex-start;
            gap: 8px;
            font-size: 13px;
            color: var(--danger-color);
        }
    }
</style>
