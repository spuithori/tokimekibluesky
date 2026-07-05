<script lang="ts">
    import { agent } from '$lib/stores';
    import SideMyFeeds from '$lib/components/side/SideMyFeeds.svelte';
    import RiceWidgetLogin from '$lib/components/rice/RiceWidgetLogin.svelte';
</script>

<div class="rice-feeds-widget">
    {#if $agent}
        <SideMyFeeds></SideMyFeeds>
    {:else}
        <RiceWidgetLogin></RiceWidgetLogin>
    {/if}
</div>
