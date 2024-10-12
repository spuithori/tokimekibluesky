<script lang="ts">
    import {Maximize, Minimize} from "lucide-svelte";
</script>

<media-fullscreen-button class="video-controls-button video-fullscreen-button">
  <Maximize size="20" color="#fff" class="video-fullscreen-button--on" type="fullscreen"></Maximize>
  <Minimize size="20" color="#fff" class="video-fullscreen-button--off" type="fullscreen-exit"></Minimize>
</media-fullscreen-button>