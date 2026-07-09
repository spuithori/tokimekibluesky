<script lang="ts">
    import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
    import { _ } from 'tokimeki-i18n';
    import { getScopedColumnState } from '$lib/classes/columnState.svelte';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { setValueInText } from '$lib/rice/config/edit';

    interface Props {
        index: number;
        error: unknown;
        reset: () => void;
        pluginId?: string;
    }

    let { index, error, reset, pluginId }: Props = $props();

    const columnState = getScopedColumnState();
    const column = $derived(columnState.getColumn(index));
    const message = $derived(error instanceof Error ? error.message : String(error));

    function disablePlugin() {
        if (!pluginId) return;
        settingsStore.rice.config = setValueInText(settingsStore.rice.config, [{ name: `plugin:${pluginId}` }], 'enable', 'false');
    }
</script>

<div class="module-column-error" data-testid="module-column-error">
    <TriangleAlert size={32} color="var(--danger-color)"></TriangleAlert>
    <p class="module-column-error__name">{column?.algorithm?.name ?? column?.algorithm?.type}</p>
    <h1 class="module-column-error__title">{$_('module_column_error_title')}</h1>
    <p class="module-column-error__text">{$_('module_column_error_text')}</p>

    <div class="module-column-error__actions">
        <button class="button button--sm" onclick={reset}>{$_('module_column_error_reload')}</button>
        {#if pluginId}
            <button class="button button--sm button--border" onclick={disablePlugin}>{$_('module_column_error_disable')}</button>
        {/if}
    </div>

    {#if message}
        <details class="module-column-error__details">
            <summary>{$_('module_column_error_details')}</summary>
            <pre>{message}</pre>
        </details>
    {/if}
</div>

<style>
    .module-column-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 8px;
        height: 100%;
        min-height: 200px;
        padding: 16px;
        text-align: center;
    }

    .module-column-error__name {
        font-weight: bold;
        color: var(--text-color-2);
    }

    .module-column-error__title {
        font-size: 15px;
        font-weight: bold;
        color: var(--text-color-1);
    }

    .module-column-error__text {
        font-size: 13px;
        color: var(--text-color-3);
        max-width: 32em;
    }

    .module-column-error__actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
        margin-top: 4px;
    }

    .module-column-error__details {
        width: 100%;
        max-width: 32em;
        margin-top: 8px;
        font-size: 12px;
        color: var(--text-color-3);
        text-align: left;
    }

    .module-column-error__details summary {
        cursor: pointer;
    }

    .module-column-error__details pre {
        margin-top: 4px;
        padding: 8px;
        overflow-x: auto;
        white-space: pre-wrap;
        word-break: break-word;
        background-color: var(--bg-color-2);
        border-radius: var(--border-radius-2, 6px);
    }
</style>
