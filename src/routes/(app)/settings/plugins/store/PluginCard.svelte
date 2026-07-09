<script lang="ts">
    import BadgeCheck from '@lucide/svelte/icons/badge-check';
    import Download from '@lucide/svelte/icons/download';
    import Heart from '@lucide/svelte/icons/heart';
    import Puzzle from '@lucide/svelte/icons/puzzle';
    import { _ } from 'tokimeki-i18n';
    import type { PluginView } from '$lib/rice/plugins/catalog';

    interface Props {
        plugin: PluginView;
        installed: boolean;
        busy: boolean;
        liked: boolean;
        canLike: boolean;
        oninstall: () => void;
        onlike: () => void;
    }

    let { plugin, installed, busy, liked, canLike, oninstall, onlike }: Props = $props();
</script>

<li class="plugin-card" data-testid="plugin-card" data-plugin={plugin.id}>
    <div class="plugin-card__icon">
        {#if plugin.iconUrl}
            <img src={plugin.iconUrl} alt="" width="40" height="40">
        {:else}
            <Puzzle size={22} color="var(--text-color-3)"></Puzzle>
        {/if}
    </div>

    <div class="plugin-card__body">
        <p class="plugin-card__title">
            <span class="plugin-card__name">{plugin.name}</span>
            <span class="plugin-card__version">v{plugin.version}</span>
            {#if plugin.verified}
                <span class="plugin-card__verified" title={$_('plugin_store_verified_hint')} data-testid="plugin-verified">
                    <BadgeCheck size={15}></BadgeCheck>
                </span>
            {/if}
        </p>

        <p class="plugin-card__author">@{plugin.handle}</p>

        {#if plugin.description}
            <p class="plugin-card__description">{plugin.description}</p>
        {/if}

        {#if plugin.tags?.length}
            <p class="plugin-card__tags">
                {#each plugin.tags as tag (tag)}<span class="plugin-card__tag">{tag}</span>{/each}
            </p>
        {/if}
    </div>

    <div class="plugin-card__actions">
        <button
            class="text-button plugin-card__like"
            class:plugin-card__like--on={liked}
            disabled={!canLike || busy}
            data-testid="plugin-like"
            onclick={onlike}
        >
            <Heart size={14} fill={liked ? 'currentColor' : 'none'}></Heart>
            {plugin.likeCount}
        </button>

        {#if installed}
            <span class="plugin-card__installed" data-testid="plugin-installed">{$_('plugin_store_installed')}</span>
        {:else}
            <button class="button button--sm" disabled={busy} data-testid="plugin-install" onclick={oninstall}>
                <Download size={15}></Download>
                {$_('rice_plugins_install')}
            </button>
        {/if}
    </div>
</li>

<style>
    .plugin-card {
        display: grid;
        grid-template-columns: 40px 1fr auto;
        align-items: start;
        gap: 12px;
        padding: 14px 0;
        border-bottom: 1px solid var(--border-color-1);
    }

    .plugin-card__icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        border-radius: var(--border-radius-2);
        background-color: var(--bg-color-2);
        overflow: hidden;
    }

    .plugin-card__title {
        display: flex;
        align-items: center;
        gap: 6px;
    }

    .plugin-card__name {
        font-weight: bold;
        color: var(--text-color-1);
    }

    .plugin-card__version {
        font-size: 12px;
        color: var(--text-color-3);
    }

    .plugin-card__verified {
        display: inline-flex;
        color: var(--primary-color);
    }

    .plugin-card__author,
    .plugin-card__description {
        font-size: 13px;
        color: var(--text-color-3);
    }

    .plugin-card__description {
        margin-top: 4px;
        color: var(--text-color-2);
    }

    .plugin-card__tags {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-top: 6px;
    }

    .plugin-card__tag {
        padding: 1px 8px;
        font-size: 11px;
        color: var(--text-color-3);
        background-color: var(--bg-color-2);
        border-radius: 999px;
    }

    .plugin-card__actions {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
    }

    .plugin-card__like {
        display: inline-flex;
        flex-direction: row;
        align-items: center;
        gap: 5px;
    }

    .plugin-card__like--on {
        color: var(--danger-color);
    }

    .plugin-card__installed {
        font-size: 12px;
        color: var(--text-color-3);
    }
</style>
