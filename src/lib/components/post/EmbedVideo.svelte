<script lang="ts">
  import { IsInViewport } from "runed";
  import VideoPlayer from "$lib/components/video/VideoPlayer.svelte";

  interface Props {
    video: any;
    isLocal?: boolean;
    isTok: boolean;
  }

  let { video, isLocal = false, isTok = false }: Props = $props();
  let el: HTMLElement | undefined = $state();
  const inView = new IsInViewport(() => el, {});
</script>

<div class="timeline-video-wrap" class:timeline-video-wrap--tok={isTok} style="--video-width: {video?.aspectRatio?.width || 16}; --video-height: {video?.aspectRatio?.height || 9}" bind:this={el}>
  {#if inView.current}
    <VideoPlayer
      src={isLocal ? { src: video, type: 'video/object' } : video?.playlist}
      poster={video?.thumbnail}
      {isTok}
    ></VideoPlayer>
  {/if}
</div>