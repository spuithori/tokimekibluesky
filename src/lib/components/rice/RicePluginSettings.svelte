<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { pluginSettingsRegistry } from '$lib/rice/modules/registries.svelte';
    import { pluginKnobsFromSchema } from '$lib/rice/pluginKnobs';
    import RiceKnobField from '$lib/components/settings/fields/custom/RiceKnobField.svelte';

    let { id }: { id: string } = $props();

    const schema = $derived(pluginSettingsRegistry.get(id));
    const knobs = $derived(schema ? pluginKnobsFromSchema(id, schema) : []);
</script>

{#if knobs.length}
    <details class="rice-plugin-settings" data-testid="rice-plugin-settings-{id}">
        <summary>{$_('rice_plugins_settings')}</summary>

        <div class="rice-plugin-settings__knobs">
            {#each knobs as knob (knob.id)}
                <div class="rice-plugin-settings__knob">
                    <span class="rice-plugin-settings__label">
                        {knob.labelText}
                        {#if knob.description}
                            <span class="rice-plugin-settings__description">{knob.description}</span>
                        {/if}
                    </span>
                    <RiceKnobField {knob}></RiceKnobField>
                </div>
            {/each}
        </div>
    </details>
{/if}

<style>
    .rice-plugin-settings {
        margin-top: 8px;
        font-size: 13px;
    }

    .rice-plugin-settings summary {
        cursor: pointer;
        color: var(--text-color-3);
    }

    .rice-plugin-settings__knobs {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 12px;
    }

    .rice-plugin-settings__knob {
        display: grid;
        grid-template-columns: 140px 1fr;
        align-items: center;
        gap: 12px;
    }

    .rice-plugin-settings__label {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 14px;
        color: var(--text-color-1);
    }

    .rice-plugin-settings__description {
        font-size: 12px;
        color: var(--text-color-3);
    }
</style>
