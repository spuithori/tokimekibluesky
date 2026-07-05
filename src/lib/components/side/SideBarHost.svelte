<script lang="ts">
    import SideBar from './SideBar.svelte';
    import { riceState } from '$lib/rice/riceState.svelte';

    const riceLeft = $derived(
        riceState.bars.left?.kind === 'rice' && (riceState.bars.left.items?.length ?? 0) > 0,
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
