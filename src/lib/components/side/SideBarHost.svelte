<script lang="ts">
    import SideBar from './SideBar.svelte';
    import { riceState } from '$lib/rice/riceState.svelte';

    const riceLeft = $derived(
        riceState.leftBars.length > 0,
    );
</script>

{#if riceLeft}
    <div class="side-bar-host-mobile">
        <SideBar></SideBar>
    </div>
{:else}
    <SideBar></SideBar>
{/if}

<style>
    .side-bar-host-mobile {
        display: contents;
    }

    @media (min-width: 768px) {
        .side-bar-host-mobile {
            display: none;
        }
    }
</style>
