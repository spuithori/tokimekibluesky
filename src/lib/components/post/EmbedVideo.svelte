<script lang="ts">
    import VideoPlayer from "$lib/components/video/VideoPlayer.svelte";
    export let video;
    export let isLocal = false;
</script>

<div class="timeline-video-wrap" style="--video-width: {video?.aspectRatio?.width}; --video-height: {video?.aspectRatio?.height}">
  <VideoPlayer
    src={isLocal ? { src: video?.blob, type: 'video/object' } : video?.playlist}
    poster={video?.thumbnail}
  ></VideoPlayer>
</div>

<style lang="postcss">
  .timeline-video-wrap {
      aspect-ratio: var(--video-width, 16) / var(--video-height, 9);
      max-height: 600px;
      margin-top: 16px;

      @container timeline-item (max-width: 345px) {
          margin-left: -50px;
      }
  }
</style>