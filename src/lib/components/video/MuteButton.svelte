<script lang="ts">
    import {Volume1, Volume2, VolumeOff} from "lucide-svelte";
</script>

<media-mute-button class="video-controls-button video-mute-button">
  <VolumeOff size="20" color="#fff" class="video-mute-button--mute" type="mute"></VolumeOff>
  <Volume1 size="20" color="#fff" class="video-mute-button--low" type="volute-low"></Volume1>
  <Volume2 size="20" color="#fff" class="video-mute-button--high" type="volume-high"></Volume2>
</media-mute-button>