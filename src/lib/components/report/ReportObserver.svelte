<script lang="ts">
    import { reportModal } from '$lib/stores';
    import {createEventDispatcher} from 'svelte';
    import ReportModal from '$lib/components/report/ReportModal.svelte';
    const dispatch = createEventDispatcher();

    function handleReportClose(event) {
        $reportModal = {
            open: false,
            data: undefined,
        };
        dispatch('close', event.detail);
    }
</script>

{#if ($reportModal.open)}
    <ReportModal on:close={handleReportClose}></ReportModal>
{/if}