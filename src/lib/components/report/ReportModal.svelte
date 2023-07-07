<script lang="ts">
    import { agent, reportModal } from '$lib/stores';
    import {createEventDispatcher} from 'svelte';
    import toast from 'svelte-french-toast';
    import { _ } from 'svelte-i18n';
    const dispatch = createEventDispatcher();

    let reason = 'com.atproto.moderation.defs#reasonSpam';
    let reasonText = '';

    if (!$reportModal.data) {
        dispatch('close');
    }

    const reasons = [
        {
            name: $_('report_spam'),
            value: 'com.atproto.moderation.defs#reasonSpam',
            description: $_('report_spam_description'),
        },
        {
            name: $_('report_violation'),
            value: 'com.atproto.moderation.defs#reasonViolation',
            description: $_('report_violation_description'),
        },
        {
            name: $_('report_misleading'),
            value: 'com.atproto.moderation.defs#reasonMisleading',
            description: $_('report_misleading_description'),
        },
        {
            name: $_('report_sexual'),
            value: 'com.atproto.moderation.defs#reasonSexual',
            description: $_('report_sexual_description'),
        },
        {
            name: $_('report_rude'),
            value: 'com.atproto.moderation.defs#reasonRude',
            description: $_('report_rude_description'),
        },
        {
            name: $_('report_other'),
            value: 'com.atproto.moderation.defs#reasonOther',
            description: $_('report_other_description'),
        },
    ]

    async function send () {
        try {
            const createReport = await $agent.agent.api.com.atproto.moderation.createReport({
                reason: reasonText,
                reasonType: reason,
                subject: {
                    $type: "com.atproto.repo.strongRef",
                    uri: $reportModal.data.uri,
                    cid: $reportModal.data.cid,
                },
            })

            toast.success($_('report_send_success'));
            dispatch('close');
        } catch (e) {
            toast.error('Error: ' + e);
        }
    }

    async function cancel () {
        dispatch('close');
    }
</script>

<div class="report-modal">
    <div class="report-modal-contents">
        <h2 class="report-modal-title">{$_('report_title')}</h2>

        <div class="report-modal-group">
            <h3 class="report-modal-group__title">{$_('report_reason')}</h3>
            <p class="report-modal-group__name">{$_('report_reason_description')}</p>

            <div class="form-select">
                <svg xmlns="http://www.w3.org/2000/svg" width="21.814" height="12.321" viewBox="0 0 21.814 12.321">
                    <path id="パス_27" data-name="パス 27" d="M4393.408,794.858l10.2,10.2,10.2-10.2" transform="translate(-4392.701 -794.151)" fill="none" stroke="var(--primary-color)" stroke-width="2"/>
                </svg>

                <select class="form-select__select" bind:value={reason}>
                    {#each reasons as option}
                        <option value="{option.value}">{option.name}</option>
                    {/each}
                </select>
            </div>
        </div>

        <dl class="report-modal-group">
            <dt class="report-modal-group__name">
                <label for="reportName">{$_('report_reason_title')}</label>
            </dt>

            <dd class="report-modal-group__content">
                <textarea id="reportName" cols="30" rows="5" class="report-modal-name__input form-textarea" bind:value={reasonText}></textarea>
            </dd>
        </dl>

        <div class="report-modal-close">
            <button class="button button--sm" on:click={send}>{$_('report_send')}</button>
            <button class="button button--sm button--border button--danger" on:click={cancel}>{$_('cancel')}</button>
        </div>
    </div>

    <button class="modal-background-close" aria-hidden="true" on:click={cancel}></button>
</div>

<style lang="postcss">
    .report-modal {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        display: flex;
        justify-content: center;
        align-items: flex-start;
        z-index: 9999;
        background-color: rgba(0, 0, 0, .5);
        overflow: auto;
        padding: 50px 0;

        @media (max-width: 767px) {
            display: block;
            overscroll-behavior-y: none;
            padding: 20px;
        }
    }

    .report-modal-contents {
        padding: 30px;
        border-radius: 10px;
        background-color: var(--bg-color-1);
        width: 740px;
        max-width: 100%;
        position: relative;
        z-index: 2;

        @media (max-width: 767px) {
            width: 100%;
        }
    }

    .report-modal-title {
        font-weight: 900;
        font-size: 20px;
        line-height: 1.5;
        margin-bottom: 26px;
    }

    .report-modal-group {
        margin-top: 20px;

        @media (max-width: 767px) {
            margin-bottom: 20px;
        }

        &__title {
            color: var(--text-color-1);
            margin-bottom: 10px;
        }

        &__name {
            font-size: 14px;
            margin-bottom: 6px;
        }

        &__content {

        }

        &--name {
            margin-bottom: 30px;

            @media (max-width: 767px) {
                margin-bottom: 20px;
            }
        }

        &__input {
            border: 1px solid var(--border-color-1);
            border-radius: 4px;
            height: 40px;
            padding: 0 10px;
            width: 100%;
            background-color: var(--bg-color-2);
            color: var(--text-color-1);
        }
    }

    .report-modal-close {
        text-align: center;
        margin-top: 20px;
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 20px;
    }
</style>