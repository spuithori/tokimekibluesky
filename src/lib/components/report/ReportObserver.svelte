<script lang="ts">
    import { reportModal } from '$lib/stores';
    import ReportModal from '$lib/components/report/ReportModal.svelte';

    function handleReportClose() {
        $reportModal = {
            open: false,
            data: undefined,
        };
    }
</script>

{#if ($reportModal.open)}
    <ReportModal onclose={handleReportClose}></ReportModal>
{/if}