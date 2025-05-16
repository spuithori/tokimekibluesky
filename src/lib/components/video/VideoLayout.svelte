<script lang="ts">
    import PlayButton from "$lib/components/video/PlayButton.svelte";
    import TimeSlider from "$lib/components/video/TimeSlider.svelte";
    import MuteButton from "$lib/components/video/MuteButton.svelte";
    import VideoSettings from "$lib/components/video/VideoSettings.svelte";
    import FullScreenButton from "$lib/components/video/FullScreenButton.svelte";
    import VideoTime from "$lib/components/video/VideoTime.svelte";
    import VolumeSlider from "$lib/components/video/VolumeSlider.svelte";
</script>

<div class="video-player-layout">
  <PlayButton></PlayButton>
  <TimeSlider></TimeSlider>

  <div class="video-player-controls">
    <div class="video-player-controls__bg"></div>

    <MuteButton></MuteButton>
    <VolumeSlider></VolumeSlider>

    <VideoTime></VideoTime>

    <VideoSettings></VideoSettings>
    <FullScreenButton></FullScreenButton>
  </div>
</div>

