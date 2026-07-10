<script lang="ts">
    import { onMount } from 'svelte';
    import { _ } from 'tokimeki-i18n';
    import { toast } from 'svelte-sonner';
    import Store from '@lucide/svelte/icons/store';
    import Download from '@lucide/svelte/icons/download';
    import RefreshCw from '@lucide/svelte/icons/refresh-cw';
    import Trash2 from '@lucide/svelte/icons/trash-2';
    import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
    import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
    import RicePluginSettings from './RicePluginSettings.svelte';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { pluginState } from '$lib/plugins/state.svelte';
    import { riceModuleHost } from '$lib/rice/modules/host.svelte';
    import { getColumnState } from '$lib/classes/columnState.svelte';
    import { HOST_SVELTE_VERSION } from '$lib/rice/plugins/hostVersion';
    import { pluginEntryId } from '$lib/rice/plugins/adapter';
    import { fetchPluginFromAtUri, fetchPluginFromUrl, sourceLabel, type FetchedPlugin } from '$lib/rice/plugins/loader';
    import { getUpdates, updatedPluginIds } from '$lib/rice/plugins/catalog';
    import { canMutatePlugin, checkPluginUpdate, commitInstall, commitUpdate, uninstallPlugin } from '$lib/rice/plugins/store.svelte';

    let url = $state('');
    let busy = $state(false);
    let pendingInstall = $state<FetchedPlugin | null>(null);
    let pendingUpdate = $state<{ id: string; fetched: FetchedPlugin; currentVersion: string } | null>(null);
    let pendingUninstall = $state<string | null>(null);
    let cleanupOnUninstall = $state(true);
    let outdated = $state<string[]>([]);

    const columnState = getColumnState();

    onMount(async () => {
        const installed = settingsStore.plugins.installed;
        const uris = Object.values(installed).flatMap((plugin) => (plugin.source.kind === 'at' ? [plugin.source.uri] : []));
        try {
            outdated = updatedPluginIds(installed, await getUpdates(uris));
        } catch {
            outdated = [];
        }
    });

    function orphanColumns(id: string) {
        const prefix = `plugin:${id}:`;
        return columnState?.columns.filter((column) => column.algorithm?.type?.startsWith(prefix)) ?? [];
    }

    const installed = $derived(Object.entries(settingsStore.plugins.installed));
    const missingEnabled = $derived(
        Object.entries(settingsStore.plugins.state)
            .filter(([id, state]) => state.enabled && !settingsStore.plugins.installed[id])
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

    function authorOf(fetched: FetchedPlugin): string | undefined {
        return fetched.source.kind === 'at' ? fetched.source.handle ?? fetched.source.did : fetched.manifest.author;
    }

    async function preview() {
        const value = url.trim();
        if (!value || busy) return;
        busy = true;
        try {
            pendingInstall = value.startsWith('at://')
                ? await fetchPluginFromAtUri(value)
                : await fetchPluginFromUrl(new URL(value, location.href).href);
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
        pluginState.setEnabled(id, enable);
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
        const cleanup = cleanupOnUninstall;
        pendingUninstall = null;
        if (!id) return;
        try {
            if (!(await uninstallPlugin(id))) {
                toast.error($_('rice_plugins_busy'));
                return;
            }
            if (cleanup) {
                for (const column of orphanColumns(id)) {
                    columnState?.remove(column.id);
                }
                pluginState.clear(id);
            }
            toast.success($_('rice_plugins_uninstalled'));
        } catch (e) {
            toast.error(errorMessage(e));
        }
    }
</script>

<div class="rice-plugins">
    <p class="rice-plugins__description">{$_('rice_plugins_description')}</p>

    <p class="rice-plugins__store">
        <a class="text-button rice-plugins__store-link" href="/settings/plugins/store" data-testid="rice-plugins-store-link">
            <Store size={15}></Store>
            {$_('rice_plugins_open_store')}
        </a>
    </p>

    <div class="rice-plugins__install">
        <input
            class="rice-plugins__url input-text"
            type="text"
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

                        {#if outdated.includes(id)}
                            <span class="rice-plugin__outdated" data-testid="rice-plugin-outdated">{$_('rice_plugins_update_available_badge')}</span>
                        {/if}

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
                                disabled={!entry}
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

                    <RicePluginSettings {id}></RicePluginSettings>
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
        {@const author = authorOf(pendingInstall)}
        <div class="rice-plugin-confirm">
            <h3 class="rice-plugin-confirm__title">{pendingInstall.manifest.name} <span>v{pendingInstall.manifest.version}</span></h3>

            <p class="rice-plugin-confirm__author" data-testid="rice-plugin-confirm-author">
                <span class="rice-plugin-confirm__label">{$_('rice_plugins_author')}</span>
                <strong>{author ?? $_('rice_plugins_author_unknown')}</strong>
            </p>

            <p class="rice-plugin-confirm__source">
                <span class="rice-plugin-confirm__label">{$_('rice_plugins_source')}</span>
                <span class="rice-plugin-confirm__source-value">{sourceLabel(pendingInstall.source)}</span>
            </p>

            {#if pendingInstall.manifest.description}
                <p class="rice-plugin-confirm__description">{pendingInstall.manifest.description}</p>
            {/if}

            {#if pendingInstall.manifest.contributes}
                <p class="rice-plugin-confirm__contributes">{contributionSummary(pendingInstall)}</p>
            {/if}

            <p class="rice-plugin-confirm__warning">
                <TriangleAlert size={16}></TriangleAlert>
                {author ? $_('rice_plugins_trust_warning_by', { author }) : $_('rice_plugins_trust_warning')}
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
        {@const columns = orphanColumns(pendingUninstall).length}
        <p>{$_('rice_plugins_uninstall_confirm', { name: settingsStore.plugins.installed[pendingUninstall]?.name ?? pendingUninstall })}</p>

        <div class="rice-plugin-cleanup">
            <div class="input-toggle">
                <input
                    class="input-toggle__input"
                    type="checkbox"
                    id="rice-plugin-cleanup"
                    data-testid="rice-plugin-cleanup"
                    bind:checked={cleanupOnUninstall}
                ><label class="input-toggle__label" for="rice-plugin-cleanup"></label>
            </div>

            <label class="rice-plugin-cleanup__text" for="rice-plugin-cleanup">
                {columns > 0
                    ? $_('rice_plugins_cleanup_with_columns', { count: String(columns) })
                    : $_('rice_plugins_cleanup')}
            </label>
        </div>
    </ConfirmModal>
{/if}

<style lang="postcss">
    .rice-plugins {
        display: flex;
        flex-direction: column;
        gap: 12px;
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

        .rice-plugin-confirm__author,
        .rice-plugin-confirm__source {
            display: flex;
            align-items: baseline;
            gap: 8px;
            font-size: 14px;
            color: var(--text-color-2);
        }

        .rice-plugin-confirm__label {
            flex: 0 0 auto;
            font-size: 12px;
            color: var(--text-color-3);
        }

        .rice-plugin-confirm__source-value {
            font-size: 12px;
            color: var(--text-color-3);
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
    .rice-plugins__store {
        margin: 8px 0 12px;
    }

    .rice-plugins__store-link {
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }

    .rice-plugin__outdated {
        padding: 1px 8px;
        font-size: 11px;
        color: var(--bg-color-1);
        background-color: var(--primary-color);
        border-radius: 999px;
    }

    .rice-plugin-cleanup {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-top: 16px;
        font-size: 13px;
        color: var(--text-color-2);
    }

    .rice-plugin-cleanup__text {
        cursor: pointer;
    }
</style>
