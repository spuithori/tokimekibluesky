<script lang="ts">
    import { getContext } from "svelte";
    import Maximize from '@lucide/svelte/icons/maximize';
    import Minimize from '@lucide/svelte/icons/minimize';

    const player: any = getContext('player');

    function handleClick() {
        player.toggleFullscreen();
    }
</script>

<button
    class="video-controls-button video-fullscreen-button"
    onclick={handleClick}
    aria-label={player.isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
>
    {#if (player.isFullscreen)}
        <Minimize size="20" color="#fff"></Minimize>
    {:else}
        <Maximize size="20" color="#fff"></Maximize>
    {/if}
</button>

<style lang="postcss">
    .video-fullscreen-button {

    }
</style>