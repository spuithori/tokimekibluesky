<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { updated } from '$app/state';
    import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
    import X from '@lucide/svelte/icons/x';
    import { agents } from '$lib/stores';
    import { bskyStatusState } from '$lib/classes/bskyStatusState.svelte';

    const affectsMyPds = $derived.by(() => {
        if (!bskyStatusState.downMonitors.length) {
            return false;
        }
        const hosts = new Set(bskyStatusState.downMonitors);
        for (const agent of $agents.values()) {
            try {
                if (hosts.has(new URL(agent.service()).hostname)) {
                    return true;
                }
            } catch {}
        }
        return false;
    });

    $effect(() => {
        const interval = setInterval(() => {
            if (!document.hidden) {
                bskyStatusState.check();
            }
        }, 120 * 1000);
        return () => clearInterval(interval);
    });
</script>

<div
    class={['bsky-status-banner', updated.current && 'bsky-status-banner--offset']}
    role="status"
    aria-live="polite"
>
    <TriangleAlert size={20} color="var(--danger-color)" />

    <div class="bsky-status-banner__body">
        <p class="bsky-status-banner__text">
            {affectsMyPds ? $_('bsky_status_pds_down') : $_('bsky_status_incident')}
        </p>

        {#if bskyStatusState.incident?.title}
            <p class="bsky-status-banner__detail">{bskyStatusState.incident.title}</p>
        {/if}
    </div>

    <a
        class="bsky-status-banner__link"
        href="https://status.bsky.app/"
        target="_blank"
        rel="noopener noreferrer"
    >{$_('details')}</a>

    <button
        class="bsky-status-banner__close"
        type="button"
        onclick={() => bskyStatusState.dismiss()}
        aria-label={$_('close')}
    >
        <X size={18} color="var(--text-color-3)" />
    </button>
</div>

<style>
    .bsky-status-banner {
        position: fixed;
        top: calc(env(safe-area-inset-top, 0px) + 12px);
        left: 50%;
        transform: translateX(-50%);
        z-index: 999;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 8px 10px 16px;
        max-width: calc(100vw - 32px);
        background-color: var(--menu-bg-color);
        color: var(--text-color-1);
        border: var(--menu-border);
        border-radius: var(--menu-border-radius);
        box-shadow: var(--menu-box-shadow);
    }

    .bsky-status-banner--offset {
        top: calc(env(safe-area-inset-top, 0px) + 72px);
    }

    .bsky-status-banner__body {
        min-width: 0;
    }

    .bsky-status-banner__text {
        margin: 0;
        font-size: 14px;
        line-height: 1.3;
    }

    .bsky-status-banner__detail {
        margin: 2px 0 0;
        font-size: 12px;
        line-height: 1.3;
        color: var(--text-color-3);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .bsky-status-banner__link {
        flex-shrink: 0;
        padding: 6px 12px;
        font-size: 13px;
        font-weight: 700;
        color: var(--bg-color-1);
        background-color: var(--danger-color);
        border-radius: var(--border-radius-3);
        text-decoration: none;
        white-space: nowrap;
    }

    .bsky-status-banner__close {
        flex-shrink: 0;
        display: grid;
        place-content: center;
        width: 32px;
        height: 32px;
        background-color: transparent;
        border: none;
        cursor: pointer;
    }

    @media (max-width: 767px) {
        .bsky-status-banner__text {
            font-size: 13px;
        }
    }
</style>
