<script lang="ts">
    import Ghost from '@lucide/svelte/icons/ghost';
    import {isColumnModalOpen} from '$lib/stores';
    import DeckSlot from "./DeckSlot.svelte";
    import {_} from "tokimeki-i18n";
    import DeckPopupWrap from "./DeckPopupWrap.svelte";
    import TilingDragOverlay from "$lib/components/deck/TilingDragOverlay.svelte";
    import TilingDragGhost from "$lib/components/deck/TilingDragGhost.svelte";
    import {getColumnState} from "$lib/classes/columnState.svelte";
    const columnState = getColumnState();
</script>

<TilingDragOverlay></TilingDragOverlay>
<TilingDragGhost></TilingDragGhost>

<div class="deck-wrap">
  <div class="deck-divider deck-divider--compact"></div>

  {#if columnState.slots.length}
    <div class="deck-box">
      <div class="deck-bg"></div>
      <div class="deck">
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

<style lang="postcss">
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
          width: var(--deck-divider-compact-width, var(--side-width, 64px));
      }

      &--right {
          width: var(--side-right-width, 0px);
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