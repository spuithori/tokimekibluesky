<script lang="ts">
    import 'vidstack/bundle';
    import { LocalMediaStorage } from 'vidstack';
    import VideoLayout from '$lib/components/video/VideoLayout.svelte';
    import Hls from 'hls.js';
    let player = $state();

    let { src, poster } = $props();

    const hls = new Hls({
        maxMaxBufferLength: 10,
    })

    $effect.pre(() => {
        if (player) {
            try {
                player.storage = new CustomLocalMediaStorage();
            } catch (e) {
                console.error(e);
            }
        }
    })

    class CustomLocalMediaStorage extends LocalMediaStorage {
        async getTime() {
            return null
        }

        async setTime() {}
    }
</script>

<media-player
    class="video-player"
    src={src}
    crossOrigin
    playsInline
    bind:this={player}
>
  <media-provider class="video-player__provider">
    <media-poster class="video-player__poster" src={poster}></media-poster>
  </media-provider>

  <media-gesture class="video-gesture" event="click" action="toggle:paused"></media-gesture>
  <media-gesture class="video-gesture" event="dblclick" action="toggle:fullscreen"></media-gesture>

  <VideoLayout></VideoLayout>
</media-player>
