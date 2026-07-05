<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { toast } from 'svelte-sonner';
    import Play from '@lucide/svelte/icons/play';
    import SettingsHeader from '$lib/components/settings/SettingsHeader.svelte';
    import RiceConfigEditor from '$lib/components/rice/RiceConfigEditor.svelte';
    import RiceDiagnostics from '$lib/components/rice/RiceDiagnostics.svelte';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { applyRiceSets } from '$lib/rice/apply';

    const errorLines = $derived(
        new Set(riceState.diagnostics.filter((d) => d.severity === 'error').map((d) => d.line)),
    );

    function handleApplySets() {
        const result = applyRiceSets();
        if (result.skipped.length > 0) {
            toast.warning($_('rice_sets_skipped', { paths: result.skipped.join(', ') }));
        } else {
            toast.success($_('rice_sets_applied', { count: result.applied }));
        }
    }
</script>

<svelte:head>
    <title>{$_('settings_rice')} - TOKIMEKI</title>
</svelte:head>

<div>
    <SettingsHeader>
        {$_('settings_rice')}
    </SettingsHeader>

    <div class="settings-wrap">
        <div class="rice-settings">
            <p class="rice-settings__description">{$_('rice_description')}</p>

            <dl class="settings-group">
                <dt class="settings-group__name">
                    {$_('rice_enabled')}
                </dt>

                <dd class="settings-group__content">
                    <div class="input-toggle">
                        <input class="input-toggle__input" type="checkbox" id="riceEnabled" bind:checked={settingsStore.rice.enabled}><label class="input-toggle__label" for="riceEnabled"></label>
                    </div>
                </dd>
            </dl>

            <div class="rice-settings__editor" class:rice-settings__editor--disabled={!settingsStore.rice.enabled}>
                <RiceConfigEditor bind:value={settingsStore.rice.config} {errorLines}></RiceConfigEditor>
            </div>

            <RiceDiagnostics diagnostics={riceState.diagnostics}></RiceDiagnostics>

            {#if riceState.compiled.sets.length > 0}
                <button class="button button--sm" onclick={handleApplySets}>
                    <Play size={16}></Play>
                    {$_('rice_apply_sets')}
                </button>
            {/if}
        </div>
    </div>
</div>

<style>
    .rice-settings {
        display: flex;
        flex-direction: column;
        gap: 12px;
    }

    .rice-settings__description {
        font-size: 14px;
        color: var(--text-color-2);
    }

    .rice-settings__editor {
        height: 50vh;
        min-height: 320px;
    }

    .rice-settings__editor--disabled {
        opacity: 0.5;
    }
</style>
