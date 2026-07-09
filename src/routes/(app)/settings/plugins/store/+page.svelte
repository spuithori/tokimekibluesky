<script lang="ts">
    import Search from '@lucide/svelte/icons/search';
    import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
    import { onMount } from 'svelte';
    import { _ } from 'tokimeki-i18n';
    import { toast } from 'svelte-sonner';
    import ConfirmModal from '$lib/components/ui/ConfirmModal.svelte';
    import SettingsHeader from '$lib/components/settings/SettingsHeader.svelte';
    import { agent } from '$lib/stores';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { HOST_SVELTE_VERSION } from '$lib/rice/plugins/hostVersion';
    import { getPlugins, searchPlugins, type PluginView } from '$lib/rice/plugins/catalog';
    import { hasLiked, likePlugin, unlikePlugin } from '$lib/rice/plugins/like';
    import { fetchPluginFromAtUri, type FetchedPlugin } from '$lib/rice/plugins/loader';
    import { commitInstall } from '$lib/rice/plugins/store.svelte';
    import PluginCard from './PluginCard.svelte';

    let query = $state('');
    let sort = $state<'popular' | 'recent'>('popular');
    let verifiedOnly = $state(false);

    let loading = $state(true);
    let loadError = $state<string | null>(null);
    let plugins = $state<PluginView[]>([]);
    let liked = $state<Record<string, boolean>>({});

    let busyId = $state<string | null>(null);
    let pendingInstall = $state<FetchedPlugin | null>(null);

    const installedIds = $derived(new Set(Object.keys(settingsStore.rice.plugins ?? {})));
    const canLike = $derived(Boolean($agent));

    function errorMessage(e: unknown): string {
        return e instanceof Error ? e.message : String(e);
    }

    async function load() {
        loading = true;
        loadError = null;
        try {
            const page = query.trim()
                ? await searchPlugins(query.trim(), { limit: 50 })
                : await getPlugins({ limit: 50, sort, verifiedOnly });
            plugins = page.plugins;
            void loadLikes();
        } catch (e) {
            loadError = errorMessage(e);
            plugins = [];
        } finally {
            loading = false;
        }
    }

    async function loadLikes() {
        if (!$agent) return;
        const results = await Promise.all(plugins.map(async (plugin) => [plugin.id, await hasLiked($agent, plugin.id)] as const));
        liked = Object.fromEntries(results);
    }

    async function toggleLike(plugin: PluginView) {
        if (!$agent || busyId) return;
        busyId = plugin.id;
        const was = liked[plugin.id] ?? false;
        try {
            if (was) {
                await unlikePlugin($agent, plugin.id);
            } else {
                await likePlugin($agent, plugin);
            }
            liked = { ...liked, [plugin.id]: !was };
            plugin.likeCount += was ? -1 : 1;
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            busyId = null;
        }
    }

    async function install(plugin: PluginView) {
        if (busyId) return;
        busyId = plugin.id;
        try {
            pendingInstall = await fetchPluginFromAtUri(plugin.uri);
        } catch (e) {
            toast.error(errorMessage(e));
        } finally {
            busyId = null;
        }
    }

    async function confirmInstall() {
        const fetched = pendingInstall;
        pendingInstall = null;
        if (!fetched) return;
        try {
            await commitInstall(fetched);
            toast.success($_('rice_plugins_installed', { name: fetched.manifest.name }));
        } catch (e) {
            toast.error(errorMessage(e));
        }
    }

    onMount(load);
</script>

<svelte:head>
    <title>{$_('plugin_store')} - TOKIMEKI</title>
</svelte:head>

<div>
    <SettingsHeader>{$_('plugin_store')}</SettingsHeader>

    <div class="plugin-store">
        <p class="plugin-store__lead">{$_('plugin_store_lead')}</p>

        <div class="plugin-store__controls">
            <div class="plugin-store__search">
                <Search size={16} color="var(--text-color-3)"></Search>
                <input
                    class="input-text plugin-store__input"
                    type="search"
                    data-testid="plugin-store-search"
                    placeholder={$_('plugin_store_search_placeholder')}
                    bind:value={query}
                    onkeydown={(e) => { if (e.key === 'Enter') load(); }}
                >
            </div>

            <div class="plugin-store__filters">
                <div class="select">
                    <select class="select__input" bind:value={sort} onchange={load} disabled={Boolean(query.trim())}>
                        <option value="popular">{$_('plugin_store_sort_popular')}</option>
                        <option value="recent">{$_('plugin_store_sort_recent')}</option>
                    </select>
                </div>

                <div class="input-toggle">
                    <input class="input-toggle__input" type="checkbox" id="plugin-store-verified" bind:checked={verifiedOnly} onchange={load}>
                    <label class="input-toggle__label" for="plugin-store-verified"></label>
                </div>
                <label class="plugin-store__verified-text" for="plugin-store-verified">{$_('plugin_store_verified_only')}</label>
            </div>
        </div>

        {#if loading}
            <p class="plugin-store__status">{$_('plugin_store_loading')}</p>
        {:else if loadError}
            <p class="plugin-store__status plugin-store__status--error" data-testid="plugin-store-error">
                <TriangleAlert size={15}></TriangleAlert>
                {loadError}
            </p>
        {:else if plugins.length === 0}
            <p class="plugin-store__status" data-testid="plugin-store-empty">{$_('plugin_store_empty')}</p>
        {:else}
            <ul class="plugin-store__list">
                {#each plugins as plugin (plugin.uri)}
                    <PluginCard
                        {plugin}
                        installed={installedIds.has(plugin.id)}
                        busy={busyId === plugin.id}
                        liked={liked[plugin.id] ?? false}
                        {canLike}
                        oninstall={() => install(plugin)}
                        onlike={() => toggleLike(plugin)}
                    ></PluginCard>
                {/each}
            </ul>
        {/if}
    </div>
</div>

{#if pendingInstall}
    <ConfirmModal
        on:ok={confirmInstall}
        on:cancel={() => { pendingInstall = null; }}
        yesText={$_('rice_plugins_install')}
        cancelText={$_('cancel')}
    >
        {@const author = pendingInstall.source.kind === 'at' ? pendingInstall.source.handle ?? pendingInstall.source.did : undefined}
        <div class="plugin-store-confirm">
            <h3>{pendingInstall.manifest.name} <span>v{pendingInstall.manifest.version}</span></h3>

            <p class="plugin-store-confirm__warning">
                <TriangleAlert size={16}></TriangleAlert>
                {author ? $_('rice_plugins_trust_warning_by', { author }) : $_('rice_plugins_trust_warning')}
            </p>

            {#if pendingInstall.svelteVersionMismatch}
                <p class="plugin-store-confirm__warning">
                    <TriangleAlert size={16}></TriangleAlert>
                    {$_('rice_plugins_svelte_mismatch', { plugin: pendingInstall.manifest.svelteVersion, host: HOST_SVELTE_VERSION })}
                </p>
            {/if}
        </div>
    </ConfirmModal>
{/if}

<style lang="postcss">
    .plugin-store {
        padding: 16px;
        max-width: 720px;
        margin: 0 auto;
    }

    .plugin-store__lead {
        font-size: 13px;
        color: var(--text-color-3);
    }

    .plugin-store__controls {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: 16px 0 8px;
    }

    .plugin-store__search {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1 1 240px;
    }

    .plugin-store__input {
        flex: 1;
    }

    .plugin-store__filters {
        display: flex;
        align-items: center;
        gap: 8px;
    }

    .plugin-store__verified-text {
        font-size: 13px;
        color: var(--text-color-2);
        cursor: pointer;
    }

    .plugin-store__status {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 32px 0;
        font-size: 14px;
        color: var(--text-color-3);
    }

    .plugin-store__status--error {
        color: var(--danger-color);
        word-break: break-all;
    }

    .plugin-store__list {
        margin-top: 8px;
    }

    .plugin-store-confirm {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-bottom: 24px;
        max-width: 400px;

        span {
            font-size: 13px;
            font-weight: normal;
            color: var(--text-color-3);
        }
    }

    .plugin-store-confirm__warning {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        font-size: 13px;
        color: var(--danger-color);
    }
</style>
