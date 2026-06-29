<script lang="ts">
    import { getContext } from "svelte";
    import PictureInPicture from '@lucide/svelte/icons/picture-in-picture';
    import PictureInPicture2 from '@lucide/svelte/icons/picture-in-picture-2';

    const player: any = getContext('player');
</script>

<button
    class="video-controls-button video-pip-button"
    onclick={() => player.togglePictureInPicture()}
    aria-label={player.isPip ? 'Exit picture in picture' : 'Picture in picture'}
>
    {#if player.isPip}
        <PictureInPicture2 size="20" color="#fff"></PictureInPicture2>
    {:else}
        <PictureInPicture size="20" color="#fff"></PictureInPicture>
    {/if}
</button>
