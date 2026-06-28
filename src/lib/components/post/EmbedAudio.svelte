<script lang="ts">
  import { IsInViewport } from "runed";
  import VideoPlayer from "$lib/components/video/VideoPlayer.svelte";

  interface Props {
    video: any;
    audio?: { title?: string; artist?: string; durationMs?: number } | null;
    isLocal?: boolean;
  }

  let { video, audio = null, isLocal = false }: Props = $props();
  let el: HTMLElement | undefined = $state();
  const inView = new IsInViewport(() => el, {});
</script>

<div class="timeline-audio-wrap" bind:this={el}>
  {#if inView.current}
    <VideoPlayer
      src={isLocal ? { src: video, type: 'video/object' } : video?.playlist}
      poster={video?.thumbnail}
      variant="audio"
      title={audio?.title || ''}
      artist={audio?.artist || ''}
    ></VideoPlayer>
  {/if}
</div>

<style lang="postcss">
  .timeline-audio-wrap {
      height: 76px;
      margin-top: 16px;
      border-radius: 10px;
      overflow: hidden;
      border: 1px solid var(--border-color-1);
      background-color: var(--bg-color-2);

      @container timeline-item (max-width: 345px) {
          margin-left: calc((var(--avatar-size) + var(--avatar-gap)) * -1);
      }
  }
</style>
