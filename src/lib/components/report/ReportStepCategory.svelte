<script lang="ts">
    import { _ } from 'svelte-i18n';
    import { REPORT_CATEGORIES } from './reportConstants';
    import type { ReportCategory } from './reportTypes';
    import { ChevronRight } from 'lucide-svelte';

    let { onselect }: { onselect: (category: ReportCategory) => void } = $props();
</script>

<div class="report-step">
    <p class="report-step__title">{$_('report_step_category')}</p>

    <ul class="report-category-list">
        {#each REPORT_CATEGORIES as category}
            <li class="report-category-list__item">
                <button class="report-category-list__button" onclick={() => onselect(category)}>
                    <div class="report-category-list__text">
                        <span class="report-category-list__name">{$_(category.i18nKey)}</span>
                        <span class="report-category-list__desc">{$_(category.descriptionKey)}</span>
                    </div>
                    <ChevronRight size="18" color="var(--text-color-3)"></ChevronRight>
                </button>
            </li>
        {/each}
    </ul>
</div>

<style lang="postcss">
    .report-step__title {
        font-size: 15px;
        font-weight: 600;
        color: var(--text-color-1);
        margin-bottom: 12px;
    }

    .report-category-list {
        list-style: none;

        &__item {
            border-bottom: 1px solid var(--border-color-2);

            &:last-child {
                border-bottom: none;
            }
        }

        &__button {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 12px 4px;
            text-align: left;

            &:hover {
                background-color: var(--bg-color-2);
            }
        }

        &__text {
            flex: 1;
            min-width: 0;
        }

        &__name {
            display: block;
            font-size: 14px;
            font-weight: 500;
            color: var(--text-color-1);
        }

        &__desc {
            display: block;
            font-size: 12px;
            color: var(--text-color-3);
            margin-top: 2px;
        }
    }
</style>
