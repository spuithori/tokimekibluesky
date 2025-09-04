<script lang="ts">
    let { record } = $props();
</script>

<p class="record">{JSON.stringify(record, null, 2)}</p>

<style lang="postcss">
    .record {
        font-family: var(--code-font);
        margin-bottom: 16px;
        font-size: 13px;
        white-space: pre-wrap;
        padding: 16px;
        background-color: var(--bg-color-2);
        border-radius: var(--border-radius-2);
    }
</style>