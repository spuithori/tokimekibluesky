<script lang="ts">
    import { riceState } from '$lib/rice/riceState.svelte';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import type { PluginKnob, RiceKnob } from '$lib/rice/knobs';

    let { knob, disabled = false }: { knob: RiceKnob | PluginKnob; disabled?: boolean } = $props();

    const uid = $props.id();
    const currentRaw = $derived((knob.plugin ? knob.read() : knob.read(riceState.compiled)) ?? knob.fallback);
    const currentPx = $derived(Number.parseFloat(currentRaw) || 0);
    const isOn = $derived(knob.onValue !== undefined && currentRaw === knob.onValue);

    let preview = $state<number | null>(null);

    function commit(value: string) {
        preview = null;
        if (knob.plugin) {
            knob.write(value);
        } else {
            settingsStore.rice.config = knob.write(settingsStore.rice.config ?? '', value);
        }
    }
</script>

{#if knob.kind === 'toggle'}
    <div class="input-toggle">
        <input
            class="input-toggle__input"
            type="checkbox"
            id="knob-{uid}"
            {disabled}
            checked={isOn}
            onchange={(e) => commit(e.currentTarget.checked ? knob.onValue! : knob.offValue!)}
        ><label class="input-toggle__label" for="knob-{uid}"></label>
    </div>
{:else if knob.kind === 'color'}
    <input
        class="rice-knob-color"
        type="color"
        id="knob-{uid}"
        {disabled}
        value={currentRaw}
        onchange={(e) => commit(e.currentTarget.value)}
    >
{:else if knob.kind === 'select'}
    <div class="select select--fullwidth">
        <select class="select__input" id="knob-{uid}" {disabled} value={currentRaw} onchange={(e) => commit(e.currentTarget.value)}>
            {#each knob.selectOptions ?? [] as option (option.value)}
                <option value={option.value}>{option.label}</option>
            {/each}
        </select>
    </div>
{:else if knob.kind === 'text'}
    <input
        class="input-text"
        type="text"
        id="knob-{uid}"
        {disabled}
        value={currentRaw}
        onchange={(e) => commit(e.currentTarget.value)}
    >
{:else if knob.kind === 'number'}
    <div class="column-width-control">
        {#if knob.min !== undefined && knob.max !== undefined}
            <input
                class="column-width-control__range"
                type="range"
                id="knob-{uid}"
                {disabled}
                min={knob.min}
                max={knob.max}
                step={knob.step}
                value={preview ?? currentPx}
                oninput={(e) => { preview = +e.currentTarget.value; }}
                onchange={(e) => commit(String(+e.currentTarget.value))}
            >
        {/if}
        <div class="column-width-control__row">
            <input
                class="column-width-control__number"
                type="number"
                {disabled}
                min={knob.min}
                max={knob.max}
                step={knob.step}
                value={preview ?? currentPx}
                onchange={(e) => commit(String(+e.currentTarget.value))}
            >
        </div>
    </div>
{:else}
    <div class="column-width-control">
        <input
            class="column-width-control__range"
            type="range"
            id="knob-{uid}"
            {disabled}
            min={knob.min}
            max={knob.max}
            step={knob.step}
            value={preview ?? currentPx}
            oninput={(e) => { preview = +e.currentTarget.value; }}
            onchange={(e) => commit(`${+e.currentTarget.value}px`)}
        >
        <div class="column-width-control__row">
            <input
                class="column-width-control__number"
                type="number"
                {disabled}
                min={knob.min}
                max={knob.max}
                step={knob.step}
                value={preview ?? currentPx}
                onchange={(e) => commit(`${+e.currentTarget.value}px`)}
            >
            <span class="column-width-control__unit">px</span>
        </div>
    </div>
{/if}

<style lang="postcss">
    .rice-knob-color {
        width: 50px;
        height: 32px;
        padding: 0;
        border: 1px solid var(--border-color-1);
        border-radius: var(--border-radius-2);
        background: none;
        cursor: pointer;

        &:disabled {
            opacity: .5;
            cursor: default;
        }
    }
</style>
