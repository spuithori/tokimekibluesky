<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { riceState } from '$lib/rice/riceState.svelte';
    import { getPresetSourceInText, setPresetSourceInText, setValueInText } from '$lib/rice/config/edit';
    import Columns3 from '@lucide/svelte/icons/columns-3';
    import RectangleVertical from '@lucide/svelte/icons/rectangle-vertical';
    import CheckCircle from '@lucide/svelte/icons/check-circle';

    let { detailed = false, presets = true }: { detailed?: boolean; presets?: boolean } = $props();

    const uid = $props.id();

    const themeOwnsStyle = $derived(!!riceState.compiled.layout?.style);
    const currentStyle = $derived(riceState.layoutStyle);

    const options = [
        { value: 'deck', label: 'layout_decks', description: 'layout_decks_description', icon: Columns3 },
        { value: 'single', label: 'layout_single', description: 'layout_single_description', icon: RectangleVertical },
    ] as const;

    function selectStyle(value: 'deck' | 'single') {
        settingsStore.design.layout = value === 'deck' ? 'decks' : 'default';
        if (settingsStore.rice?.enabled) {
            settingsStore.rice.config = setValueInText(settingsStore.rice.config ?? '', [{ name: 'layout' }], 'style', value);
        }
    }

    const presetOptions = [
        { id: null, label: 'preset_none', description: 'preset_none_description' },
        { id: 'bluesky-shell', label: 'preset_bluesky_shell', description: 'preset_bluesky_shell_description' },
        { id: 'macaron', label: 'preset_macaron', description: 'preset_macaron_description' },
        { id: 'cyberdeck', label: 'preset_cyberdeck', description: 'preset_cyberdeck_description' },
        { id: 'bluesky-menu', label: 'preset_bluesky_menu', description: 'preset_bluesky_menu_description' },
        { id: 'minimal', label: 'preset_minimal', description: 'preset_minimal_description' },
        { id: 'cozy', label: 'preset_cozy', description: 'preset_cozy_description' },
    ] as const;

    const currentPreset = $derived(
        settingsStore.rice?.enabled ? getPresetSourceInText(settingsStore.rice.config ?? '') : null,
    );

    function applyPreset(id: string | null) {
        settingsStore.rice.config = setPresetSourceInText(settingsStore.rice.config ?? '', id);
        if (id !== null) {
            settingsStore.rice.enabled = true;
        }
    }
</script>

{#if themeOwnsStyle}
    <p class="layout-theme-note">{$_('layout_theme_override_note')}</p>
{/if}

{#if detailed}
    <div class="big-radio-group">
        {#each options as option (option.value)}
            <div class="big-radio">
                <input type="radio" checked={currentStyle === option.value} onchange={() => selectStyle(option.value)} id="layout-{uid}-{option.value}" name="layout-{uid}" value={option.value}>
                <label for="layout-{uid}-{option.value}">
                    <span class="big-radio__ui">
                        <span class="big-radio__check">
                            <CheckCircle size={28} color="var(--check-color)" />
                        </span>
                        <span class="big-radio__content">
                            <span class="big-radio__title">{$_(option.label)}</span>
                            <span class="big-radio__description">{$_(option.description)}</span>
                        </span>
                    </span>
                </label>
            </div>
        {/each}
    </div>
{:else}
    <div class="layout-radio-group">
        {#each options as option (option.value)}
            {@const Icon = option.icon}
            <div class="layout-radio" class:layout-radio--current={currentStyle === option.value}>
                <input type="radio" checked={currentStyle === option.value} onchange={() => selectStyle(option.value)} id="layout-{uid}-{option.value}" name="layout-{uid}" value={option.value} />
                <label for="layout-{uid}-{option.value}">
                    <Icon size="22" color="var(--radio-current-color)"></Icon>
                    {$_(option.label)}
                </label>
            </div>
        {/each}
    </div>
{/if}

{#if presets}
    <div class="preset-gallery">
        <p class="preset-gallery__title">{$_('rice_presets')}</p>

        <div class="preset-gallery__grid">
            {#each presetOptions as preset (preset.id ?? 'none')}
                <button
                    type="button"
                    class="preset-card"
                    class:preset-card--current={currentPreset === preset.id}
                    onclick={() => applyPreset(preset.id)}
                >
                    <span class="preset-card__name">{$_(preset.label)}</span>
                    <span class="preset-card__description">{$_(preset.description)}</span>
                </button>
            {/each}
        </div>
    </div>
{/if}

<style lang="postcss">
    .layout-theme-note {
        font-size: 13px;
        color: var(--text-color-3);
        margin-bottom: 8px;
    }

    .preset-gallery {
        margin-top: 12px;
    }

    .preset-gallery__title {
        font-size: 13px;
        font-weight: bold;
        color: var(--text-color-2);
        margin-bottom: 6px;
    }

    .preset-gallery__grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 8px;
    }

    .preset-card {
        display: flex;
        flex-direction: column;
        gap: 2px;
        padding: 10px 12px;
        border: 1px solid var(--border-color-1);
        border-radius: 8px;
        background-color: var(--bg-color-2);
        text-align: left;
        cursor: pointer;

        &--current {
            border-color: var(--primary-color);
            box-shadow: 0 0 0 1px var(--primary-color);
        }
    }

    .preset-card__name {
        font-size: 14px;
        font-weight: bold;
        color: var(--text-color-1);
    }

    .preset-card__description {
        font-size: 12px;
        color: var(--text-color-3);
    }
</style>
