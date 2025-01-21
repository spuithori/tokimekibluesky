<script lang="ts">
  import {agent, settings, labelDefs, labelerSettings} from '$lib/stores';
  import Like from "$lib/components/post/Like.svelte";
  import VideoTimelineModal from "$lib/components/post/VideoTimelineModal.svelte";
  import {modalState} from "$lib/classes/modalState.svelte";
  import {contentLabelling, detectHide, detectWarn} from "$lib/timelineFilter";
  import {sideState} from "$lib/classes/sideState.svelte";
  import {onMount} from "svelte";

  let { _agent = $agent, data, feed, index } = $props();
  let isOpen = $state(false);
  let el = $state();

  const moderateData = contentLabelling(data.post, _agent.did(), $settings, $labelDefs, $labelerSettings);
  let isHide: boolean = $state(false);
  let isWarn = detectWarn(moderateData, 'contentList');
  isHide = detectHide(moderateData, 'contentList', isHide, data.post);

  function handleSlideChange(current) {
    const parent = el.parentElement;
    const currentEl = parent.querySelector(`.video-item[data-index="${current}"]`);

    if (currentEl) {
      currentEl.scrollIntoView({ block: 'end' });
    }
  }

  $effect(() => {
    if (!modalState.isVideoModalOpen) {
      isOpen = false;
    }
  });

  onMount(() => {
    if (sideState.isTokStart && index === 0) {
      isOpen = true;
      sideState.isTokStart = false;
    }
  });
</script>

{#if (!isHide)}
  <div class="video-item" class:video-item--warn={isWarn && isWarn.for === 'media'} data-index={index} bind:this={el}>
    {#if isWarn && isWarn.for === 'media'}
      <div class="video-warn"></div>
    {/if}

    <button class="video-item__toggle" onclick={() => {isOpen = true}} aria-label="Open"></button>

    <div class="video-item__thumbnail">
      <img src={data?.post?.embed?.thumbnail} alt="">
    </div>

    <div class="video-item__meta">
      <div class="video-item__like">
        <Like post={data.post} {_agent}></Like>
      </div>
    </div>
  </div>

  {#if isOpen}
    <VideoTimelineModal {feed} {index} {_agent} onclose={() => {isOpen = false}} onslide={handleSlideChange}></VideoTimelineModal>
  {/if}
{:else}
  <div class="video-hidden" data-index={index}></div>
{/if}

<style lang="postcss">
  .video-item {
      min-width: 0;
      aspect-ratio: 9 / 16;
      position: relative;
      --timeline-reaction-like-icon-color: #fff;
      --text-color-3: #fff;
      text-shadow: 0 1px 4px #333;

      &__thumbnail {
          height: 100%;
          background-color: #000;
          border-radius: var(--border-radius-3);
          overflow: hidden;

          img {
              width: 100%;
              height: 100%;
              object-fit: contain;
          }
      }

      &__meta {
          position: absolute;
          bottom: 8px;
          padding: 0 12px;
      }

      &__toggle {
          position: absolute;
          display: block;
          inset: 0;
          z-index: 1;
      }
  }

  .video-warn {
      position: absolute;
      inset: 0;
      background-color: rgba(0, 0, 0, .8);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
  }

  .video-hidden {
      display: none;
  }
</style>