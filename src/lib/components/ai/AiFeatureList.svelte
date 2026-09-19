<script lang="ts">
    import type { Snippet } from 'svelte';
    import { _ } from 'tokimeki-i18n';
    import ScanText from '@lucide/svelte/icons/scan-text';
    import LayoutGrid from '@lucide/svelte/icons/layout-grid';
    import { AI_FEATURES, type AiFeature, type AiFeatureId } from '$lib/ai-policy';

    interface Props {
        current?: AiFeatureId;
        control?: Snippet<[AiFeature]>;
    }

    let { current = undefined, control = undefined }: Props = $props();

    const ICONS = { altText: ScanText, columnIcon: LayoutGrid };
</script>

<ul class="ai-features">
    {#each AI_FEATURES as feature (feature.id)}
        {@const Icon = ICONS[feature.id]}
        <li class="ai-feature" class:ai-feature--current={feature.id === current}>
            <div class="ai-feature__icon" aria-hidden="true">
                <Icon size="22" color="var(--primary-color)"></Icon>
            </div>

            <h3 class="ai-feature__name">{$_(`ai_feature_${feature.id}`)}</h3>

            {#if control}
                <div class="ai-feature__control">{@render control(feature)}</div>
            {/if}

            <dl class="ai-feature__facts">
                <dt>{$_('ai_table_data')}</dt>
                <dd>{$_(`ai_feature_${feature.id}_data`)}</dd>
                <dt>{$_('ai_table_trigger')}</dt>
                <dd>{$_(`ai_trigger_${feature.trigger}`)}</dd>
            </dl>
        </li>
    {/each}
</ul>

<style lang="postcss">
    .ai-features {
        display: grid;
        gap: 8px;
        list-style: none;
        text-align: left;
    }

    .ai-feature {
        container-type: inline-size;
        display: grid;
        grid-template-columns: 40px 1fr auto;
        grid-template-areas:
            "icon name control"
            "icon facts facts";
        gap: 4px 14px;
        align-items: center;
        padding: 16px;
        border: 1px solid var(--border-color-2);
        border-radius: var(--border-radius-2);
        background-color: var(--bg-color-2);

        &--current {
            border-color: var(--primary-color);
        }

        &__icon {
            grid-area: icon;
            align-self: start;
            display: grid;
            place-content: center;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background-color: color-mix(in srgb, var(--primary-color) 12%, transparent);
        }

        &__name {
            grid-area: name;
            min-height: 40px;
            display: flex;
            align-items: center;
            font-size: 15px;
            font-weight: bold;
            line-height: 1.5;
            color: var(--text-color-1);
        }

        &__facts {
            grid-area: facts;
            display: grid;
            grid-template-columns: max-content 1fr;
            gap: 4px 12px;
            font-size: 13px;
            line-height: 1.6;

            dt {
                color: var(--text-color-3);
            }

            dd {
                color: var(--text-color-1);
            }

            @container (max-width: 520px) {
                grid-template-columns: 1fr;
                gap: 0;

                dt {
                    margin-top: 6px;
                    font-size: 11px;
                }
            }
        }

        &__control {
            grid-area: control;
        }
    }
</style>
