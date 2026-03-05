<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { ReportCategory, ReportReason } from './reportTypes';
    import { BSKY_LABELER_DID } from './reportConstants';
    import { ChevronRight } from 'lucide-svelte';

    let { category, labelerDid, onselect }: {
        category: ReportCategory;
        labelerDid: string;
        onselect: (reason: ReportReason) => void;
    } = $props();

    const filteredReasons = $derived(
        category.reasons.filter(r => !r.bskyLabelerOnly || labelerDid === BSKY_LABELER_DID)
    );
</script>

<div class="report-step">
    <p class="report-step__title">{$_('report_step_reason')}</p>
    <p class="report-step__subtitle">{$_(category.i18nKey)}</p>

    <ul class="report-reason-list">
        {#each filteredReasons as reason}
            <li class="report-reason-list__item">
                <button class="report-reason-list__button" onclick={() => onselect(reason)}>
                    <span class="report-reason-list__name">{$_(reason.i18nKey)}</span>
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
        margin-bottom: 4px;
    }

    .report-step__subtitle {
        font-size: 13px;
        color: var(--text-color-3);
        margin-bottom: 12px;
    }

    .report-reason-list {
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
            justify-content: space-between;
            gap: 8px;
            padding: 12px 4px;
            text-align: left;

            &:hover {
                background-color: var(--bg-color-2);
            }
        }

        &__name {
            font-size: 14px;
            color: var(--text-color-1);
        }
    }
</style>
