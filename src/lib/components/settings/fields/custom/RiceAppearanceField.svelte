<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { appearanceKnobs } from '$lib/rice/knobs';
    import RiceKnobField from './RiceKnobField.svelte';

    const uid = $props.id();
    const knobs = $derived(riceState.layoutStyle === 'single' ? appearanceKnobs.filter((knob) => knob.id !== 'shell-width') : appearanceKnobs);
</script>

<div class="rice-appearance">
    <div class="input-toggle">
        <input
            class="input-toggle__input"
            type="checkbox"
            id="rice-enabled-{uid}"
            bind:checked={settingsStore.rice.enabled}
        ><label class="input-toggle__label" for="rice-enabled-{uid}"></label>
    </div>

    {#if !settingsStore.rice.enabled}
        <p class="settings-group__description">{$_('rice_appearance_disabled_hint')}</p>
    {/if}

    <div class="rice-appearance__knobs">
        {#each knobs as knob (knob.id)}
            <div class="rice-appearance__knob">
                <span class="rice-appearance__label">{$_(knob.label)}</span>
                <RiceKnobField {knob} disabled={!settingsStore.rice.enabled}></RiceKnobField>
            </div>
        {/each}
    </div>

    <p class="settings-group__description">{$_('rice_appearance_description')}</p>
</div>

<style lang="postcss">
    .rice-appearance__knobs {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin-top: 12px;
    }

    .rice-appearance__knob {
        display: grid;
        grid-template-columns: 140px 1fr;
        align-items: center;
        gap: 12px;
    }

    .rice-appearance__label {
        font-size: 14px;
        color: var(--text-color-1);
    }
</style>
