<script lang="ts">
    import {agent, settings, labelDefs, labelerSettings} from '$lib/stores';
    import {AppBskyEmbedImages, AppBskyFeedDefs} from '@atproto/api';
    import MediaTimelineItemModal from './MediaTimelineItemModal.svelte';
    import { goto } from '$app/navigation';
    import {contentLabelling, detectHide, detectWarn} from "$lib/timelineFilter";
    import MediaTimelineThumbnail from "$lib/components/post/MediaTimelineThumbnail.svelte";
    import {modalState} from "$lib/classes/modalState.svelte";

    interface Props {
      _agent?: any;
      data: any;
      isProfile?: boolean;
    }

    let { _agent = $agent, data, isProfile = false }: Props = $props();
    let isOpen = $state(false);

    const moderateData = contentLabelling(data.post, _agent.did(), $settings, $labelDefs, $labelerSettings);
    let isHide: boolean = $state(false);
    let isWarn = detectWarn(moderateData, 'contentList');
    isHide = detectHide(moderateData, 'contentList', isHide, data.post);

    const isReasonRepost = (reason: any): reason is AppBskyFeedDefs.ReasonRepost => {
        return !!(reason as AppBskyFeedDefs.ReasonRepost)?.by;
    }

    function modalToggle() {
        isOpen = isOpen !== true;
        document.body.classList.toggle('scroll-lock', isOpen);

        if (isOpen) {
            goto('#open', {noScroll: true});
        }
    }

    function handleClose() {
        isOpen = false;
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
       class:media-item--warn={isWarn && isWarn.for === 'media'}
  >
    <button onclick={modalToggle} aria-label="画像を拡大する">
      {#if (AppBskyEmbedImages.isView(data.post?.embed))}
        <MediaTimelineThumbnail images={data.post.embed.images}></MediaTimelineThumbnail>
      {:else if (AppBskyEmbedImages.isView(data.post?.embed?.media))}
        <MediaTimelineThumbnail images={data.post.embed.media.images}></MediaTimelineThumbnail>
      {/if}

      {#if (isReasonRepost(data.reason))}
        <div class="media-item__is-repost">
          <svg xmlns="http://www.w3.org/2000/svg" width="65.627" height="40.176" viewBox="0 0 65.627 40.176">
            <path id="retweet" d="M42.418,43.116a1.089,1.089,0,0,1-1.06,1.06H9.544c-1.226,0-1.06-1.292-1.06-2.121V22.967H2.121A2.135,2.135,0,0,1,0,20.846a2.028,2.028,0,0,1,.5-1.36L11.1,6.761a2.174,2.174,0,0,1,3.249,0l10.6,12.725a2.025,2.025,0,0,1,.5,1.36,2.135,2.135,0,0,1-2.121,2.121H16.967V35.693H36.055a1.134,1.134,0,0,1,.829.365l5.3,6.363A1.335,1.335,0,0,1,42.418,43.116ZM63.627,29.33a2.028,2.028,0,0,1-.5,1.36l-10.6,12.725a2.114,2.114,0,0,1-3.249,0l-10.6-12.725a2.025,2.025,0,0,1-.5-1.36A2.135,2.135,0,0,1,40.3,27.209H46.66V14.484H27.572a1.057,1.057,0,0,1-.829-.4l-5.3-6.363a1.136,1.136,0,0,1-.231-.664A1.089,1.089,0,0,1,22.269,6H54.083c1.226,0,1.06,1.292,1.06,2.121V27.209h6.363A2.135,2.135,0,0,1,63.627,29.33Z" transform="translate(1 -5)" fill="#ffffff" stroke="var(--primary-color)" stroke-width="2"/>
          </svg>
        </div>
      {/if}
    </button>
  </div>

  {#if (isOpen)}
    <MediaTimelineItemModal {data} close={handleClose} {_agent}></MediaTimelineItemModal>
  {/if}
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

          svg {
              width: 100%;
              height: auto;
          }

          @media (max-width: 767px) {
              right: 10px;
              bottom: 10px;
          }
      }

      &--warn {
          &::before {
              content: '';
              display: block;
              position: absolute;
              left: 0;
              top: 0;
              bottom: 0;
              right: 0;
              background-color: rgba(0, 0, 0, .8);
              backdrop-filter: blur(10px);
              z-index: 10;
              pointer-events: none;
          }
      }
  }
</style>