<script lang="ts">
    import { updated } from '$app/state';
    import { _ } from 'svelte-i18n';
    import { reloadApp } from '$lib/appUpdate';

    let busy = $state(false);

    async function handleClick(): Promise<void> {
        if (busy) return;
        busy = true;
        await reloadApp();
    }
</script>

{#if updated.current}
    <div class="update-banner" role="status" aria-live="polite">
        <p class="update-banner__text">{$_('app_update_available')}</p>
        <button
            class="update-banner__button"
            type="button"
            onclick={handleClick}
            disabled={busy}
        >
            {busy ? $_('app_updating') : $_('app_update_apply')}
        </button>
    </div>
{/if}

<style>
    .update-banner {
        position: fixed;
        top: calc(env(safe-area-inset-top, 0px) + 12px);
        left: 50%;
        transform: translateX(-50%);
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 8px 8px 16px;
        max-width: calc(100vw - 32px);
        background-color: var(--menu-bg-color);
        color: var(--text-color-1);
        border: var(--menu-border);
        border-radius: var(--menu-border-radius);
        box-shadow: var(--menu-box-shadow);
    }

    .update-banner__text {
        margin: 0;
        font-size: 14px;
        line-height: 1.3;
    }

    .update-banner__button {
        flex-shrink: 0;
        padding: 6px 16px;
        font-size: 13px;
        font-weight: 700;
        color: var(--bg-color-1);
        background-color: var(--primary-color);
        border: none;
        border-radius: var(--border-radius-3);
        cursor: pointer;
    }

    .update-banner__button:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    @media (max-width: 767px) {
        .update-banner__text {
            font-size: 13px;
        }
    }
</style>
