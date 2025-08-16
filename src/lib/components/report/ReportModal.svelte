<script lang="ts">
    import { agent, reportModal } from '$lib/stores';
    import { toast } from 'svelte-sonner';
    import { m } from "$lib/paraglide/messages.js";
    import Modal from "$lib/components/ui/Modal.svelte";

    let { onclose } = $props();
    let reason = $state('com.atproto.moderation.defs#reasonSpam');
    let reasonText = $state('');

    if (!$reportModal.data) {
        onclose();
    }

    const reasons = [
        {
            name: m.report_spam(),
            value: 'com.atproto.moderation.defs#reasonSpam',
            description: m.report_spam_description(),
        },
        {
            name: m.report_violation(),
            value: 'com.atproto.moderation.defs#reasonViolation',
            description: m.report_violation_description(),
        },
        {
            name: m.report_misleading(),
            value: 'com.atproto.moderation.defs#reasonMisleading',
            description: m.report_misleading_description(),
        },
        {
            name: m.report_sexual(),
            value: 'com.atproto.moderation.defs#reasonSexual',
            description: m.report_sexual_description(),
        },
        {
            name: m.report_rude(),
            value: 'com.atproto.moderation.defs#reasonRude',
            description: m.report_rude_description(),
        },
        {
            name: m.report_other(),
            value: 'com.atproto.moderation.defs#reasonOther',
            description: m.report_other_description(),
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

            toast.success(m.report_send_success());
            onclose();
        } catch (e) {
            toast.error('Error: ' + e);
        }
    }
</script>

<Modal title="{m.report_title()}" size="large" {onclose}>
    <div class="report-modal-group">
        <h3 class="report-modal-group__title">{m.report_reason()}</h3>
        <p class="report-modal-group__name">{m.report_reason_description()}</p>

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
            <label for="reportName">{m.report_reason_title()}</label>
        </dt>

        <dd class="report-modal-group__content">
            <textarea id="reportName" cols="30" rows="5" class="report-modal-name__input form-textarea" bind:value={reasonText}></textarea>
        </dd>
    </dl>

    <div class="report-modal-close">
        <button class="button button--sm" onclick={send}>{m.report_send()}</button>
    </div>
</Modal>

<style lang="postcss">
    .report-modal-group {
        margin-bottom: 16px;

        &__title {
            color: var(--text-color-1);
            margin-bottom: 10px;
        }

        &__name {
            font-size: 14px;
            margin-bottom: 6px;
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