<script lang="ts">
    import { getContext } from "svelte";
    import { Volume1, Volume2, VolumeOff } from "lucide-svelte";

    const player: any = getContext('player');

    let volumeState = $derived(player.muted ? 'muted' : player.volume > 0.5 ? 'high' : 'low');

    function handleClick() {
        player.toggleMute();
    }
</script>

<button
    class="video-controls-button video-mute-button"
    onclick={handleClick}
    aria-label={player.muted ? 'Unmute' : 'Mute'}
>
    {#if (volumeState === 'muted')}
        <VolumeOff size="20" color="#fff"></VolumeOff>
    {:else if (volumeState === 'low')}
        <Volume1 size="20" color="#fff"></Volume1>
    {:else}
        <Volume2 size="20" color="#fff"></Volume2>
    {/if}
</button>

<style lang="postcss">
    .video-mute-button {
        margin-right: auto;
    }
</style>