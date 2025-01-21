<script lang="ts">
  import {settings, labelDefs, labelerSettings} from '$lib/stores';
  import EmbedVideo from "$lib/components/post/EmbedVideo.svelte";
  import VideoTimelineNav from "$lib/components/post/VideoTimelineNav.svelte";
  import {X} from "lucide-svelte";
  import {contentLabelling, detectHide, detectWarn} from "$lib/timelineFilter";

  let { _agent, post, index, current, onclose } = $props();

  const moderateData = contentLabelling(post, _agent.did(), $settings, $labelDefs, $labelerSettings);
  let isHide: boolean = $state(false);
  let isWarn = detectWarn(moderateData, 'contentList');
  isHide = detectHide(moderateData, 'contentList', isHide, post);
</script>

{#if (!isHide)}
  <div class="embla__slide">
    <div class="video-modal-video">
      {#if current.includes(index)}
        <EmbedVideo video={post?.embed} isTok={true}></EmbedVideo>
      {/if}
    </div>

    {#if current.includes(index)}
      <VideoTimelineNav {_agent} {post}>
        <button class="video-modal-close" onclick={onclose}>
          <X color="#fff"></X>
        </button>
      </VideoTimelineNav>
    {/if}
  </div>
{:else}
  <div class="embla__slide embla__slide--hide"></div>
{/if}

<style lang="postcss">
  .video-modal-video {
      background-color: var(--bg-color-1);
      border-radius: var(--border-radius-5);

      @media (max-width: 767px) {
          height: 100%;
          border-radius: 0;
          background-color: #000;
      }
  }

  .video-modal-close {
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      border-radius: 50%;
      background-color: rgba(255, 255, 255, .1);
  }

  .embla__slide {
      height: 100%;
      flex-shrink: 0;
      min-height: 0;
      position: relative;
      display: grid;
      grid-template-columns: calc(100% - 64px) 48px;
      gap: 16px;

      &--hide {
          height: 0;
          visibility: hidden;
      }

      @media (max-width: 767px) {
          display: block;
      }
  }
</style>