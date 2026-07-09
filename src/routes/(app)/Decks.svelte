<script lang="ts">
    import Ghost from '@lucide/svelte/icons/ghost';
    import {isColumnModalOpen, settings} from '$lib/stores';
    import {page} from '$app/stores';
    import DeckSlot from "./DeckSlot.svelte";
    import {_} from "tokimeki-i18n";
    import DeckPopupWrap from "./DeckPopupWrap.svelte";
    import TilingDragOverlay from "$lib/components/deck/TilingDragOverlay.svelte";
    import TilingDragGhost from "$lib/components/deck/TilingDragGhost.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    import {riceState} from "$lib/rice/riceState.svelte";
    import {firstLeafId} from "$lib/classes/deckLayout";
    import {windowScrollRegistry} from "$lib/scroll/windowScrollRegistry";
    import {clampSingleWidth} from "$lib/deckWidth";
    import {shellResizeState} from "$lib/classes/shellResizeState.svelte";
    import {startPointerDrag} from "$lib/pointerDrag";
    import {settingsStore} from "$lib/settings/settings.svelte";
    import {setValueInText} from "$lib/rice/config/edit";
    import {scrollDirection} from "$lib/scrollDirection";
    import {scrollDirectionState} from "$lib/classes/scrollDirectionState.svelte";
    import {SvelteSet} from "svelte/reactivity";
    import {MediaQuery} from "svelte/reactivity";
    import {tick} from "svelte";
    import {watch} from "runed";
    import {publishState} from "$lib/classes/publishState.svelte";
    import {windowScrollHost} from "$lib/scroll/scrollHost";
    import PublishForm from "$lib/components/publish/PublishForm.svelte";

    const columnState = getColumnState();
    const isMobileQuery = new MediaQuery('(max-width: 767px)');
    const isSingle = $derived(riceState.layoutStyle === 'single');
    const isSubPage = $derived(($page.route.id?.startsWith('/(app)') ?? false) && $page.route.id !== '/(app)');

    const activeSlot = $derived(columnState.activeSlot);
    const activeLeafId = $derived(activeSlot ? firstLeafId(activeSlot.layout) : null);

    const visitedSlotIds = new SvelteSet<string>();
    $effect(() => {
        if (isSingle && activeSlot) {
            visitedSlotIds.add(activeSlot.id);
        }
    });

    let previousLeafId: string | null = null;
    let shouldRestoreScroll = false;

    $effect.pre(() => {
        if (!isSingle) return;
        const currentId = activeLeafId;

        if (previousLeafId !== null && previousLeafId !== currentId) {
            windowScrollRegistry.save(previousLeafId);
            shouldRestoreScroll = true;
        }

        previousLeafId = currentId;
    });

    $effect(() => {
        if (!isSingle) return;
        const currentId = activeLeafId;

        if (shouldRestoreScroll) {
            shouldRestoreScroll = false;

            if (currentId !== null) {
                windowScrollRegistry.restoreAfterFrame(currentId, 0);
            }
        }
    });

    function handleSingleScroll(event: Event) {
        if (!isSingle || !isMobileQuery.current) return;
        scrollDirection(event.currentTarget as any, 80, (scrollDir: string) => {
            scrollDirectionState.direction = scrollDir as any;
        });
    }

    let wrapEl = $state<HTMLElement | undefined>();

    let inlineFormEl = $state<{ focusEditor: (position?: any) => void } | undefined>();
    const showInlineComposer = $derived(isSingle && riceState.layoutComposer === 'top' && !isMobileQuery.current);

    watch(() => publishState.focusTick, (focusTick) => {
        if (!focusTick || !showInlineComposer) return;
        tick().then(() => {
            inlineFormEl?.focusEditor(undefined, { scrollIntoView: false });
            windowScrollHost().scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    function startWidthResize(event: PointerEvent) {
        if (isMobileQuery.current || !wrapEl) return;
        const startX = event.clientX;
        const startWidth = wrapEl.offsetWidth;
        shellResizeState.singlePreviewWidth = startWidth;
        startPointerDrag(
            event,
            (e) => { shellResizeState.singlePreviewWidth = clampSingleWidth(startWidth + (e.clientX - startX)); },
            () => {
                const committed = shellResizeState.singlePreviewWidth;
                if (committed != null) {
                    if (settingsStore.rice?.enabled) {
                        settingsStore.rice.config = setValueInText(settingsStore.rice.config ?? '', [{ name: 'theme' }, { name: 'tokens' }], 'single-m-width', `${committed}px`);
                    } else {
                        $settings.design.singleWidth = committed;
                    }
                }
                shellResizeState.singlePreviewWidth = null;
            },
        );
    }
</script>

<svelte:window onscroll={handleSingleScroll}></svelte:window>

{#if isSingle}
  <div
    class="deck-single"
    class:deck-single--page={isSubPage}
    bind:this={wrapEl}
  >
    {#if showInlineComposer}
      <div class="deck-single__composer">
        <PublishForm bind:this={inlineFormEl} variant="inline"></PublishForm>
      </div>
    {/if}

    {#if columnState.slots.length}
      {#each columnState.slots as slot, index (slot.id)}
        {#if visitedSlotIds.has(slot.id)}
          <div class="deck-single__pane" class:deck-single__pane--inactive={index !== columnState.activeSlotIndex}>
            <DeckSlot {index}></DeckSlot>
          </div>
        {/if}
      {/each}
    {:else}
      <div class="deck-empty">
        <div class="deck-empty__icon">
          <Ghost size={64} color="var(--text-color-3)" />
        </div>

        <h2 class="deck-empty__title">{$_('decks_empty_title')}</h2>
        <p class="deck-empty__text">{$_('decks_empty_text')}</p>
        <button class="button" onclick={() => {$isColumnModalOpen = true}}>{$_('feed_quick_add')}</button>
      </div>
    {/if}

    {#if !isMobileQuery.current}
      <div
        class="deck-width-bar"
        class:deck-width-bar--active={shellResizeState.singlePreviewWidth != null}
        onpointerdown={startWidthResize}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize column width"
      ></div>
    {/if}
  </div>
{:else}
  <TilingDragOverlay></TilingDragOverlay>
  <TilingDragGhost></TilingDragGhost>

  <div class="deck-wrap">
    <div class="deck-divider deck-divider--compact"></div>

    {#if columnState.slots.length}
      <div class="deck-box">
        <div class="deck-bg"></div>
        <div class="deck" class:deck--tile={riceState.layoutMode === 'tile'}>
          {#each columnState.slots as slot, index (slot.id)}
            {@const col = columnState.getSlotColumn(index)}
            {#if !col?.settings?.isPopup}
              <DeckSlot {index}></DeckSlot>
            {:else}
              <DeckPopupWrap {index}></DeckPopupWrap>
            {/if}
          {/each}
        </div>
      </div>
    {:else}
      <div class="deck-empty">
        <div class="deck-empty__icon">
          <Ghost size={64} color="var(--text-color-3)" />
        </div>

        <h2 class="deck-empty__title">{$_('decks_empty_title')}</h2>
        <p class="deck-empty__text">{$_('decks_empty_text')}</p>
        <button class="button" onclick={() => {$isColumnModalOpen = true}}>{$_('feed_quick_add')}</button>
      </div>
    {/if}

    <div class="deck-divider deck-divider--right"></div>
  </div>
{/if}

<style lang="postcss">
  .deck-single {
      position: relative;
      border-left: var(--single-border);
      border-right: var(--single-border);
      min-height: calc(100vh - var(--rice-statusbar-top-height, 0px) - var(--rice-statusbar-bottom-height, 0px));
      background-color: var(--single-bg-color, var(--bg-color-1));
      width: var(--single-column-width, var(--single-m-width));
      max-width: 100%;

      @media (max-width: 767px) {
          width: 100vw;
      }

      &--page {
          position: fixed;
          overflow: hidden;
          left: calc(var(--shell-inset, 0px) + var(--side-width, 64px));
          top: 0;
          right: calc(var(--shell-inset, 0px) + var(--side-right-width, 0px));
          margin: auto var(--single-align-mr, auto) auto var(--single-align-ml, auto);
          min-height: 100dvh;

          @media (max-width: 767px) {
              left: 0;
              right: 0;
          }
      }
  }

  .deck-single__pane--inactive {
      display: none;
  }

  .deck-wrap {
      display: flex;
  }

  .deck-divider {
      width: var(--deck-divider-width);
      flex-shrink: 0;

      @media (max-width: 767px) {
          display: none;
      }

      &--compact {
          width: calc(var(--shell-inset, 0px) + var(--deck-divider-compact-width, var(--side-width, 64px)));
      }

      &--right {
          width: calc(var(--shell-inset, 0px) + var(--side-right-width, 0px));
      }
  }

  .deck-box {
      display: flex;
      flex: 1;
      min-width: 0;
      position: relative;
      isolation: isolate;
      margin: var(--decks-margin) var(--decks-margin) var(--decks-margin-bottom, var(--decks-margin)) var(--decks-margin-left, 0);
      height: calc(var(--decks-height, calc(100dvh - var(--decks-margin, 0px) * 2)) - var(--rice-statusbar-top-height, 0px) - var(--rice-statusbar-bottom-height, 0px));

      @media (max-width: 767px) {
          height: 100dvh;
          margin: 0;
      }
  }

  .deck-bg {
      position: absolute;
      inset: 0;
      z-index: -1;
      pointer-events: none;
      border-radius: var(--decks-border-radius, 0);
      background-color: var(--decks-bg-color, transparent);
      border: var(--decks-border, none);
      border-left: var(--decks-border-left, 0);
      border-bottom: var(--decks-border-bottom, 0);
      box-shadow: var(--decks-box-shadow, none);

      @media (max-width: 767px) {
          border: none;
          border-radius: 0;
          box-shadow: none;
      }
  }

  .deck {
      display: flex;
      gap: var(--decks-gap);
      justify-content: var(--deck-justify, flex-start);
      overflow-x: auto;
      overflow-y: hidden;
      padding: var(--decks-padding-top, var(--decks-padding)) var(--decks-padding-right, var(--decks-padding)) var(--decks-padding-bottom, var(--decks-padding)) var(--decks-padding-left, var(--decks-padding));
      flex: 1;
      min-width: 0;

      &::-webkit-scrollbar {
          height: 8px;

          @media (max-width: 767px) {
              display: none;
          }
      }

      &::-webkit-scrollbar-thumb {
          background: var(--scroll-bar-color);
      }

      &::-webkit-scrollbar-track {
          background: var(--scroll-bar-bg-color);
      }

      @media (max-width: 767px) {
          scroll-snap-type: x mandatory;
          justify-content: flex-start;
          padding: 0;
      }

      &--tile {
          @media (min-width: 768px) {
              overflow-x: clip;
          }
      }
  }

  .deck-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      flex: 1;
      gap: 10px;
      color: var(--text-color-3);
      height: calc(100dvh - var(--rice-statusbar-top-height, 0px) - var(--rice-statusbar-bottom-height, 0px));

      &__title {
          font-size: 24px;
          letter-spacing: .05em;
      }
  }
</style>
