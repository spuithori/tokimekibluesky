<script lang="ts">
    import { agent } from '$lib/stores';
    import SideTopic from '$lib/components/side/SideTopic.svelte';
    import RiceWidgetLogin from '$lib/components/rice/RiceWidgetLogin.svelte';
</script>

<div class="rice-trends-widget">
    {#if $agent}
        <SideTopic></SideTopic>
    {:else}
        <RiceWidgetLogin></RiceWidgetLogin>
    {/if}
</div>
