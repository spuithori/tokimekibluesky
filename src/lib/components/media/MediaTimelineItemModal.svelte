<script lang="ts">
    import {settings} from '$lib/stores';
    import { setContext } from 'svelte';
    import { fly } from 'svelte/transition';
    import { MediaQuery } from 'svelte/reactivity';
    import { beforeNavigate, afterNavigate } from "$app/navigation";
    import {getViewImages, hasGalleryImages} from "$lib/components/post/embedImages";
    import MediaLightbox from "$lib/components/media/MediaLightbox.svelte";
    import ThreadView from "../../../routes/(app)/profile/[handle]/post/[id]/ThreadView.svelte";
    import BottomSheet from "$lib/components/ui/BottomSheet.svelte";
    import Avatar from "../../../routes/(app)/Avatar.svelte";
    import TimelineText from "$lib/components/post/TimelineText.svelte";
    import ReactionButtons from "$lib/components/post/ReactionButtons.svelte";
    import {modalState} from "$lib/classes/modalState.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import ChevronLeft from '@lucide/svelte/icons/chevron-left';
    import ChevronRight from '@lucide/svelte/icons/chevron-right';
    import {contentLabelling, detectWarn} from "$lib/timelineFilter";
    import TimelineWarn from "$lib/components/post/TimelineWarn.svelte";
    import {appState} from "$lib/classes/appState.svelte";

    let { _agent, data, close, onprev, onnext, hasPrev = true, hasNext = true } = $props();
    let el = $state<HTMLDialogElement>();
    let viewer = $state<any>(null);
    let uiVisible = $state(true);
    let sheetMode = $state<'bar' | 'peek' | 'expanded'>('peek');
    let sheetReservedHeight = $state(0);

    const junkColumnState = getColumnState(true);

    let overrideData = $derived.by((): { post: any } | null => {
        void data;
        return null;
    });
    const current = $derived(overrideData ?? data);

    let imageTarget = $state({ uri: '', index: 0 });
    let imageIndex = $derived.by(() =>
        current.post.uri === imageTarget.uri ? imageTarget.index : 0
    );

    const mobileQuery = new MediaQuery('(max-width: 959px)');
    const isMobile = $derived(mobileQuery.current);

    function hasPostImages(post: any): boolean {
        return hasGalleryImages(post?.embed) || hasGalleryImages(post?.embed?.media);
    }

    function openThreadPost(uri: string, index: number = 0): boolean {
        if (uri === current.post.uri) {
            return true;
        }

        const item = junkColumnState.getFeed(`thread_${rkey}`).find((feedItem: any) => feedItem?.post?.uri === uri);
        if (!item?.post || !hasPostImages(item.post)) {
            return false;
        }

        imageTarget = { uri, index };
        overrideData = { post: item.post };
        return true;
    }

    setContext('mediaViewUri', {
        get uri() {
            return current.post.uri;
        },
        openPost: openThreadPost
    });

    const moderateData = $derived(contentLabelling(current.post, _agent.did(), $settings, appState.labelDefs.current));
    const isWarn = $derived(detectWarn(moderateData, 'contentList'));

    const viewImages = $derived.by(() => {
        if (hasGalleryImages(current.post?.embed)) {
            return getViewImages(current.post.embed);
        }
        if (hasGalleryImages(current.post?.embed?.media)) {
            return getViewImages(current.post.embed.media);
        }
        return [];
    });

    const rkey = $derived(current.post.uri.split('/').slice(-1)[0]);
    const did = $derived(current.post.uri.split('/')[2]);

    function modalClose() {
        history.back();
        close();
    }

    function handleCancel(e: Event) {
        e.preventDefault();
        modalClose();
    }

    function handlePopstate() {
        document.body.classList.remove('scroll-lock');
        el?.close();
        close();
    }

    function navPrev() {
        if (imageIndex > 0) {
            viewer?.prev();
        } else {
            onprev();
        }
    }

    function navNext() {
        if (imageIndex < viewImages.length - 1) {
            viewer?.next();
        } else {
            onnext();
        }
    }

    const prevDisabled = $derived(!hasPrev && imageIndex === 0);
    const nextDisabled = $derived(!hasNext && imageIndex >= viewImages.length - 1);

    function handleKeydown(event: KeyboardEvent) {
        if (event.defaultPrevented) return;

        if (event.key === 'ArrowLeft') {
            navPrev();
        }

        if (event.key === 'ArrowRight') {
            navNext();
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
        modalState.mediaModalEl = el;
        el.showModal();
      }

      return () => {
        modalState.isMediaModalOpen = false;
        modalState.mediaModalEl = null;
      }
    });

</script>

<svelte:window onpopstate={handlePopstate} onkeydown={handleKeydown}></svelte:window>

<dialog class="media-content-wrap" bind:this={el} oncancel={handleCancel}>
  <button onclick={modalClose} class="media-content-close-bg" aria-label="Close"></button>

  {#snippet lightboxArea()}
    {#if (isWarn && isWarn.for === 'media')}
      <TimelineWarn labels={isWarn.labels} behavior={isWarn.behavior}></TimelineWarn>
    {/if}

    {#key current.post.uri}
      <MediaLightbox images={viewImages} bind:index={imageIndex} bind:viewer onuichange={(visible) => uiVisible = visible} onclose={modalClose}></MediaLightbox>
    {/key}

    <div class="media-content-nav" class:media-content-nav--hidden={!uiVisible}>
      <button class="media-content-nav__item media-content-nav__item--prev" onclick={navPrev} disabled={prevDisabled} aria-label="Previous">
        <ChevronLeft color="#fff" size="32"></ChevronLeft>
      </button>

      <button class="media-content-nav__item media-content-nav__item--next" onclick={navNext} disabled={nextDisabled} aria-label="Next">
        <ChevronRight color="#fff" size="32"></ChevronRight>
      </button>
    </div>
  {/snippet}

  {#if isMobile}
    <div class="media-content media-content--mobile" in:fly="{{ y: 0, duration: 250 }}">
      <div class="media-content__image" style:bottom="{sheetReservedHeight}px">
        {@render lightboxArea()}
      </div>

      <BottomSheet bind:mode={sheetMode} onreservedheightchange={(px) => sheetReservedHeight = px}>
        {#snippet peek()}
          <div class="media-sheet-peek">
            <div class="media-sheet-peek__profile">
              <Avatar href="/profile/{ current.post.author.did }" avatar={current.post.author.avatar} profile={current.post.author} handle={current.post.author.handle} {_agent}></Avatar>

              <p class="media-sheet-peek__name">{current.post.author.displayName || current.post.author.handle}</p>
            </div>

            {#if current.post.record?.text}
              <p class="media-sheet-peek__text">
                <TimelineText record={current.post.record} {_agent} handle={current?.post?.author?.handle}></TimelineText>
              </p>
            {/if}

            <ReactionButtons {_agent} post={current.post} reason={current?.reason}></ReactionButtons>
          </div>
        {/snippet}

        <div class="media-content__thread media-content__thread--sheet" data-junk-scroll>
          {#key current.post.uri}
            <ThreadView id={rkey} handle={did} seedFeed={[current]} {_agent}></ThreadView>
          {/key}
        </div>
      </BottomSheet>
    </div>
  {:else}
    <div class="media-content" in:fly="{{ y: 0, duration: 250 }}">
      <div class="media-content__image">
        {@render lightboxArea()}
      </div>

      <div class="media-content__thread" data-junk-scroll>
        {#key current.post.uri}
          <ThreadView id={rkey} handle={did} seedFeed={[current]} {_agent}></ThreadView>
        {/key}
      </div>
    </div>
  {/if}
</dialog>

<style lang="postcss">
    .media-content-wrap {
        border: none;
        background-color: transparent;
        margin: 0;
        padding: 0;
        width: 100vw;
        height: 100dvh;
        max-width: none;
        max-height: none;
        overflow: hidden;

        &::backdrop {
            background-color: rgba(0, 0, 0, .9);
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
        position: relative;
        z-index: 2;
        display: flex;
        gap: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        color: var(--text-color-1);

        &--mobile {
            display: block;
            pointer-events: auto;
        }
    }

    .media-content__image {
        position: relative;
        flex: 1;
        min-width: 0;
        min-height: 0;
        pointer-events: auto;

        .media-content--mobile & {
            position: absolute;
            inset: 0;
            transition: bottom .25s ease;
        }
    }

    .media-content__thread {
        width: 380px;
        flex-shrink: 0;
        margin: 16px;
        pointer-events: auto;
        background-color: var(--bg-color-1);
        border-radius: 12px;
        overflow-y: auto;
        overscroll-behavior: contain;
        scrollbar-color: var(--scroll-bar-color) var(--scroll-bar-bg-color);
        scrollbar-width: thin;

        :global(.deck-row--junk .deck-heading) {
            top: 0;
            border-radius: 12px 12px 0 0;
        }

        &--sheet {
            width: 100%;
            height: 100%;
            margin: 0;
            border-radius: 0;
            background-color: transparent;

            :global(.deck-row--junk .deck-heading) {
                border-radius: 0;
            }
        }
    }

    .media-sheet-peek {
        padding: 0 16px 12px;
        display: flex;
        flex-direction: column;
        gap: 6px;

        &__profile {
            display: grid;
            grid-template-columns: 28px 1fr;
            gap: 8px;
            align-items: center;
        }

        &__name {
            font-weight: bold;
            font-size: 14px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        &__text {
            font-size: 14px;
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
    }

    .media-content-nav {
        transition: opacity .2s ease;

        &--hidden {
            opacity: 0;
            pointer-events: none;
        }

        &__item {
            position: absolute;
            top: 0;
            bottom: 0;
            margin: auto;
            width: 48px;
            height: 48px;
            display: grid;
            place-content: center;
            z-index: 10;
            border-radius: 50%;
            background-color: rgba(0, 0, 0, .35);
            transition: background-color .15s ease, opacity .15s ease;

            &:hover:not(:disabled) {
                background-color: rgba(0, 0, 0, .6);
            }

            &:disabled {
                opacity: .2;
            }

            @media (max-width: 959px) {
                top: 8px;
                bottom: auto;
                width: 40px;
                height: 40px;
                background-color: rgba(0, 0, 0, .5);
            }

            &--prev {
                left: 12px;

                @media (max-width: 959px) {
                    left: 8px;
                }
            }

            &--next {
                right: 12px;

                @media (max-width: 959px) {
                    right: auto;
                    left: calc(48px + 8px);
                }
            }
        }
    }
</style>
