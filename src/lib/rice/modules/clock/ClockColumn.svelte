<script lang="ts">
    import Clock from './Clock.svelte';

    interface Props {
        index?: number;
    }

    let {}: Props = $props();
</script>

<div class="rice-clock-column">
    <Clock variant="column"></Clock>
</div>

<style>
    .rice-clock-column {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        min-height: 200px;
    }
</style>
