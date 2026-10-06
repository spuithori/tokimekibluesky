<script lang="ts">
    import { _ } from 'tokimeki-i18n';
    import { settingsStore } from '$lib/settings/settings.svelte';
    import { theme } from '$lib/stores';
    import Notice from '$lib/components/ui/Notice.svelte';

    const variants = $derived($theme?.record.variants ?? []);
</script>

{#if $theme && !variants.length}
    <Notice text={$_('color_disabled_theme')}></Notice>
{/if}

<ul class="theme-picker theme-picker--{settingsStore.design.theme}">
    {#each variants as variant (variant.key)}
        <li
            class="theme-picker__item"
            class:theme-picker__item--current={settingsStore.design.theme === variant.key}
        >
            <button
                class="theme-picker__button"
                onclick={() => { settingsStore.design.theme = variant.key; }}
                aria-label={variant.name}
                style:background={variant.swatch}
            ></button>
        </li>
    {/each}
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
