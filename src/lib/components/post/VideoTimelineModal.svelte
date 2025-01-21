<script lang="ts">
  import emblaCarouselSvelte from 'embla-carousel-svelte';
  import { fly } from 'svelte/transition';
  import { WheelGesturesPlugin } from 'embla-carousel-wheel-gestures';
  import { modalState } from "$lib/classes/modalState.svelte";
  import VideoTimelineSlide from "$lib/components/post/VideoTimelineSlide.svelte";
  import {sideState} from "$lib/classes/sideState.svelte";

  let { feed, index, onclose, onslide, _agent } = $props();
  let emblaApi;
  let el = $state();
  let current = $state([]);

  function logSlidesInView(emblaApi) {
    current = emblaApi.slidesInView();
    onslide(current[0]);
  }

  function onInit(event) {
    emblaApi = event.detail;
    emblaApi.on('slidesInView', logSlidesInView);
  }

  function handlePopstate() {
    onclose();
  }

  $effect(() => {
    if (el) {
      modalState.isVideoModalOpen = true;
      el.showModal();
    }

    return () => {
      modalState.isVideoModalOpen = false;
      sideState.isTokStart = false;
    }
  });
</script>

<svelte:window onpopstate={handlePopstate} />

<dialog class="video-modal" bind:this={el} in:fly="{{ y: 0, duration: 250 }}">
  <div class="video-modal__slide">
    <div
        class="embla"
        use:emblaCarouselSvelte={{options: {
          axis: 'y',
          loop: false,
          forceWheelAxis: 'y',
          dragThreshold: 2,
          startIndex: index,
          inViewThreshold: 0.3,
        }, plugins: [WheelGesturesPlugin()]}}
        onemblaInit={onInit}
    >
      <div class="embla__container">
        {#each feed as data, _index}
          <VideoTimelineSlide {_agent} post={data.post} index={_index} {current} {onclose}></VideoTimelineSlide>
        {/each}
      </div>
    </div>
  </div>
</dialog>

<style lang="postcss">
  .video-modal {
      margin: auto;
      overflow: hidden;
      border: none;
      color: var(--text-color-1);
      background-color: transparent;
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
      position: relative;

      @media (max-width: 767px) {
          margin: 0;
          height: 100dvh;
          max-width: none !important;
          max-height: none !important;
      }

      &::backdrop {
          background-color: rgba(0, 0, 0, 1);
          opacity: var(--modal-transition-opacity);
      }

      &__slide {
          overflow: hidden;
          width: 640px;
          height: 90vh;

          @media (max-width: 767px) {
              width: 100%;
              height: 100%;
          }
      }
  }

  .embla {
      &__container {
          display: flex;
          flex-direction: column;
          height: 90vh;
          gap: 16px;

          @media (max-width: 767px) {
              height: 100dvh;
              gap: 0;
          }
      }
  }
</style>