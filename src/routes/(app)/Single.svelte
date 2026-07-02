<script lang="ts">
    import {agent, currentTimeline, settings} from '$lib/stores';
    import {page} from '$app/stores';
    import {clampSingleWidth} from "$lib/deckWidth";
    import {startPointerDrag} from "$lib/pointerDrag";
    import DeckSlot from "./DeckSlot.svelte";
    import {defaultDeckSettings} from "$lib/components/deck/defaultDeckSettings";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {publishState} from "$lib/classes/publishState.svelte";
    import {scrollDirection} from "$lib/scrollDirection";
    import {scrollDirectionState} from "$lib/classes/scrollDirectionState.svelte";
    import {appState} from "$lib/classes/appState.svelte";

    const columnState = getColumnState();

    if (!columnState.slots.length) {
        columnState.add({
            id: self.crypto.randomUUID(),
            algorithm: {
                type: 'default',
                name: 'HOME'
            },
            style: 'default',
            did: $agent.did(),
            handle: $agent.handle(),
            unreadCount: 0,
            settings: defaultDeckSettings,
            data: {
                feed: [],
                cursor: '',
            }
        })
    }

    if (!columnState.slots[$currentTimeline]) {
        currentTimeline.set(0);
    }

    function handleScroll(event) {
      const scroll = scrollDirection(event.currentTarget, 80, (scrollDir) => {
        scrollDirectionState.direction = scrollDir;
      });
    }

    let wrapEl = $state<HTMLElement | undefined>();
    let resizeWidth = $state<number | null>(null);
    let isMobile = $state(false);

    $effect(() => {
        if (typeof window === 'undefined') return;
        const check = () => { isMobile = window.innerWidth <= 767; };
        check();
        window.addEventListener('resize', check);
        return () => window.removeEventListener('resize', check);
    });

    const showWidthBar = $derived(!isMobile);

    function startWidthResize(event: PointerEvent) {
        if (isMobile || !wrapEl) return;
        const startX = event.clientX;
        const startWidth = wrapEl.offsetWidth;
        resizeWidth = startWidth;
        startPointerDrag(
            event,
            (e) => { resizeWidth = clampSingleWidth(startWidth + (e.clientX - startX)); },
            () => {
                if (resizeWidth != null) $settings.design.singleWidth = resizeWidth;
                resizeWidth = null;
            },
        );
    }

    $effect(() => {
        localStorage.setItem('currentTimeline', JSON.stringify($currentTimeline));
    });

    let previousTimelineIndex: number | null = null;
    let shouldRestoreScroll = false;

    $effect.pre(() => {
        const currentIndex = $currentTimeline;

        if (previousTimelineIndex !== null && previousTimelineIndex !== currentIndex) {
            appState.singleColumnScrollPositions.set(previousTimelineIndex, window.scrollY);
            shouldRestoreScroll = true;
        }

        previousTimelineIndex = currentIndex;
    });

    $effect(() => {
        const currentIndex = $currentTimeline;

        if (shouldRestoreScroll) {
            shouldRestoreScroll = false;

            requestAnimationFrame(() => {
                const savedPosition = appState.singleColumnScrollPositions.get(currentIndex);
                if (savedPosition !== undefined) {
                    window.scrollTo(0, savedPosition);
                }
            });
        }
    });
</script>

<svelte:window onscroll={handleScroll}></svelte:window>

<div
  class="single-wrap"
  class:single-wrap--page={$page.url.pathname !== '/'}
  class:single-wrap--bottom={publishState.isBottom}
  style:--single-column-width={resizeWidth != null ? `${resizeWidth}px` : null}
  bind:this={wrapEl}
>
  <div class="single-timeline-wrap">
    {#key $currentTimeline}
      {#if (columnState.slots.length && columnState.slots[$currentTimeline])}
        <DeckSlot index={$currentTimeline}></DeckSlot>
      {/if}
    {/key}
  </div>

  {#if showWidthBar}
    <div
      class="deck-width-bar"
      class:deck-width-bar--active={resizeWidth != null}
      onpointerdown={startWidthResize}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize column width"
    ></div>
  {/if}
</div>

<style lang="postcss">
    .single-wrap {
        position: relative;
        border-left: var(--single-border);
        border-right: var(--single-border);
        min-height: 100vh;
        background-color: var(--single-bg-color, var(--bg-color-1));
        width: var(--single-column-width, var(--single-m-width));
        max-width: 100%;

        @media (max-width: 767px) {
            width: 100vw;
        }

        &--page {
            position: fixed;
            overflow: hidden;
            left: 402px;
            top: 0;
            right: 0;
            margin: auto;
            min-height: 100dvh;

            @media (max-width: 767px) {
                left: 0;
            }
        }

        &--bottom {
            left: 64px;

            @media (max-width: 767px) {
                left: 0;
            }
        }
    }
</style>