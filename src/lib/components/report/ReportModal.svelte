<script lang="ts">
    import { agent, reportModal } from '$lib/stores';
    import { toast } from 'svelte-sonner';
    import { _ } from 'svelte-i18n';
    import Modal from "$lib/components/ui/Modal.svelte";
    import ReportStepCategory from './ReportStepCategory.svelte';
    import ReportStepReason from './ReportStepReason.svelte';
    import ReportStepLabeler from './ReportStepLabeler.svelte';
    import ReportStepSubmit from './ReportStepSubmit.svelte';
    import { BSKY_LABELER_DID, BSKY_LABELER_ONLY_SUBJECT_TYPES } from './reportConstants';
    import { sendReport, getAvailableLabelers } from './reportApi';
    import type { ReportCategory, ReportReason } from './reportTypes';
    import { fly } from 'svelte/transition';

    let { onclose } = $props();

    type Step = 'category' | 'reason' | 'labeler' | 'submit';
    let step: Step = $state('category');
    let direction: 1 | -1 = $state(1);
    let selectedCategory: ReportCategory | undefined = $state(undefined);
    let selectedReason: ReportReason | undefined = $state(undefined);
    let selectedLabelerDid: string = $state(BSKY_LABELER_DID);
    let reasonText = $state('');
    let isSending = $state(false);
    let labelers: any[] = $state([]);
    let labelersLoaded = $state(false);

    if (!$reportModal.data) {
        onclose();
    }

    const isBskyLabelerOnly = $derived(
        $reportModal.data ? BSKY_LABELER_ONLY_SUBJECT_TYPES.includes($reportModal.data.type) : false
    );

    async function loadLabelers() {
        if (labelersLoaded || isBskyLabelerOnly) return;

        try {
            const prefs = await $agent.xrpc.get('app.bsky.actor.getPreferences');
            const labelersPref: any = prefs.preferences.find(
                (p: any) => p.$type === 'app.bsky.actor.defs#labelersPref'
            );
            const subscribedDids: string[] = [BSKY_LABELER_DID];
            if (labelersPref?.labelers) {
                for (const l of labelersPref.labelers) {
                    if (l.did && !subscribedDids.includes(l.did)) {
                        subscribedDids.push(l.did);
                    }
                }
            }

            const views = await getAvailableLabelers($agent, subscribedDids);
            labelers = views.filter((v: any) => v.creator);
        } catch (e) {
            console.error(e);
            labelers = [];
        }
        labelersLoaded = true;
    }

    function handleCategorySelect(category: ReportCategory) {
        selectedCategory = category;
        direction = 1;

        if (category.id === 'other') {
            selectedReason = category.reasons[0];
            goToLabelerOrSubmit();
        } else {
            step = 'reason';
        }
    }

    function handleReasonSelect(reason: ReportReason) {
        selectedReason = reason;
        direction = 1;
        goToLabelerOrSubmit();
    }

    async function goToLabelerOrSubmit() {
        if (isBskyLabelerOnly) {
            selectedLabelerDid = BSKY_LABELER_DID;
            step = 'submit';
            return;
        }

        await loadLabelers();

        if (labelers.length <= 1) {
            selectedLabelerDid = labelers.length === 1 ? labelers[0].creator.did : BSKY_LABELER_DID;
            step = 'submit';
        } else {
            step = 'labeler';
        }
    }

    function handleLabelerSelect(did: string) {
        selectedLabelerDid = did;
        direction = 1;
        step = 'submit';
    }

    function goBack() {
        direction = -1;
        switch (step) {
            case 'reason':
                step = 'category';
                break;
            case 'labeler':
                if (selectedCategory?.id === 'other') {
                    step = 'category';
                } else {
                    step = 'reason';
                }
                break;
            case 'submit':
                if (isBskyLabelerOnly || labelers.length <= 1) {
                    if (selectedCategory?.id === 'other') {
                        step = 'category';
                    } else {
                        step = 'reason';
                    }
                } else {
                    step = 'labeler';
                }
                break;
        }
    }

    const labelerName = $derived(() => {
        if (!selectedLabelerDid) return 'Bluesky';
        const found = labelers.find((l: any) => l.creator.did === selectedLabelerDid);
        return found?.creator?.displayName || found?.creator?.handle || 'Bluesky';
    });

    async function handleSubmit() {
        if (!$reportModal.data || !selectedReason || isSending) return;
        isSending = true;

        try {
            await sendReport($agent, $reportModal.data, selectedReason.reasonType, reasonText, selectedLabelerDid);
            toast.success($_('report_send_success'));
            onclose();
        } catch (e) {
            toast.error('Error: ' + e);
        } finally {
            isSending = false;
        }
    }
</script>

<Modal title={$_('report_title')} size="small" {onclose} onback={step !== 'category' ? goBack : undefined}>
    <div class="report-steps-container">
        {#key step}
            <div
                class="report-step-wrapper"
                in:fly={{ x: direction * 200, duration: 200 }}
                out:fly={{ x: direction * -200, duration: 200 }}
                onoutrostart={(e) => {
                    e.currentTarget.style.position = 'absolute';
                    e.currentTarget.style.top = '0';
                    e.currentTarget.style.width = '100%';
                }}
            >
                {#if step === 'category'}
                    <ReportStepCategory onselect={handleCategorySelect}></ReportStepCategory>
                {:else if step === 'reason' && selectedCategory}
                    <ReportStepReason category={selectedCategory} labelerDid={selectedLabelerDid} onselect={handleReasonSelect}></ReportStepReason>
                {:else if step === 'labeler'}
                    <ReportStepLabeler {labelers} onselect={handleLabelerSelect}></ReportStepLabeler>
                {:else if step === 'submit' && selectedCategory && selectedReason}
                    <ReportStepSubmit
                        category={selectedCategory}
                        reason={selectedReason}
                        labelerName={labelerName()}
                        bind:reasonText={reasonText}
                        {isSending}
                        onsubmit={handleSubmit}
                    ></ReportStepSubmit>
                {/if}
            </div>
        {/key}
    </div>
</Modal>

<style lang="postcss">
    .report-steps-container {
        display: grid;
        overflow: hidden;
        position: relative;
    }

    .report-step-wrapper {
        grid-area: 1 / 1;
    }
</style>
