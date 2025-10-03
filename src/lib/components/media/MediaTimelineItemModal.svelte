<script lang="ts">
    import {settings, labelerSettings} from '$lib/stores';
    import { fly } from 'svelte/transition';
    import TimelineItem from "../../../routes/(app)/TimelineItem.svelte";
    import { beforeNavigate } from "$app/navigation";
    import { afterNavigate } from "$app/navigation";
    import {AppBskyEmbedImages} from "@atproto/api";
    import MediaTimelineSlider from "$lib/components/media/MediaTimelineSlider.svelte";
    import {modalState} from "$lib/classes/modalState.svelte";
    import {ChevronLeft, ChevronRight, X} from "lucide-svelte";
    import {contentLabelling, detectWarn} from "$lib/timelineFilter";
    import TimelineWarn from "$lib/components/post/TimelineWarn.svelte";
    import {appState} from "$lib/classes/appState.svelte";

    let { _agent, data, close, onprev, onnext } = $props();
    let el = $state();

    const moderateData = contentLabelling(data.post, _agent.did(), $settings, appState.labelDefs.current, $labelerSettings);
    let isWarn = detectWarn(moderateData, 'contentList');

    function modalClose() {
        history.back();
        close();
    }

    function handlePopstate(e) {
        document.body.classList.remove('scroll-lock');
        el.close();
        close();
    }

    function handleKeydown(event) {
        if (event.key === 'Escape') {
            modalClose();
        }

        if (event.key === 'ArrowLeft') {
            onprev();
        }

        if (event.key === 'ArrowRight') {
            onnext();
        }
    }

    beforeNavigate(async () => {
        document.body.classList.remove('scroll-lock');
    });

    afterNavigate((_navigation) => {
        if (_navigation.to?.url.hash !== '#open') {
            close();
        }
    })

    $effect(() => {
      if (el) {
        modalState.isMediaModalOpen = true;
        el.showModal();
      }

      return () => {
        modalState.isMediaModalOpen = false;
      }
    });
</script>

<svelte:window onpopstate={handlePopstate} onkeydown={handleKeydown}></svelte:window>

<dialog class="media-content-wrap" bind:this={el}>
  <button onclick={modalClose} class="media-content-close" aria-label="Close">
    <X size="24" color="#fff"></X>
  </button>

  <button onclick={modalClose} class="media-content-close-bg"></button>

  <div class="media-content" in:fly="{{ y: 0, duration: 250 }}">
    <div class="media-content__image">
      {#if (isWarn && isWarn.for === 'media')}
        <TimelineWarn labels={isWarn.labels} behavior={isWarn.behavior}></TimelineWarn>
      {/if}

      {#if (AppBskyEmbedImages.isView(data.post?.embed))}
        <MediaTimelineSlider images={data.post.embed.images}></MediaTimelineSlider>
      {:else if (AppBskyEmbedImages.isView(data.post?.embed?.media))}
        <MediaTimelineSlider images={data.post.embed.media.images}></MediaTimelineSlider>
      {/if}
    </div>

    <div class="media-content__content">
      <TimelineItem {data} isMedia={true} {_agent}></TimelineItem>
    </div>
  </div>

  <div class="media-content-nav">
    <button class="media-content-nav__item media-content-nav__item--prev" onclick={onprev}>
      <ChevronLeft color="#fff" size="32"></ChevronLeft>
    </button>

    <button class="media-content-nav__item media-content-nav__item--next" onclick={onnext}>
      <ChevronRight color="#fff" size="32"></ChevronRight>
    </button>
  </div>
</dialog>

<style lang="postcss">
    .media-content-wrap {
        border: none;
        background-color: transparent;
        margin: auto;
        padding: 0 40px;

        &::backdrop {
            background-color: rgba(0, 0, 0, .9);
        }

        @media (max-width: 767px) {
            padding: 0;
            margin: 0;
            max-width: none;
            max-height: none;
            width: 100%;
        }
    }

    .media-content-close {
        position: fixed;
        right: 20px;
        top: 15px;
        z-index: 50;
        width: 40px;
        height: 40px;
        display: grid;
        place-content: center;

        @media (max-width: 959px) {
            right: 8px;
            top: 8px;
            background-color: rgba(0, 0, 0, .5);
            border-radius: 50%;
        }
    }

    .media-content-close-bg {
        display: block;
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
    }

    .media-content {
        display: grid;
        grid-template-columns: auto 320px;
        background-color: var(--bg-color-1);
        height: 90vh;
        width: 70vw;
        padding: 32px;
        gap: 32px;
        border-radius: 10px;
        overflow: auto;
        overscroll-behavior: contain;
        position: relative;
        z-index: 2;
        color: var(--text-color-1);

        @media (max-width: 959px) {
            display: block;
            padding: 0;
            border-radius: 0;
            width: 100%;
            height: 100vh;
            gap: 16px;
            overflow-x: hidden;
        }

        &__image {
            height: 100%;
            min-height: 0;
            position: relative;

            @media (max-width: 959px) {
                height: auto;
            }
        }

        &__content {
            @media (max-width: 959px) {
                padding: 16px;
            }
        }
    }

    .media-content-nav {
        &__item {
            position: fixed;
            top: 0;
            bottom: 0;
            margin: auto;
            width: 48px;
            height: 48px;
            display: grid;
            place-content: center;
            z-index: 10;

            @media (max-width: 959px) {
                position: absolute;
                top: 8px;
                bottom: auto;
                width: 40px;
                height: 40px;
                background-color: rgba(0, 0, 0, .5);
                border-radius: 50%;
            }

            &--prev {
                left: 24px;

                @media (max-width: 959px) {
                    left: 8px;
                }
            }

            &--next {
                right: 24px;

                @media (max-width: 959px) {
                    right: auto;
                    left: calc(48px + 8px);
                }
            }
        }
    }
</style>