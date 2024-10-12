<script lang="ts">
    import {Captions, CaptionsOff} from "lucide-svelte";
</script>

<media-caption-button class="video-controls-button video-caption-button">
  <Captions size="20" color="#fff" class="video-caption-button--off" type="closed-captions-on"></Captions>
  <CaptionsOff size="20" color="#fff" class="video-caption-button--on" type="closed-captions"></CaptionsOff>
</media-caption-button>