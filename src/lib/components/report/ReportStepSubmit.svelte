<script lang="ts">
    import { _ } from 'svelte-i18n';
    import type { ReportCategory, ReportReason } from './reportTypes';

    let { category, reason, labelerName, reasonText = $bindable(''), isSending, onsubmit }: {
        category: ReportCategory;
        reason: ReportReason;
        labelerName: string;
        reasonText: string;
        isSending: boolean;
        onsubmit: () => void;
    } = $props();

    const isOtherReason = $derived(reason.id.endsWith('_other') || reason.id === 'other');

    const charCount = $derived(reasonText.length);
    const maxChars = 300;
</script>

<div class="report-step">
    <p class="report-step__title">{$_('report_step_submit')}</p>

    <div class="report-submit-info">
        <div class="report-submit-info__row">
            <span class="report-submit-info__label">{$_(category.i18nKey)}</span>
            <span class="report-submit-info__value">{$_(reason.i18nKey)}</span>
        </div>
        <div class="report-submit-info__row">
            <span class="report-submit-info__label">{$_('report_labeler_select')}</span>
            <span class="report-submit-info__value">{labelerName}</span>
        </div>
    </div>

    <div class="report-submit-textarea">
        <textarea
            class="form-textarea"
            rows="4"
            maxlength={maxChars}
            placeholder={$_('report_details_placeholder')}
            bind:value={reasonText}
        ></textarea>
        <span class="report-submit-textarea__count">{charCount}/{maxChars}</span>
    </div>

    <div class="report-submit-actions">
        <button class="button button--sm" onclick={onsubmit} disabled={isSending}>
            {#if isSending}
                {$_('report_sending')}
            {:else}
                {$_('report_submit_button')}
            {/if}
        </button>
    </div>
</div>

<style lang="postcss">
    .report-step__title {
        font-size: 15px;
        font-weight: 600;
        color: var(--text-color-1);
        margin-bottom: 12px;
    }

    .report-submit-info {
        margin-bottom: 16px;
        padding: 12px;
        background-color: var(--bg-color-2);
        border-radius: var(--border-radius-3);

        &__row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 4px 0;

            &:not(:last-child) {
                border-bottom: 1px solid var(--border-color-2);
                padding-bottom: 8px;
                margin-bottom: 8px;
            }
        }

        &__label {
            font-size: 13px;
            color: var(--text-color-3);
        }

        &__value {
            font-size: 13px;
            color: var(--text-color-1);
            font-weight: 500;
        }
    }

    .report-submit-textarea {
        position: relative;
        margin-bottom: 16px;

        textarea {
            width: 100%;
            resize: vertical;
            min-height: 80px;
        }

        &__count {
            position: absolute;
            right: 8px;
            bottom: 8px;
            font-size: 11px;
            color: var(--text-color-3);
        }
    }

    .report-submit-actions {
        text-align: center;
    }
</style>
