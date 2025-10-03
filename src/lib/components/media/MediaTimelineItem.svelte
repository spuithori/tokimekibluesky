<script lang="ts">
    import {settings, labelerSettings} from '$lib/stores';
    import {AppBskyEmbedImages, AppBskyFeedDefs} from '@atproto/api';
    import MediaTimelineItemModal from './MediaTimelineItemModal.svelte';
    import { goto } from '$app/navigation';
    import {contentLabelling, detectHide, detectWarn} from "$lib/timelineFilter";
    import MediaTimelineThumbnail from "$lib/components/media/MediaTimelineThumbnail.svelte";
    import {modalState} from "$lib/classes/modalState.svelte";
    import {EyeOff, Repeat} from "lucide-svelte";
    import {appState} from "$lib/classes/appState.svelte";

    let { feed, index, data, _agent } = $props();
    let isOpen = $state(false);
    let el = $state();
    let targetIndex = $state(index);
    let targetEl = $state();

    const moderateData = contentLabelling(data.post, _agent.did(), $settings, appState.labelDefs.current, $labelerSettings);
    let isHide: boolean = $state(false);
    let isWarn = detectWarn(moderateData, 'contentList');
    isHide = detectHide(moderateData, 'contentList', isHide, data.post);

    const isReasonRepost = (reason: any): reason is AppBskyFeedDefs.ReasonRepost => {
        return !!(reason as AppBskyFeedDefs.ReasonRepost)?.by;
    }

    function modalToggle() {
        targetIndex = index;
        targetEl = el;
        isOpen = isOpen !== true;
        document.body.classList.toggle('scroll-lock', isOpen);

        if (isOpen) {
            goto('#open', {noScroll: true});
        }
    }

    function handleClose() {
        isOpen = false;
    }

    function handlePrev() {
      if (targetIndex > 0) {
        handleSlideChange('prev');
      }
    }

    function handleNext() {
      if (targetIndex < feed.length - 1) {
        handleSlideChange('next');
      }
    }

    function handleSlideChange(direction: 'prev' | 'next') {
      const currentEl = direction === 'next' ? targetEl.nextElementSibling : targetEl.previousElementSibling;

      if (currentEl) {
        currentEl.scrollIntoView({ block: 'end' });
        targetIndex = currentEl.dataset.index;
        targetEl = currentEl;
      }
    }

    $effect(() => {
      if (!modalState.isMediaModalOpen) {
        isOpen = false;
      }
    })
</script>

{#if (!isHide)}
  <div class="media-item"
       class:media-item--repost={isReasonRepost(data.reason)}
       class:media-item--reply={data.reply && data?.reply?.parent?.author?.did !== _agent.did()}
       bind:this={el}
       data-index={index}
  >
    <button onclick={modalToggle} aria-label="Zoom image.">
      {#if (AppBskyEmbedImages.isView(data.post?.embed))}
        <MediaTimelineThumbnail images={data.post.embed.images}></MediaTimelineThumbnail>
      {:else if (AppBskyEmbedImages.isView(data.post?.embed?.media))}
        <MediaTimelineThumbnail images={data.post.embed.media.images}></MediaTimelineThumbnail>
      {/if}

      {#if (isReasonRepost(data.reason))}
        <div class="media-item__is-repost">
          <Repeat color="#fff"></Repeat>
        </div>
      {/if}

      {#if (isWarn && isWarn.for === 'media')}
        <div class="media-warn">
          <EyeOff color="#fff"></EyeOff>
        </div>
      {/if}
    </button>

    {#key targetIndex}
      {#if (isOpen)}
        <MediaTimelineItemModal data={feed[targetIndex]} close={handleClose} onprev={handlePrev} onnext={handleNext} {_agent}></MediaTimelineItemModal>
      {/if}
    {/key}
  </div>
{/if}

<style lang="postcss">
    .media-item {
      width: 100%;
      height: 100%;
      aspect-ratio: 1 / 1;
      overflow: hidden;
      position: relative;

      button {
          width: 100%;
          height: 100%;
          position: relative;
      }

      &__is-repost {
          position: absolute;
          right: 10px;
          bottom: 10px;
          filter: drop-shadow(0 0 6px rgba(0, 0, 0, .12));
          pointer-events: none;
          width: 30%;
          height: auto;

          @media (max-width: 767px) {
              right: 10px;
              bottom: 10px;
          }
      }
  }

  .media-warn {
      position: absolute;
      inset: 0;
      background-color: rgba(0, 0, 0, .8);
      backdrop-filter: blur(16px);
      display: grid;
      place-content: center;
  }
</style>