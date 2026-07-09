<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { theme } from '$lib/stores';
    import { defaultColors } from '$lib/defaultColors';
    import { riceState } from '$lib/rice/riceState.svelte';
    import Notice from '$lib/components/ui/Notice.svelte';

    function detectColors(currentTheme: any) {
        if (!currentTheme) {
            return false;
        }
        if (currentTheme.options.colors && Array.isArray(currentTheme.options.colors)) {
            return currentTheme.options.colors;
        }
        return defaultColors;
    }

    const colors = $derived(detectColors($theme));
</script>

{#if $theme ? $theme.options?.colorDisabled : false}
    <Notice text={$_('color_disabled_theme')}></Notice>
{/if}

{#if settingsStore.rice.enabled && riceState.compiled.themeTokens['current-theme-color'] !== undefined}
    <Notice text={$_('rice_overridden_by_config')}></Notice>
{/if}

<ul class="theme-picker theme-picker--{settingsStore.design.theme}">
    {#if colors}
        {#each colors as color (color.id)}
            <li
                class="theme-picker__item"
                class:theme-picker__item--current={settingsStore.design.theme === color.id}
            >
                <button
                    class="theme-picker__button"
                    onclick={() => { settingsStore.design.theme = color.id; }}
                    aria-label={color.id}
                    style:background={color.colorCode}
                ></button>
            </li>
        {/each}
    {/if}
</ul>

<style lang="postcss">
    .theme-picker {
        display: grid;
        grid-template-columns: repeat(6, 50px);
        gap: 6px;
        list-style: none;
        margin-top: 10px;

        &__item {
            aspect-ratio: 1 / 1;
            border-radius: var(--primary-color);

            &--current {
                button {
                    border: 2px solid var(--text-color-1);
                }
            }
        }

        &__button {
            width: 100%;
            height: 100%;
            border-radius: 4px;
            border: 2px solid rgba(0, 0, 0, .1);
        }
    }
</style>
