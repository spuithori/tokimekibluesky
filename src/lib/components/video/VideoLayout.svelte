<script lang="ts">
    import PlayButton from "$lib/components/video/PlayButton.svelte";
    import TimeSlider from "$lib/components/video/TimeSlider.svelte";
    import MuteButton from "$lib/components/video/MuteButton.svelte";
    import VideoSettings from "$lib/components/video/VideoSettings.svelte";
    import FullScreenButton from "$lib/components/video/FullScreenButton.svelte";
    import PiPButton from "$lib/components/video/PiPButton.svelte";
    import VideoTime from "$lib/components/video/VideoTime.svelte";
    import VolumeSlider from "$lib/components/video/VolumeSlider.svelte";
    import {getContext} from "svelte";

    const player: any = getContext('player');
</script>

<div class="video-player-layout">
    <PlayButton />

    <div class="video-player-controls"
         class:video-player-controls--hover-paused={player.isHovering || player.paused}
         class:video-player-controls--hover={player.isHovering}
         class:video-player-controls--paused={player.paused}
    >
        <div class="video-player-controls__bg"></div>

        <TimeSlider />

        <MuteButton />
        <VolumeSlider />

        <VideoTime />

        <VideoSettings />
        {#if player.isPipSupported}
            <PiPButton />
        {/if}
        <FullScreenButton />
    </div>
</div>

<style lang="postcss">
    .video-player-controls {
        position: absolute;
        bottom: 0;
        height: 40px;
        left: 0;
        right: 0;
        display: flex;
        align-items: center;
        gap: 18px;
        z-index: 1;
        padding-left: 16px;
        padding-right: 20px;
        opacity: 0;
        visibility: hidden;
        transition: all .2s ease-in-out;

        @media (max-width: 767px) {
            &--paused {
                opacity: 1;
                visibility: visible;
            }
        }

        @media (min-width: 768px) {
            &--hover-paused {
                opacity: 1;
                visibility: visible;
            }
        }

        &__bg {
            pointer-events: none;
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 68px;
            background-image: linear-gradient(to bottom, transparent 0% , rgba(0, 0, 0, .52) 100%);
            border-radius: 0 0 var(--border-radius-4) var(--border-radius-4);
            z-index: -1;
        }
    }
</style>