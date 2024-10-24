<script lang="ts">
  import { run } from 'svelte/legacy';

    import 'vidstack/bundle';
    import VideoLayout from "$lib/components/video/VideoLayout.svelte";
    let player = $state();

    import { LocalMediaStorage } from 'vidstack';
  let { src, poster } = $props();

    class CustomLocalMediaStorage extends LocalMediaStorage {
        async getTime() {
            return null
        }

        async setTime() {}
    }

    run(() => {
    if (player) {
          try {
              player.storage = new CustomLocalMediaStorage();
          } catch (e) {
              console.error(e);
          }
      }
  });
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
